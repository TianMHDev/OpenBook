// ============================================================================
// STUDENTS MY BOOKS JAVASCRIPT
// ============================================================================

const API_ROOT = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

console.log("🔗 API_ROOT configurado:", API_ROOT);

const ENDPOINT_ASSIGNMENTS = `${API_ROOT}/users/assignments`;
const ENDPOINT_DASHBOARD = `${API_ROOT}/users/dashboard`;

// ---------------- HELPERS ----------------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => s ? s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) : '';

// ---------------- AUTH HELPER ----------------
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No autorizado');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
    throw new Error('No autorizado');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ---------------- STATE MANAGEMENT ----------------
let myBooksState = {
  assignments: [],
  filteredAssignments: [],
  currentFilter: 'all',
  searchTerm: '',
  loading: false
};

// ---------------- INITIALIZATION ----------------
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Inicializando Mis Libros...");
  
  // Cargar datos del usuario
  loadUserInfo();
  
  // Cargar asignaciones
  loadAssignments();
  
  // Configurar eventos
  setupEventListeners();
  
  // Configurar logout
  setupLogout();
  
  console.log("✅ Mis Libros inicializado");
});

// ---------------- USER INFO ----------------
async function loadUserInfo() {
  try {
    const response = await authFetch(ENDPOINT_DASHBOARD);
    
    if (response.success && response.data && response.data.user) {
      const user = response.data.user;
      
      // Actualizar información del usuario en el sidebar
      const userName = document.querySelector('.user-name');
      const userRole = document.querySelector('.user-role');
      const userGrade = document.querySelector('.user-grade');
      
      if (userName) userName.textContent = esc(user.full_name);
      if (userRole) userRole.textContent = 'Estudiante';
      if (userGrade) userGrade.textContent = esc(user.institution_name || '');
      
      console.log("✅ Información del usuario actualizada:", user);
    }
  } catch (error) {
    console.error("❌ Error cargando información del usuario:", error);
  }
}

// ---------------- ASSIGNMENTS LOADING ----------------
async function loadAssignments() {
  console.log("📚 Cargando mis libros...");
  
  myBooksState.loading = true;
  updateLoadingState(true);
  
  try {
    const response = await authFetch(ENDPOINT_ASSIGNMENTS);
    console.log("✅ Asignaciones cargadas:", response);
    
    if (response.success && response.data) {
      myBooksState.assignments = response.data;
      myBooksState.filteredAssignments = [...response.data];
      
      renderAssignments();
    } else {
      console.log("⚠️ Respuesta de asignaciones sin datos válidos");
      myBooksState.assignments = [];
      myBooksState.filteredAssignments = [];
      renderAssignments();
    }
  } catch (error) {
    console.error("❌ Error cargando asignaciones:", error);
    myBooksState.assignments = [];
    myBooksState.filteredAssignments = [];
    renderAssignments();
  } finally {
    myBooksState.loading = false;
    updateLoadingState(false);
  }
}

function updateLoadingState(loading) {
  const booksGrid = document.querySelector('.books-grid');
  const searchInput = document.querySelector('.search-input');
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  if (loading) {
    if (booksGrid) booksGrid.innerHTML = '<div class="loading-message">Cargando mis libros...</div>';
    if (searchInput) searchInput.disabled = true;
    filterTabs.forEach(tab => tab.disabled = true);
  } else {
    if (searchInput) searchInput.disabled = false;
    filterTabs.forEach(tab => tab.disabled = false);
  }
}

