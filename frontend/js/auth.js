// =====================================================================
// SISTEMA DE AUTENTICACIÓN FRONTEND - VERSIÓN MEJORADA
// =====================================================================
// Este archivo maneja la autenticación desde el lado del cliente.
// IMPORTANTE: Las validaciones aquí son solo para UX (experiencia de usuario).
// Las validaciones de SEGURIDAD reales están en el backend.

// =====================================================================
// CONFIGURACIÓN Y CONSTANTES
// =====================================================================

// URL base de la API - cambiar según el entorno
const API_BASE_URL = 'http://localhost:3000/api/auth';

// Configuración de roles y sus dominios correspondientes
const ROLE_CONFIG = {
    teacher: {
        id: 1,
        domain: '@maestro.edu.co',
        displayName: 'Maestro',
        placeholder: 'ejemplo@maestro.edu.co'
    },
    student: {
        id: 2,
        domain: '@estudiante.edu.co', 
        displayName: 'Estudiante',
        placeholder: 'ejemplo@estudiante.edu.co'
    }
};

// =====================================================================
// FUNCIONES DE AUTENTICACIÓN PRINCIPALES
// =====================================================================

/**
 * Maneja el proceso de inicio de sesión
 * @param {Event} event - Evento del formulario
 */
async function handleLogin(event) {
    event.preventDefault();

    // Obtener elementos del formulario
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEmailElement = document.getElementById('login-email-error');
    const errorPasswordElement = document.getElementById('login-password-error');

    // Limpiar mensajes de error previos
    clearErrorMessages([errorEmailElement, errorPasswordElement]);

    // Validación básica en el cliente (solo para UX)
    if (!email) {
        showFieldError(errorEmailElement, 'El correo es requerido');
        return;
    }
    if (!password) {
        showFieldError(errorPasswordElement, 'La contraseña es requerida');
        return;
    }

    // Mostrar indicador de carga
    showLoadingState('Iniciando sesión...');

    try {
        // Realizar petición al backend
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: email.toLowerCase(), // Normalizar email
                password 
            })
        });

        const data = await response.json();

        // Manejar diferentes tipos de respuesta del servidor
        if (!response.ok) {
            handleLoginError(response.status, data, errorEmailElement, errorPasswordElement);
            return;
        }

        // Login exitoso - guardar datos del usuario
        saveUserSession(data);
        
        // Redireccionar según el rol del usuario
        redirectUserBasedOnRole(data.user.role_id);

    } catch (error) {
        console.error('Error de conexión:', error);
        showGlobalError('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
        hideLoadingState();
    }
}

/**
 * Maneja el proceso de registro de usuarios
 * @param {Event} event - Evento del formulario
 */
async function handleRegister(event) {
    event.preventDefault();

    // Recopilar datos del formulario
    const formData = collectFormData();
    
    // Validar datos básicos en el cliente (solo UX)
    const clientValidation = validateFormDataClient(formData);
    if (!clientValidation.isValid) {
        showValidationErrors(clientValidation.errors);
        return;
    }

    // Mostrar estado de carga
    showLoadingState('Registrando usuario...');

    try {
        // Enviar datos al backend para validación y registro real
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: formData.fullName,
                national_id: formData.nationalId,
                email: formData.email.toLowerCase(),
                password: formData.password,
                role_id: ROLE_CONFIG[formData.role].id,
                institution_id: formData.institutionId,
                institution_name: formData.institutionName
            })
        });

        const data = await response.json();

        if (!response.ok) {
            handleRegistrationError(response.status, data);
            return;
        }

        // Registro exitoso
        showSuccessMessage('¡Registro exitoso! Puedes iniciar sesión ahora.');
        resetRegistrationForm();
        
        // Opcional: redirigir automáticamente al login
        setTimeout(() => {
            window.location.href = '../views/login.html';
        }, 2000);

    } catch (error) {
        console.error('Error de conexión en registro:', error);
        showGlobalError('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
        hideLoadingState();
    }
}

// =====================================================================
// FUNCIONES DE VALIDACIÓN DEL CLIENTE (SOLO PARA UX)
// =====================================================================

/**
 * Valida el formato del email según el rol (validación de UX)
 * NOTA: Esta es solo validación de UX. La validación real está en el backend.
 * @param {string} email - Correo electrónico
 * @param {string} role - Rol del usuario (teacher/student)
 * @returns {boolean} - Es válido el formato
 */
function validateEmailFormatUX(email, role) {
    if (!email || !role || !ROLE_CONFIG[role]) return false;
    
    const emailLowerCase = email.toLowerCase().trim();
    const expectedDomain = ROLE_CONFIG[role].domain;
    
    return emailLowerCase.endsWith(expectedDomain) && 
        emailLowerCase.length > expectedDomain.length;
}

