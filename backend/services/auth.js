
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { verificarToken } from "../app/index.js";
import { pool } from "../database/conexion_db.js";

const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_aqui_cambiar_en_produccion";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// System Role Configuration - SINGLE SOURCE OF TRUTH
const ROLES = {
    TEACHER: {
        id: 1,
        name: 'teacher',
        domain: 'maestro.edu.co',
        displayName: 'Maestro'
    },
    STUDENT: {
        id: 2, 
        name: 'student',
        domain: 'estudiante.edu.co',
        displayName: 'Estudiante'
    }
};

// Password security settings
const PASSWORD_CONFIG = {
    minLength: 8,
    saltRounds: 12, // High level of security for bcrypt
    requireComplexity: true // Uppercase, lowercase, and numbers
};

// ============================================================================
// CORS MIDDLEWARE AND CONFIGURATION
// =========================================================================

router.use((req, res, next) => {
    // CORS Configuration - In production, specify exact domains
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Handling OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// ==========================================================================
// CORE VALIDATION FUNCTIONS - CRITICAL BUSINESS LOGIC
// ===================================================================================

/**
* STRICTLY validates the email format according to the role
* This is the most important function of the system - it defines who can register
*
* BUSINESS RULE: Only specific institutional emails per role
* - Teachers: ONLY @maestro.edu.co
* - Students: ONLY @estudiante.edu.co
 * 
 * @param {string} email - Email to validate
 * 
 * @param {number} roleId - Role ID (1=teacher, 2=student)
 * @returns {boolean} - true if the email is valid for the role
 */
function validateEmailFormatStrict(email, roleId) {
    // Basic input validations
    if (!email || !roleId) {
        console.log('Validación fallida: email o roleId faltantes');
        return false;
    }
    
    // Normalize email - always in lowercase and without spaces
    const emailNormalized = email.toLowerCase().trim();
    
    // Validate basic email format using regular expression
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(emailNormalized)) {
        console.log('Validación fallida: formato básico de email inválido');
        return false;
    }
    
    // STRICT validation by role - here is the key business logic
    switch (parseInt(roleId)) {
        case ROLES.TEACHER.id:
            // Teachers can ONLY use the specific domain
            const isValidTeacherEmail = emailNormalized.endsWith(`@${ROLES.TEACHER.domain}`);
            console.log(`Validando email de maestro: ${emailNormalized} - Válido: ${isValidTeacherEmail}`);
            return isValidTeacherEmail;
            
        case ROLES.STUDENT.id:
            // Students may ONLY use the specific domain
            const isValidStudentEmail = emailNormalized.endsWith(`@${ROLES.STUDENT.domain}`);
            console.log(`Validando email de estudiante: ${emailNormalized} - Válido: ${isValidStudentEmail}`);
            return isValidStudentEmail;
            
        default:
            console.log(`Validación fallida: rol inválido ${roleId}`);
            return false;
    }
}

/**
 * Checks for strict matching between role and email domain
* This feature implements the most important business rule:
* "The selected role MUST EXACTLY match the email domain."
 * 
 * @param {string} email - email
 * @param {number} roleId - ID of the selected role
 * @returns {Object} - { isValid: boolean, reason: string }
 */
function validateRoleEmailMatch(email, roleId) {
    const emailNormalized = email.toLowerCase().trim();
    const roleIdInt = parseInt(roleId);
    
    // Determine the email domain
    const emailDomain = emailNormalized.split('@')[1];
    
    // Check strict match
    if (roleIdInt === ROLES.TEACHER.id) {
        if (emailDomain === ROLES.TEACHER.domain) {
            return { isValid: true, reason: 'Concordancia válida: maestro con dominio maestro' };
        } else {
            return { 
                isValid: false, 
                reason: `Rol maestro requiere dominio @${ROLES.TEACHER.domain}, pero se proporcionó @${emailDomain}` 
            };
        }
    }
    
    if (roleIdInt === ROLES.STUDENT.id) {
        if (emailDomain === ROLES.STUDENT.domain) {
            return { isValid: true, reason: 'Concordancia válida: estudiante con dominio estudiante' };
        } else {
            return { 
                isValid: false, 
                reason: `Rol estudiante requiere dominio @${ROLES.STUDENT.domain}, pero se proporcionó @${emailDomain}` 
            };
        }
    }
    
    return { isValid: false, reason: 'Rol no reconocido' };
}

/**
 * Validates password strength according to security policies
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
    const errors = [];
    
    // Check minimum length
    if (!password || password.length < PASSWORD_CONFIG.minLength) {
        errors.push(`La contraseña debe tener al menos ${PASSWORD_CONFIG.minLength} caracteres`);
    }
    
    if (PASSWORD_CONFIG.requireComplexity) {
        // Check upercase
        if (!/[A-Z]/.test(password)) {
            errors.push('La contraseña debe incluir al menos una mayúscula');
        }
        
        // Check lowercase  
        if (!/[a-z]/.test(password)) {
            errors.push('La contraseña debe incluir al menos una minúscula');
        }
        
        // Check numbers
        if (!/\d/.test(password)) {
            errors.push('La contraseña debe incluir al menos un número');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// ==============================================================================
// DATABASE FUNCTIONS
// ========================================================================

/**
 * Check if an email already exists in the database
 * @param {string} email - Email to verify
 * @returns {Promise<boolean>} - true if the email already exists
 */
async function emailExists(email) {
    try {
        const query = "SELECT user_id FROM users WHERE email = ?";
        const [results] = await pool.query(query, [email.toLowerCase()]);
        return results.length > 0;
    } catch (error) {
        console.error("Error verificando email:", error);
        throw new Error("Error interno verificando email");
    }
}

/**
 * Check if an ID number already exists
 * @param {string} nationalId - Identification number
 * @returns {Promise<boolean>} - true if the ID already exists
 */
async function nationalIdExists(nationalId) {
    try {
        const query = "SELECT user_id FROM users WHERE national_id = ?";
        const [results] = await pool.query(query, [nationalId]);
        return results.length > 0;
    } catch (error) {
        console.error("Error verificando ID nacional:", error);
        throw new Error("Error interno verificando identificación");
    }
}

/**
 * Check if an institution exists
 * @param {number} institutionId - Institution ID
 * @returns {Promise<boolean>} - true if the institution exists
 */
async function institutionExists(institutionId) {
    try {
        const query = "SELECT institution_id FROM institutions WHERE institution_id = ?";
        const [results] = await pool.query(query, [institutionId]);
        return results.length > 0;
    } catch (error) {
        console.error("Error verificando institución:", error);
        throw new Error("Error interno verificando institución");
    }
}

// ============================================================================
// ENDPOINT: USER REGISTRATION - EXHAUSTIVE VALIDATION
// ===========================================================================

router.post("/register", async (req, res) => {
    console.log('=== INICIO PROCESO DE REGISTRO ===');
    console.log('Datos recibidos:', { ...req.body, password: '[OCULTA]' });
    
    const { full_name, national_id, email, password, role_id, institution_id } = req.body;

    // ========================================
    // PHASE 1: VALIDATION OF REQUIRED FIELDS
    // ========================================
    
    const requiredFields = { full_name, national_id, email, password, role_id, institution_id };
    const missingFields = Object.entries(requiredFields)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missingFields.length > 0) {
        console.log('Registro fallido: campos faltantes -', missingFields);
        return res.status(400).json({ 
            mensaje: "Todos los campos son requeridos",
            error: "MISSING_FIELDS",
            camposFaltantes: missingFields
        });
    }

    // ========================================
    // PHASE 2: DATA NORMALIZATION
    // ========================================
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = full_name.trim();
    const roleIdInt = parseInt(role_id);
    const institutionIdInt = parseInt(institution_id);

    console.log('Datos normalizados:', {
        email: normalizedEmail,
        role_id: roleIdInt,
        institution_id: institutionIdInt
    });

    // ========================================
    // PHASE 3: FORMAT VALIDATIONS AND BUSINESS LOGIC
    // ========================================

    // Validate name (minimum length)
    if (normalizedName.length < 3) {
        return res.status(400).json({ 
            mensaje: "El nombre debe tener al menos 3 caracteres",
            error: "INVALID_NAME"
        });
    }

    // Validate ID number (numbers only, 7-12 digits)
    if (!/^\d{7,12}$/.test(national_id)) {
        return res.status(400).json({ 
            mensaje: "Número de identificación inválido (debe tener entre 7 y 12 dígitos)",
            error: "INVALID_NATIONAL_ID"
        });
    }

    // Validate that the role is valid (only teacher=1 or student=2)
    if (![ROLES.TEACHER.id, ROLES.STUDENT.id].includes(roleIdInt)) {
        console.log('Rol inválido proporcionado:', roleIdInt);
        return res.status(400).json({ 
            mensaje: "Rol inválido. Solo se permiten maestros y estudiantes",
            error: "INVALID_ROLE"
        });
    }

    // ========================================
    // PHASE 4: CRITICAL VALIDATION - EMAIL FORMAT ACCORDING TO ROLE
    // ========================================
    
    console.log('=== VALIDANDO FORMATO DE EMAIL SEGÚN ROL ===');
    
    if (!validateEmailFormatStrict(normalizedEmail, roleIdInt)) {
        const expectedDomain = roleIdInt === ROLES.TEACHER.id ? ROLES.TEACHER.domain : ROLES.STUDENT.domain;
        console.log(`Email ${normalizedEmail} no es válido para rol ${roleIdInt}`);
        
        return res.status(400).json({ 
            mensaje: `Correo inválido. ${roleIdInt === ROLES.TEACHER.id ? 'Los maestros' : 'Los estudiantes'} deben usar correos @${expectedDomain}`,
            error: "EMAIL_FORMAT_INVALID",
            dominioRequerido: expectedDomain
        });
    }

    // ========================================  
    // PHASE 5: CRITICAL VALIDATION - ROLE-EMAIL CONCORDANCE
    // ========================================
    
    console.log('=== VALIDANDO CONCORDANCIA ROL-EMAIL ===');
    
    const roleEmailMatch = validateRoleEmailMatch(normalizedEmail, roleIdInt);
    if (!roleEmailMatch.isValid) {
        console.log('Falla en concordancia rol-email:', roleEmailMatch.reason);
        
        return res.status(400).json({ 
            mensaje: "El tipo de usuario seleccionado no coincide con el dominio del correo electrónico",
            error: "ROLE_EMAIL_MISMATCH",
            detalle: roleEmailMatch.reason
        });
    }
    
    console.log('Concordancia rol-email válida:', roleEmailMatch.reason);

    // ========================================
    // PHASE 6: PASSWORD VALIDATION
    // ========================================
    
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        console.log('Contraseña débil:', passwordValidation.errors);
        
        return res.status(400).json({ 
            mensaje: "La contraseña no cumple con los requisitos de seguridad",
            error: "WEAK_PASSWORD",
            requisitos: passwordValidation.errors
        });
    }

    // ========================================
    // PHASE 7: DATABASE VALIDATIONS
//========================================

    try {
        console.log('=== VERIFICANDO DUPLICADOS EN BASE DE DATOS ===');
        
        // Check for duplicate emails
        const emailDuplicate = await emailExists(normalizedEmail);
        if (emailDuplicate) {
            console.log('Email ya registrado:', normalizedEmail);
            return res.status(409).json({ 
                mensaje: "Este correo electrónico ya está registrado",
                error: "EMAIL_EXISTS"
            });
        }

        // Check duplicate national ID
        const idDuplicate = await nationalIdExists(national_id);
        if (idDuplicate) {
            console.log('ID nacional ya registrado:', national_id);
            return res.status(409).json({ 
                mensaje: "Este número de identificación ya está registrado",
                error: "NATIONAL_ID_EXISTS"
            });
        }

        // Verify that the institution exists
        const institutionValid = await institutionExists(institutionIdInt);
        if (!institutionValid) {
            console.log('Institución no válida:', institutionIdInt);
            return res.status(400).json({ 
                mensaje: "La institución seleccionada no es válida",
                error: "INVALID_INSTITUTION"
            });
        }

        console.log('Todas las validaciones de BD pasaron correctamente');

        // ========================================
        // PHASE 8: USER CREATION
        // ========================================

        console.log('=== PROCEDIENDO CON LA CREACIÓN DEL USUARIO ===');
        
        // Encrypt password with high security

        const hashedPassword = await bcrypt.hash(password, PASSWORD_CONFIG.saltRounds);
        console.log('Contraseña cifrada correctamente');

        // Insert user into the database

        const insertQuery = `
            INSERT INTO users (full_name, national_id, email, password, role_id, institution_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        const [result] = await pool.query(insertQuery, [
            normalizedName,
            national_id,
            normalizedEmail,
            hashedPassword,
            roleIdInt,
            institutionIdInt
        ]);

        console.log('Usuario creado exitosamente con ID:', result.insertId);

        // ========================================
        // PHASE 9: TOKEN GENERATION AND RESPONSE
        // ========================================

        // Create JWT payload (non-sensitive data)
        const userPayload = {
            user_id: result.insertId,
            email: normalizedEmail,
            role_id: roleIdInt,
            full_name: normalizedName,
            institution_id: institutionIdInt
        };

        // Generate JWT token for automatic login
        const token = jwt.sign(userPayload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'auth-system',
            audience: 'edu-platform'
        });

        console.log('Token JWT generado para usuario:', result.insertId);
        console.log('=== REGISTRO COMPLETADO EXITOSAMENTE ===');

        // Successful response with all necessary information
        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            success: true,
            user_id: result.insertId,
            token,
            user: userPayload,
            // Additional information for the frontend
            redirect: roleIdInt === ROLES.TEACHER.id ? '/teacher-dashboard' : '/student-dashboard'
        });

    } catch (error) {
        console.error("Error crítico en el registro:", error);
        
        // Handling database-specific errors

        if (error.code === "ER_DUP_ENTRY") {
            if (error.message.includes('email')) {
                return res.status(409).json({ 
                    mensaje: "Este correo ya está registrado",
                    error: "EMAIL_EXISTS"
                });
            }
            if (error.message.includes('national_id')) {
                return res.status(409).json({ 
                    mensaje: "Este número de identificación ya está registrado",
                    error: "NATIONAL_ID_EXISTS"
                });
            }
        }

        // Generic error for not exposing internal details
        res.status(500).json({ 
            mensaje: "Error interno del servidor durante el registro",
            error: "SERVER_ERROR"
        });
    }
});

// =====================================================================
// ENDPOINT: USER LOGIN
// =====================================================================

router.post("/login", async (req, res) => {
    console.log('=== INICIO PROCESO DE LOGIN ===');
    
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
        console.log('Login fallido: campos faltantes');
        return res.status(400).json({ 
            mensaje: "Email y contraseña son requeridos",
            error: "MISSING_CREDENTIALS"
        });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Intento de login para email:', normalizedEmail);

    try {
        // Search for user in the database with institution information
        const query = `
            SELECT u.user_id, u.email, u.password, u.role_id, u.institution_id, 
                u.full_name, u.created_at, u.last_login,
                i.institution_name,
                r.role_name
            FROM users u 
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.email = ?
        `;
        
        const [results] = await pool.query(query, [normalizedEmail]);

        if (results.length === 0) {
            console.log('Usuario no encontrado:', normalizedEmail);
            // IMPORTANT: Do not reveal whether the email exists or not for security reasons.
            return res.status(401).json({ 
                mensaje: "Credenciales incorrectas",
                error: "INVALID_CREDENTIALS"
            });
        }

        const user = results[0];
        console.log('Usuario encontrado, verificando contraseña...');

        // Verify password using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            console.log('Contraseña incorrecta para usuario:', normalizedEmail);
            return res.status(401).json({ 
                mensaje: "Credenciales incorrectas",
                error: "INVALID_CREDENTIALS"
            });
        }

        console.log('Credenciales válidas, generando sesión...');

        // Create JWT payload (exclude sensitive information)
        const userPayload = {
            user_id: user.user_id,
            email: user.email,
            role_id: user.role_id,
            full_name: user.full_name,
            institution_id: user.institution_id,
            institution_name: user.institution_name,
            role_name: user.role_name
        };

        // Generate JWT token
        const token = jwt.sign(userPayload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'auth-system',
            audience: 'edu-platform'
        });

        // Update last login in the database
        const updateLoginQuery = "UPDATE users SET last_login = NOW() WHERE user_id = ?";
        await pool.query(updateLoginQuery, [user.user_id]);

        console.log('Login exitoso para usuario:', user.user_id);
        console.log('=== LOGIN COMPLETADO ===');

        // Successful response
        res.status(200).json({
            mensaje: "Login exitoso",
            success: true,
            token,
            user: userPayload,
            // Information for redirection
            redirect: user.role_id === ROLES.TEACHER.id ? '/teacher-dashboard' : '/student-dashboard'
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ 
            mensaje: "Error interno del servidor",
            error: "SERVER_ERROR"
        });
    }
});

// =====================================================================
// ADDITIONAL SESSION MANAGEMENT ENDPOINTS
// =====================================================================

/**
 * Logout endpoint
* Logs the logout event (useful for auditing)
 */
router.post("/logout", verificarToken, async (req, res) => {
    try {
        // Record logout in the database for auditing
        const logoutQuery = "UPDATE users SET last_logout = NOW() WHERE user_id = ?";
        await pool.query(logoutQuery, [req.user.user_id]);

        console.log('Logout registrado para usuario:', req.user.user_id);

        res.json({
            mensaje: "Logout exitoso",
            success: true,
            nota: "Sesión cerrada correctamente"
        });
    } catch (error) {
        console.error("Error registrando logout:", error);
        // We still confirm the logout to the client.
        res.json({
            mensaje: "Logout procesado",
            success: true,
            nota: "Sesión cerrada correctamente"
        });
    }
});

/**
 * Endpoint to verify if a token is valid
* Useful for validating existing sessions
*/
router.get("/verify-token", verificarToken, (req, res) => {
    res.json({
        mensaje: "Token válido",
        success: true,
        user: req.user,
        expires_in: req.tokenExp ? new Date(req.tokenExp * 1000) : null
    });
});

/**
 *Endpoint to obtain a complete user profile
 */
router.get("/profile", verificarToken, async (req, res) => {
    try {
        const query = `
            SELECT u.user_id, u.full_name, u.national_id, u.email, u.role_id, 
                u.institution_id, u.created_at, u.last_login, u.last_logout,
                i.institution_name, i.institution_address,
                r.role_name, r.role_description
            FROM users u 
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = ?
        `;
        
        const [results] = await pool.query(query, [req.user.user_id]);

        if (results.length === 0) {
            return res.status(404).json({ 
                mensaje: "Usuario no encontrado",
                error: "USER_NOT_FOUND"
            });
        }

        const userProfile = results[0];

        res.json({
            mensaje: "Perfil obtenido correctamente",
            success: true,
            user: userProfile
        });
        
    } catch (error) {
        console.error("Error obteniendo perfil:", error);
        res.status(500).json({ 
            mensaje: "Error interno del servidor",
            error: "SERVER_ERROR"
        });
    }
});

/**
 * Endpoint for checking email availability
* Useful for real-time validation on the front end
 */
router.post("/check-email", async (req, res) => {
    const { email, role_id } = req.body;

    if (!email) {
        return res.status(400).json({ 
            mensaje: "Email es requerido",
            error: "MISSING_EMAIL"
        });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        // If role_id is provided, validate format
        if (role_id && !validateEmailFormatStrict(normalizedEmail, parseInt(role_id))) {
            const expectedDomain = parseInt(role_id) === ROLES.TEACHER.id ? ROLES.TEACHER.domain : ROLES.STUDENT.domain;
            return res.status(400).json({ 
                mensaje: `Email inválido para el rol. Se requiere dominio @${expectedDomain}`,
                available: false,
                error: "FORMAT_INVALID",
                expectedDomain
            });
        }

        // Check availability
        const exists = await emailExists(normalizedEmail);
        
        res.json({
            email: normalizedEmail,
            available: !exists,
            message: exists ? "Email ya está registrado" : "Email disponible",
            success: true
        });

    } catch (error) {
        console.error("Error verificando email:", error);
        res.status(500).json({ 
            mensaje: "Error interno del servidor",
            error: "SERVER_ERROR"
        });
    }
});

// =====================================================================
// EXPORT ROUTER
// =====================================================================

export default router;