// ---------------- RENDERING ----------------
function renderAssignments() {
  console.log("🎨 Renderizando asignaciones...");
  
  const booksGrid = document.querySelector('.books-grid');
  if (!booksGrid) {
    console.log("⚠️ Grid de libros no encontrado");
    return;
  }
  
  if (myBooksState.filteredAssignments.length === 0) {
    booksGrid.innerHTML = `
      <div class="no-results">
        <i class="bi bi-book" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
        <h3>No tienes libros asignados</h3>
        <p>Tu profesor te asignará libros cuando estén disponibles</p>
      </div>
    `;
    return;
  }
  
  booksGrid.innerHTML = myBooksState.filteredAssignments.map((assignment, index) => `
    <div class="catalog-book-card" data-assignment-id="${assignment.assignment_id}">
      <div class="book-cover-section">
        <img src="${esc(assignment.cover_url || '/api/placeholder/160/240')}" alt="${esc(assignment.bookTitle)}" class="book-cover-catalog">
        <div class="book-status-badge ${getStatusClass(assignment.status)}">${getStatusText(assignment.status)}</div>
      </div>
      <div class="book-info-section">
        <h4 class="book-title-catalog">${esc(assignment.bookTitle)}</h4>
        <p class="book-author-catalog">${esc(assignment.author || 'Autor desconocido')}</p>
        <div class="book-meta">
          <span class="book-pages">
            <i class="bi bi-file-text"></i>
            ${assignment.pages || 'N/A'} páginas
          </span>
          <span class="book-assigned-by">
            <i class="bi bi-person"></i>
            ${esc(assignment.teacherName || 'Profesor')}
          </span>
        </div>
        
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">Progreso de lectura</span>
            <span class="progress-percentage">${assignment.progress || 0}%</span>
          </div>
          <div class="progress-bar-catalog">
            <div class="progress-fill" style="width: ${assignment.progress || 0}%;"></div>
          </div>
          <div class="progress-controls">
            <label for="progress-slider-${index}" class="progress-control-label">Actualizar progreso:</label>
            <div class="slider-container">
              <input type="range" id="progress-slider-${index}" class="progress-slider" min="0" max="100" value="${assignment.progress || 0}" onchange="updateProgress(${assignment.assignment_id}, this.value)">
              <span class="slider-value">${assignment.progress || 0}%</span>
            </div>
          </div>
        </div>

        <div class="book-actions">
          <button class="btn-primary btn-read" onclick="startReading(${assignment.book_id}, '${esc(assignment.bookTitle)}')">
            <i class="bi bi-play-circle"></i>
            ${assignment.progress > 0 ? 'Continuar Leyendo' : 'Empezar a Leer'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  console.log("✅ Asignaciones renderizadas");
}

function getStatusClass(status) {
  switch (status) {
    case 'completed': return 'completed';
    case 'in_progress': return 'in-progress';
    case 'pending': return 'pending';
    default: return 'pending';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'completed': return 'Completado';
    case 'in_progress': return 'En Progreso';
    case 'pending': return 'Sin iniciar';
    default: return 'Sin iniciar';
  }
}

// ---------------- SEARCH AND FILTERING ----------------
function performSearch() {
  const searchTerm = myBooksState.searchTerm.toLowerCase().trim();
  
  if (searchTerm === '') {
    myBooksState.filteredAssignments = [...myBooksState.assignments];
  } else {
    myBooksState.filteredAssignments = myBooksState.assignments.filter(assignment => {
      const title = (assignment.bookTitle || '').toLowerCase();
      const author = (assignment.author || '').toLowerCase();
      
      return title.includes(searchTerm) || 
             author.includes(searchTerm);
    });
  }
  
  // Aplicar filtro actual
  applyCurrentFilter();
  
  // Renderizar
  renderAssignments();
}

function applyCurrentFilter() {
  const { currentFilter } = myBooksState;
  
  if (currentFilter === 'all') {
    // No filtrar, mantener búsqueda
    return;
  }
  
  myBooksState.filteredAssignments = myBooksState.filteredAssignments.filter(assignment => {
    switch (currentFilter) {
      case 'pending':
        return assignment.status === 'pending';
      case 'in_progress':
        return assignment.status === 'in_progress';
      case 'completed':
        return assignment.status === 'completed';
      default:
        return true;
    }
  });
}

// ---------------- EVENT LISTENERS ----------------
function setupEventListeners() {
  // Búsqueda
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      myBooksState.searchTerm = e.target.value;
      
      searchTimeout = setTimeout(() => {
        performSearch();
      }, 300);
    });
  }
  
  // Filtros
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Remover clase active de todos los tabs
      filterTabs.forEach(t => t.classList.remove('active'));
      
      // Agregar clase active al tab clickeado
      e.target.classList.add('active');
      
      // Actualizar filtro
      myBooksState.currentFilter = e.target.textContent.toLowerCase().replace(' ', '_');
      
      // Aplicar filtro
      performSearch();
    });
  });
  
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarOpen) {
    sidebarOpen.addEventListener('click', () => {
      sidebar.classList.add('sidebar-open');
    });
  }
  
  if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('sidebar-open');
    });
  }
}

// ---------------- LOGOUT FUNCTIONALITY ----------------
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      console.log("🚪 Cerrando sesión...");
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
  }
}

// ---------------- STUDENT ACTIONS ----------------
async function updateProgress(assignmentId, progress) {
  console.log("📊 Actualizando progreso:", { assignmentId, progress });
  
  try {
    const response = await authFetch(`${API_ROOT}/users/assignments/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        progress: parseInt(progress)
      })
    });
    
    if (response.success) {
      // Actualizar el estado local
      const assignment = myBooksState.assignments.find(a => a.assignment_id === assignmentId);
      if (assignment) {
        assignment.progress = parseInt(progress);
        
        // Actualizar el estado si es necesario
        if (progress >= 100) {
          assignment.status = 'completed';
        } else if (progress > 0) {
          assignment.status = 'in_progress';
        }
        
        // Re-renderizar
        renderAssignments();
      }
      
      console.log("✅ Progreso actualizado correctamente");
    } else {
      alert(response.message || 'Error al actualizar progreso');
    }
  } catch (error) {
    console.error("❌ Error actualizando progreso:", error);
    alert('Error al actualizar progreso: ' + error.message);
  }
}

function startReading(bookId, bookTitle) {
  console.log("📖 Comenzando lectura:", { bookId, bookTitle });
  // TODO: Implementar vista de lectura
  alert(`Vista de lectura próximamente para "${bookTitle}"`);
}

// ---------------- GLOBAL FUNCTIONS ----------------
window.updateProgress = updateProgress;
window.startReading = startReading;
