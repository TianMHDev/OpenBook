
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { verificarToken } from "../app/index.js";
import { pool } from "../database/conexion_db.js";

const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_aqui_cambiar_en_produccion";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Configuración de roles del sistema - FUENTE ÚNICA DE VERDAD
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

// Configuración de seguridad para contraseñas
const PASSWORD_CONFIG = {
    minLength: 8,
    saltRounds: 12, // Nivel alto de seguridad para bcrypt
    requireComplexity: true // Mayúsculas, minúsculas y números
};

// =====================================================================
// MIDDLEWARE DE CORS Y CONFIGURACIÓN
// =====================================================================

router.use((req, res, next) => {
    // Configuración CORS - en producción, especificar dominios exactos
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Manejar peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// =====================================================================
// FUNCIONES DE VALIDACIÓN CENTRAL - LÓGICA DE NEGOCIO CRÍTICA
// =====================================================================

/**
 * Valida el formato de email según el rol de manera ESTRICTA
 * Esta es la función más importante del sistema - define quién puede registrarse
 * 
 * REGLA DE NEGOCIO: Solo correos institucionales específicos por rol
 * - Maestros: SOLO @maestro.edu.co
 * - Estudiantes: SOLO @estudiante.edu.co
 * 
 * @param {string} email - Correo electrónico a validar
 * @param {number} roleId - ID del rol (1=maestro, 2=estudiante)
 * @returns {boolean} - true si el email es válido para el rol
 */
function validateEmailFormatStrict(email, roleId) {
    // Validaciones de entrada básicas
    if (!email || !roleId) {
        console.log('Validación fallida: email o roleId faltantes');
        return false;
    }
    
    // Normalizar email - siempre en minúsculas y sin espacios
    const emailNormalized = email.toLowerCase().trim();
    
    // Validar formato básico de email usando expresión regular
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(emailNormalized)) {
        console.log('Validación fallida: formato básico de email inválido');
        return false;
    }
    
    // Validación ESTRICTA por rol - aquí está la lógica de negocio clave
    switch (parseInt(roleId)) {
        case ROLES.TEACHER.id:
            // Los maestros SOLO pueden usar el dominio específico
            const isValidTeacherEmail = emailNormalized.endsWith(`@${ROLES.TEACHER.domain}`);
            console.log(`Validando email de maestro: ${emailNormalized} - Válido: ${isValidTeacherEmail}`);
            return isValidTeacherEmail;
            
        case ROLES.STUDENT.id:
            // Los estudiantes SOLO pueden usar el dominio específico
            const isValidStudentEmail = emailNormalized.endsWith(`@${ROLES.STUDENT.domain}`);
            console.log(`Validando email de estudiante: ${emailNormalized} - Válido: ${isValidStudentEmail}`);
            return isValidStudentEmail;
            
        default:
            console.log(`Validación fallida: rol inválido ${roleId}`);
            return false;
    }
}

/**
 * Verifica la concordancia estricta entre rol y dominio del email
 * Esta función implementa la regla de negocio más importante:
 * "El rol seleccionado DEBE coincidir EXACTAMENTE con el dominio del correo"
 * 
 * @param {string} email - Correo electrónico
 * @param {number} roleId - ID del rol seleccionado
 * @returns {Object} - { isValid: boolean, reason: string }
 */
function validateRoleEmailMatch(email, roleId) {
    const emailNormalized = email.toLowerCase().trim();
    const roleIdInt = parseInt(roleId);
    
    // Determinar el dominio del email
    const emailDomain = emailNormalized.split('@')[1];
    
    // Verificar concordancia estricta
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
 * Valida la fortaleza de la contraseña según políticas de seguridad
 * @param {string} password - Contraseña a validar
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
    const errors = [];
    
    // Verificar longitud mínima
    if (!password || password.length < PASSWORD_CONFIG.minLength) {
        errors.push(`La contraseña debe tener al menos ${PASSWORD_CONFIG.minLength} caracteres`);
    }
    
    if (PASSWORD_CONFIG.requireComplexity) {
        // Verificar mayúsculas
        if (!/[A-Z]/.test(password)) {
            errors.push('La contraseña debe incluir al menos una mayúscula');
        }
        
        // Verificar minúsculas  
        if (!/[a-z]/.test(password)) {
            errors.push('La contraseña debe incluir al menos una minúscula');
        }
        
        // Verificar números
        if (!/\d/.test(password)) {
            errors.push('La contraseña debe incluir al menos un número');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// =====================================================================
// FUNCIONES DE BASE DE DATOS
// =====================================================================

/**
 * Verifica si un email ya existe en la base de datos
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>} - true si el email ya existe
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
 * Verifica si un número de identificación ya existe
 * @param {string} nationalId - Número de identificación
 * @returns {Promise<boolean>} - true si el ID ya existe
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
 * Verifica si una institución existe
 * @param {number} institutionId - ID de la institución
 * @returns {Promise<boolean>} - true si la institución existe
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

// =====================================================================
// ENDPOINT: REGISTRO DE USUARIOS - VALIDACIÓN EXHAUSTIVA
// =====================================================================

router.post("/register", async (req, res) => {
    console.log('=== INICIO PROCESO DE REGISTRO ===');
    console.log('Datos recibidos:', { ...req.body, password: '[OCULTA]' });
    
    const { full_name, national_id, email, password, role_id, institution_id } = req.body;

    // ========================================
    // FASE 1: VALIDACIÓN DE CAMPOS REQUERIDOS
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
    // FASE 2: NORMALIZACIÓN DE DATOS
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
    // FASE 3: VALIDACIONES DE FORMATO Y LÓGICA DE NEGOCIO
    // ========================================

    // Validar nombre (longitud mínima)
    if (normalizedName.length < 3) {
        return res.status(400).json({ 
            mensaje: "El nombre debe tener al menos 3 caracteres",
            error: "INVALID_NAME"
        });
    }

    // Validar número de identificación (solo números, 7-12 dígitos)
    if (!/^\d{7,12}$/.test(national_id)) {
        return res.status(400).json({ 
            mensaje: "Número de identificación inválido (debe tener entre 7 y 12 dígitos)",
            error: "INVALID_NATIONAL_ID"
        });
    }

    // Validar que el rol sea válido (solo maestro=1 o estudiante=2)
    if (![ROLES.TEACHER.id, ROLES.STUDENT.id].includes(roleIdInt)) {
        console.log('Rol inválido proporcionado:', roleIdInt);
        return res.status(400).json({ 
            mensaje: "Rol inválido. Solo se permiten maestros y estudiantes",
            error: "INVALID_ROLE"
        });
    }

    // ========================================
    // FASE 4: VALIDACIÓN CRÍTICA - FORMATO DE EMAIL SEGÚN ROL
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
    // FASE 5: VALIDACIÓN CRÍTICA - CONCORDANCIA ROL-EMAIL
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
    // FASE 6: VALIDACIÓN DE CONTRASEÑA
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
    // FASE 7: VALIDACIONES DE BASE DE DATOS
    // ========================================

    try {
        console.log('=== VERIFICANDO DUPLICADOS EN BASE DE DATOS ===');
        
        // Verificar email duplicado
        const emailDuplicate = await emailExists(normalizedEmail);
        if (emailDuplicate) {
            console.log('Email ya registrado:', normalizedEmail);
            return res.status(409).json({ 
                mensaje: "Este correo electrónico ya está registrado",
                error: "EMAIL_EXISTS"
            });
        }

        // Verificar ID nacional duplicado
        const idDuplicate = await nationalIdExists(national_id);
        if (idDuplicate) {
            console.log('ID nacional ya registrado:', national_id);
            return res.status(409).json({ 
                mensaje: "Este número de identificación ya está registrado",
                error: "NATIONAL_ID_EXISTS"
            });
        }

        // Verificar que la institución exista
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
        // FASE 8: CREACIÓN DEL USUARIO
        // ========================================

        console.log('=== PROCEDIENDO CON LA CREACIÓN DEL USUARIO ===');
        
        // Cifrar contraseña con alta seguridad
        const hashedPassword = await bcrypt.hash(password, PASSWORD_CONFIG.saltRounds);
        console.log('Contraseña cifrada correctamente');

        // Insertar usuario en la base de datos
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
        // FASE 9: GENERACIÓN DE TOKEN Y RESPUESTA
        // ========================================

        // Crear payload del JWT (datos no sensibles)
        const userPayload = {
            user_id: result.insertId,
            email: normalizedEmail,
            role_id: roleIdInt,
            full_name: normalizedName,
            institution_id: institutionIdInt
        };

        // Generar token JWT para login automático
        const token = jwt.sign(userPayload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'auth-system',
            audience: 'edu-platform'
        });

        console.log('Token JWT generado para usuario:', result.insertId);
        console.log('=== REGISTRO COMPLETADO EXITOSAMENTE ===');

        // Respuesta exitosa con toda la información necesaria
        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            success: true,
            user_id: result.insertId,
            token,
            user: userPayload,
            // Información adicional para el frontend
            redirect: roleIdInt === ROLES.TEACHER.id ? '/teacher-dashboard' : '/student-dashboard'
        });

    } catch (error) {
        console.error("Error crítico en el registro:", error);
        
        // Manejo de errores específicos de base de datos
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

        // Error genérico para no exponer detalles internos
        res.status(500).json({ 
            mensaje: "Error interno del servidor durante el registro",
            error: "SERVER_ERROR"
        });
    }
});

// =====================================================================
// ENDPOINT: LOGIN DE USUARIOS
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
        // Buscar usuario en la base de datos con información de institución
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
            // IMPORTANTE: No revelar si el email existe o no por seguridad
            return res.status(401).json({ 
                mensaje: "Credenciales incorrectas",
                error: "INVALID_CREDENTIALS"
            });
        }

        const user = results[0];
        console.log('Usuario encontrado, verificando contraseña...');

        // Verificar contraseña usando bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            console.log('Contraseña incorrecta para usuario:', normalizedEmail);
            return res.status(401).json({ 
                mensaje: "Credenciales incorrectas",
                error: "INVALID_CREDENTIALS"
            });
        }

        console.log('Credenciales válidas, generando sesión...');

        // Crear payload del JWT (excluir información sensible)
        const userPayload = {
            user_id: user.user_id,
            email: user.email,
            role_id: user.role_id,
            full_name: user.full_name,
            institution_id: user.institution_id,
            institution_name: user.institution_name,
            role_name: user.role_name
        };

        // Generar token JWT
        const token = jwt.sign(userPayload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'auth-system',
            audience: 'edu-platform'
        });

        // Actualizar último login en la base de datos
        const updateLoginQuery = "UPDATE users SET last_login = NOW() WHERE user_id = ?";
        await pool.query(updateLoginQuery, [user.user_id]);

        console.log('Login exitoso para usuario:', user.user_id);
        console.log('=== LOGIN COMPLETADO ===');

        // Respuesta exitosa
        res.status(200).json({
            mensaje: "Login exitoso",
            success: true,
            token,
            user: userPayload,
            // Información para redirección
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
// ENDPOINTS ADICIONALES DE GESTIÓN DE SESIÓN
// =====================================================================

/**
 * Endpoint para cerrar sesión
 * Registra el evento de logout (útil para auditoría)
 */
router.post("/logout", verificarToken, async (req, res) => {
    try {
        // Registrar logout en la base de datos para auditoría
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
        // Aún así confirmamos el logout al cliente
        res.json({
            mensaje: "Logout procesado",
            success: true,
            nota: "Sesión cerrada correctamente"
        });
    }
});

/**
 * Endpoint para verificar si un token es válido
 * Útil para validar sesiones existentes
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
 * Endpoint para obtener perfil completo del usuario
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
 * Endpoint para verificar disponibilidad de email
 * Útil para validación en tiempo real en el frontend
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
        // Si se proporciona role_id, validar formato
        if (role_id && !validateEmailFormatStrict(normalizedEmail, parseInt(role_id))) {
            const expectedDomain = parseInt(role_id) === ROLES.TEACHER.id ? ROLES.TEACHER.domain : ROLES.STUDENT.domain;
            return res.status(400).json({ 
                mensaje: `Email inválido para el rol. Se requiere dominio @${expectedDomain}`,
                available: false,
                error: "FORMAT_INVALID",
                expectedDomain
            });
        }

        // Verificar disponibilidad
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
// EXPORTAR ROUTER
// =====================================================================

export default router;