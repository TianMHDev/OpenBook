

// API Base URL - change depending on the environment
const API_BASE_URL = 'http://localhost:3000/api/auth';

// Configuring roles and their corresponding domains
const ROLE_CONFIG = {
    teacher: {
        id: 1,
        domain: '@maestro.edu.co',
        displayName: 'Maestro',
        placeholder: 'ejemplo@correo.co'
    },
    student: {
        id: 2,
        domain: '@estudiante.edu.co', 
        displayName: 'Estudiante',
        placeholder: 'ejemplo@correo.co'
    }
};

// =====================================================================
// MAIN AUTHENTICATION FUNCTIONS
// =====================================================================

/**
 * Handles the login process
 * @param {Event} event - Form event
 */
async function handleLogin(event) {
    event.preventDefault();

    // Get form elements
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEmailElement = document.getElementById('login-email-error');
    const errorPasswordElement = document.getElementById('login-password-error');

    // Clear previous error messages
    clearErrorMessages([errorEmailElement, errorPasswordElement]);

    // Basic client-side validation (UX only)
    if (!email) {
        showFieldError(errorEmailElement, 'El correo es requerido');
        return;
    }
    if (!password) {
        showFieldError(errorPasswordElement, 'La contraseña es requerida');
        return;
    }

    // Show charging indicator
    showLoadingState('Iniciando sesión...');

    try {
        // Make a request to the backend
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: email.toLowerCase(), // Normalize email
                password 
            })
        });

        const data = await response.json();

        // Handling different types of server responses
        if (!response.ok) {
            handleLoginError(response.status, data, errorEmailElement, errorPasswordElement);
            return;
        }

        // Login successful - save user data
        saveUserSession(data);
        
        // Redirect based on user role
        redirectUserBasedOnRole(data.user.role_id);

    } catch (error) {
        console.error('Error de conexión:', error);
        showGlobalError('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
        hideLoadingState();
    }
}

/**
 * Manages the user registration process
 * @param {Event} event - Form event
 */