/**
 * Valida los datos del formulario en el cliente (solo para UX)
 * @param {Object} formData - Datos del formulario
 * @returns {Object} - Resultado de la validación
 */
function validateFormDataClient(formData) {
    const errors = {};
    let isValid = true;

    // Validar nombre completo
    if (!formData.fullName || formData.fullName.length < 3) {
        errors.fullName = 'El nombre debe tener al menos 3 caracteres';
        isValid = false;
    }

    // Validar número de identificación (formato básico)
    if (!formData.nationalId || !/^\d{7,12}$/.test(formData.nationalId)) {
        errors.nationalId = 'Número de identificación inválido (7-12 dígitos)';
        isValid = false;
    }

    // Validar email
    if (!formData.email) {
        errors.email = 'El correo electrónico es requerido';
        isValid = false;
    } else if (!validateEmailFormatUX(formData.email, formData.role)) {
        const expectedDomain = ROLE_CONFIG[formData.role]?.domain || '';
        errors.email = `El correo debe terminar en ${expectedDomain}`;
        isValid = false;
    }

    // Validar contraseña (reglas básicas)
    if (!formData.password) {
        errors.password = 'La contraseña es requerida';
        isValid = false;
    } else if (formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
        isValid = false;
    }

    // Validar rol
    if (!formData.role || !ROLE_CONFIG[formData.role]) {
        errors.role = 'Debe seleccionar un tipo de usuario válido';
        isValid = false;
    }

    return { isValid, errors };
}

// =====================================================================
// FUNCIONES DE VALIDACIÓN EN TIEMPO REAL
// =====================================================================

/**
 * Configura la validación en tiempo real del email
 */
function setupRealTimeEmailValidation() {
    const emailInput = document.getElementById('email');
    const roleInputs = document.querySelectorAll('input[name="userType"]');
    const emailError = document.getElementById('email-error');

    if (!emailInput || !emailError) return;

    // Función para validar email cuando cambia
    function validateEmailRealTime() {
        const emailValue = emailInput.value.trim();
        const selectedRole = document.querySelector('input[name="userType"]:checked')?.value;

        if (!selectedRole) {
            showFieldError(emailError, 'Primero selecciona si eres maestro o estudiante');
            return;
        }

        if (!emailValue) {
            clearFieldError(emailError);
            return;
        }

        // Validar formato
        if (validateEmailFormatUX(emailValue, selectedRole)) {
            showFieldSuccess(emailError, '✓ Correo válido');
        } else {
            const config = ROLE_CONFIG[selectedRole];
            showFieldError(emailError, `El correo debe ser el asignado por tu institución`);
        }
    }

    // Actualizar placeholder cuando cambia el rol
    function updateEmailPlaceholder(role) {
        if (ROLE_CONFIG[role]) {
            emailInput.placeholder = ROLE_CONFIG[role].placeholder;
            emailInput.value = ''; // Limpiar campo al cambiar rol
            clearFieldError(emailError);
        }
    }

    // Listeners para cambios de rol
    roleInputs.forEach(radio => {
        radio.addEventListener('change', () => {
            updateEmailPlaceholder(radio.value);
            validateEmailRealTime(); // Revalidar si ya hay texto
        });
    });

    // Listeners para cambios en el email
    emailInput.addEventListener('input', validateEmailRealTime);
    emailInput.addEventListener('blur', validateEmailRealTime);
}

// =====================================================================
// FUNCIONES DE UTILIDAD
// =====================================================================

/**
 * Recopila los datos del formulario de registro
 * @returns {Object} - Datos del formulario
 */
function collectFormData() {
    const institutionSelect = document.getElementById('institution');
    const institutionId = parseInt(institutionSelect.value) || null;
    const institutionName = institutionSelect.options[institutionSelect.selectedIndex]?.text || '';

    return {
        fullName: document.getElementById('fullName')?.value.trim() || '',
        nationalId: document.getElementById('nationalId')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        password: document.getElementById('password')?.value || '',
        role: document.querySelector('input[name="userType"]:checked')?.value || '',
        institutionId: institutionId,
        institutionName: institutionName
    };
}


/**
 * Guarda la sesión del usuario en el almacenamiento local
 * @param {Object} sessionData - Datos de la sesión
 */
function saveUserSession(sessionData) {
    localStorage.setItem('token', sessionData.token);
    localStorage.setItem('userData', JSON.stringify({
        email: sessionData.user.email,
        role_id: sessionData.user.role_id,
        full_name: sessionData.user.full_name,
        user_id: sessionData.user.user_id
    }));
}

