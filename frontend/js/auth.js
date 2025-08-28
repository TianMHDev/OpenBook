// Función para manejar el inicio de sesión
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEmailElement = document.getElementById('login-email-error');
    const errorPasswordElement = document.getElementById('login-password-error');

    // Limpiar mensajes de error previos
    errorEmailElement.textContent = '';
    errorPasswordElement.textContent = '';

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 400) {
                if (!email) errorEmailElement.textContent = 'El correo es requerido';
                if (!password) errorPasswordElement.textContent = 'La contraseña es requerida';
            } else if (response.status === 401) {
                errorEmailElement.textContent = 'Credenciales incorrectas';
            } else {
                throw new Error(data.mensaje || 'Error en el servidor');
            }
            return;
        }

        // Guardar el token en localStorage
        localStorage.setItem('token', data.token);
        
        // Redireccionar al usuario a la página principal
        window.location.href = '/';

    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar sesión. Por favor, intenta de nuevo más tarde.');
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/frontend/views/login.html';
}

// Función para verificar si el usuario está autenticado
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Función para obtener el token
function getToken() {
    return localStorage.getItem('token');
}

// Función para proteger rutas
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/frontend/views/login.html';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Toggle password visibility
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('login-password');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            const icon = passwordToggle.querySelector('i');
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    }
});