async function handleRegister(event) {
    event.preventDefault();

    // Collect form data
    const formData = collectFormData();
    
    // Validate basic data on the client (UX only)
    const clientValidation = validateFormDataClient(formData);
    if (!clientValidation.isValid) {
        showValidationErrors(clientValidation.errors);
        return;
    }

    // Show charging status
    showLoadingState('Registrando usuario...');

    try {
        // Send data to the backend for validation and actual registration
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

        // Successful registration
        showSuccessMessage('¡Registro exitoso! Puedes iniciar sesión ahora.');
        resetRegistrationForm();
        
        // Optional: Automatically redirect to login
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
// CUSTOMER VALIDATION FUNCTIONS (FOR UX ONLY)
// =====================================================================

/**
 * Validates email format based on role (UX validation)
* NOTE: This is only UX validation. The actual validation is in the backend.
 * @param {string} email - email
 * @param {string} role - User role (teacher/student)
 * @returns {boolean} - The format is valid
 */
function validateEmailFormatUX(email, role) {
    if (!email || !role || !ROLE_CONFIG[role]) return false;
    
    const emailLowerCase = email.toLowerCase().trim();
    const expectedDomain = ROLE_CONFIG[role].domain;
    
    return emailLowerCase.endsWith(expectedDomain) && 
        emailLowerCase.length > expectedDomain.length;
}

/**
 * Validates form data on the client (UX only)
 * @param {Object} formData - Datos del formulario
 * @returns {Object} - Validation result
 */
function validateFormDataClient(formData) {
    const errors = {};
    let isValid = true;

    // Validate full name
    if (!formData.fullName || formData.fullName.length < 3) {
        errors.fullName = 'El nombre debe tener al menos 3 caracteres';
        isValid = false;
    }

    // Validate ID number (basic format)
    if (!formData.nationalId || !/^\d{7,12}$/.test(formData.nationalId)) {
        errors.nationalId = 'Número de identificación inválido (7-12 dígitos)';
        isValid = false;
    }

    // Validate email
    if (!formData.email) {
        errors.email = 'El correo electrónico es requerido';
        isValid = false;
    } else if (!validateEmailFormatUX(formData.email, formData.role)) {
        const expectedDomain = ROLE_CONFIG[formData.role]?.domain || '';
        errors.email = `El correo debe terminar en ${expectedDomain}`;
        isValid = false;
    }

    // Validate password (basic rules)
    if (!formData.password) {
        errors.password = 'La contraseña es requerida';
        isValid = false;
    } else if (formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
        isValid = false;
    }

    // Validate role
    if (!formData.role || !ROLE_CONFIG[formData.role]) {
        errors.role = 'Debe seleccionar un tipo de usuario válido';
        isValid = false;
    }

    return { isValid, errors };
}

// =====================================================================
// REAL-TIME VALIDATION FUNCTIONS
// =====================================================================

/**
 * Configure real-time email validation
 */
function setupRealTimeEmailValidation() {
    const emailInput = document.getElementById('email');
    const roleInputs = document.querySelectorAll('input[name="userType"]');
    const emailError = document.getElementById('email-error');

    if (!emailInput || !emailError) return;

    // Function to validate email when it changes
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
        

        // Validate format
        if (validateEmailFormatUX(emailValue, selectedRole)) {
            showFieldSuccess(emailError, '✓ Correo válido');
        } else {
            const config = ROLE_CONFIG[selectedRole];
            showFieldError(emailError, `El correo debe ser el asignado por tu institución`);
        }
    }

    // Update placeholder when role changes
    function updateEmailPlaceholder(role) {
        if (ROLE_CONFIG[role]) {
            emailInput.placeholder = ROLE_CONFIG[role].placeholder;
            emailInput.value = ''; // Clear field when changing role
            clearFieldError(emailError);
        }
    }

    // Listeners for role changes
    roleInputs.forEach(radio => {
        radio.addEventListener('change', () => {
            updateEmailPlaceholder(radio.value);
            validateEmailRealTime(); // Revalidate if there is already text
        });
    });

    // Listeners for email changes
    emailInput.addEventListener('input', validateEmailRealTime);
    emailInput.addEventListener('blur', validateEmailRealTime);
}
// =====================================================================
// REAL-TIME VALIDATION FUNCTIONS
// =====================================================================


function setupRealTimePasswordValidation() {
    const passwordInput = document.getElementById('password');
    const passwordError = document.getElementById('password-error');
    const strengthBar = document.querySelector('.strength-bar');

    if (!passwordInput || !passwordError || !strengthBar) return;

    passwordInput.addEventListener("input", () => {
        const password = passwordInput.value;
        const errors = [];
        let strength = 0;

        // Check minimum length
        if (password.length >= 8) {
            strength++;
        } else {
            errors.push("Debe tener al menos 8 caracteres");
        }

        // Check upercase
        if (/[A-Z]/.test(password)) {
            strength++;
        } else {
            errors.push("Debe incluir al menos una mayúscula");
        }

        // Check lowercase
        if (/[a-z]/.test(password)) {
            strength++;
        } else {
            errors.push("Debe incluir al menos una minúscula");
        }

        // Check numbers
        if (/\d/.test(password)) {
            strength++;
        } else {
            errors.push("Debe incluir al menos un número");
        }

        // Show errors
        if (errors.length > 0) {
            passwordError.innerHTML = errors.map(err => `${err}`).join("<br>");
            passwordError.style.color = "red";
        } else {
            passwordError.innerHTML = "✅ Contraseña segura";
            passwordError.style.color = "green";
        }

        // Strength bar
        strengthBar.style.width = (strength / 5 * 100) + "%";
        if (strength <= 2) {
            strengthBar.style.background = "red";
        } else if (strength === 3) {
            strengthBar.style.background = "orange";
        } else if (strength === 4) {
            strengthBar.style.background = "gold";
        } else if (strength === 5) {
            strengthBar.style.background = "green";
        }
    });
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

/**
 * Collects data from the registration form
 * @returns {Object} - Form data
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
 * Saves the user's session to local storage
 * @param {Object} sessionData - Session data
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
 * Redirects the user based on their role
 * @param {number} roleId - User role ID
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
// ERROR HANDLING FUNCTIONS
// =====================================================================

/**
 * Handles login-specific errors
 * @param {number} status - HTTP status code
 * @param {Object} data - Server response data
 * @param {HTMLElement} emailError - Email error element
 * @param {HTMLElement} passwordError - Password error element
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
 * Handles registry-specific errors
 * @param {number} status - HTTP status code
 * @param {Object} data - Server response data
 */
function handleRegistrationError(status, data) {
    // Backend-specific errors are displayed directly
// since the backend strictly validates everything
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
// USER INTERFACE FUNCTIONS
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
    alert(message); // Replace with a more elegant notification component
}

function showSuccessMessage(message) {
    alert(message); // Replace with a more elegant notification component
}

function showLoadingState(message) {
    // Implement visual load indicator
    console.log(message);
}

function hideLoadingState() {
    // Hide loading indicator
}

// =====================================================================
// SESSION MANAGEMENT FUNCTIONS
// =====================================================================

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '../views/login.html';
}

function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

function getToken() {
    return localStorage.getItem('token');
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '../views/login.html';
    }
}

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
const togglePassword = document.querySelector(".password-toggle");
    const passwordInput = document.querySelector("#password");
    const toggleIcon = togglePassword.querySelector("i");

    togglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);

        // Toggles the icon between open eye and crossed out eye
        toggleIcon.classList.toggle("bi-eye");
        toggleIcon.classList.toggle("bi-eye-slash");
        
        // Change the aria-label for accessibility
        togglePassword.setAttribute("aria-label", 
            type === "password" ? "Mostrar contraseña" : "Ocultar contraseña"
        );
    });

document.addEventListener('DOMContentLoaded', () => {
    // Configure login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Configure registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        setupRealTimeEmailValidation();
        setupRealTimePasswordValidation();
    }

    // Configure password toggles
    setupPasswordToggle('.password-toggle', 'login-password');
    setupPasswordToggle('#register-password-toggle', 'password');
});

function resetRegistrationForm() {
    const form = document.getElementById('register-form');
    if (form) {
        form.reset();
        // Clear all error messages
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