/**
 * Redirige al usuario basado en su rol
 * @param {number} roleId - ID del rol del usuario
 */
function redirectUserBasedOnRole(roleId) {
    if (roleId === 1) {
        window.location.href = '../views/teacher-dashboard.html';
    } else if (roleId === 2) {
        window.location.href = '../views/student-dashboard.html';
    } else {
        showGlobalError('Rol de usuario no reconocido');
    }
}

// =====================================================================
// FUNCIONES DE MANEJO DE ERRORES
// =====================================================================

/**
 * Maneja errores específicos del login
 * @param {number} status - Código de estado HTTP
 * @param {Object} data - Datos de respuesta del servidor
 * @param {HTMLElement} emailError - Elemento de error de email
 * @param {HTMLElement} passwordError - Elemento de error de contraseña
 */
function handleLoginError(status, data, emailError, passwordError) {
    switch (status) {
        case 400:
            if (data.mensaje?.includes('Email')) {
                showFieldError(emailError, 'Email requerido');
            }
            if (data.mensaje?.includes('contraseña')) {
                showFieldError(passwordError, 'Contraseña requerida');
            }
            break;
        case 401:
            showFieldError(emailError, 'Credenciales incorrectas');
            break;
        default:
            showGlobalError(data.mensaje || 'Error en el servidor');
    }
}

/**
 * Maneja errores específicos del registro
 * @param {number} status - Código de estado HTTP
 * @param {Object} data - Datos de respuesta del servidor
 */
function handleRegistrationError(status, data) {
    // Los errores específicos del backend se muestran directamente
    // ya que el backend valida todo estrictamente
    const errorMessages = {
        'EMAIL_EXISTS': 'Este correo ya está registrado',
        'ID_EXISTS': 'Este número de identificación ya está registrado',
        'EMAIL_FORMAT_INVALID': 'Formato de correo inválido para el tipo de usuario',
        'ROLE_EMAIL_MISMATCH': 'El tipo de usuario no coincide con el dominio del correo',
        'WEAK_PASSWORD': 'La contraseña no cumple con los requisitos de seguridad'
    };

    const message = errorMessages[data.error] || data.mensaje || 'Error en el registro';
    showGlobalError(message);
}

// =====================================================================
// FUNCIONES DE INTERFAZ DE USUARIO
// =====================================================================

function showFieldError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.color = '#dc3545';
        element.classList.add('error-active');
    }
}

function showFieldSuccess(element, message) {
    if (element) {
        element.textContent = message;
        element.style.color = '#28a745';
        element.classList.remove('error-active');
    }
}

function clearFieldError(element) {
    if (element) {
        element.textContent = '';
        element.classList.remove('error-active');
    }
}

function clearErrorMessages(elements) {
    elements.forEach(element => clearFieldError(element));
}

function showGlobalError(message) {
    alert(message); // Reemplazar con un componente de notificación más elegante
}

function showSuccessMessage(message) {
    alert(message); // Reemplazar con un componente de notificación más elegante
}

function showLoadingState(message) {
    // Implementar indicador de carga visual
    console.log(message);
}

function hideLoadingState() {
    // Ocultar indicador de carga
}

// =====================================================================
// FUNCIONES DE GESTIÓN DE SESIÓN
// =====================================================================

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '/frontend/views/login.html';
}

function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

function getToken() {
    return localStorage.getItem('token');
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/frontend/views/login.html';
    }
}

// =====================================================================
// CONFIGURACIÓN DE CONTRASEÑA VISIBLE
// =====================================================================

function setupPasswordToggle(toggleSelector, inputId) {
    const toggle = document.querySelector(toggleSelector);
    if (toggle) {
        toggle.addEventListener('click', () => {
            const input = document.getElementById(inputId);
            if (input) {
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;

                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            }
        });
    }
}

// =====================================================================
// INICIALIZACIÓN
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Configurar formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Configurar formulario de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        setupRealTimeEmailValidation();
    }

    // Configurar toggles de contraseña
    setupPasswordToggle('.password-toggle', 'login-password');
    setupPasswordToggle('#register-password-toggle', 'password');
});

function resetRegistrationForm() {
    const form = document.getElementById('register-form');
    if (form) {
        form.reset();
        // Limpiar todos los mensajes de error
        const errorElements = form.querySelectorAll('[id$="-error"]');
        errorElements.forEach(element => clearFieldError(element));
    }
}

function showValidationErrors(errors) {
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}-error`) || 
                        document.getElementById(`error${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (errorElement) {
            showFieldError(errorElement, errors[field]);
        }
    });
}