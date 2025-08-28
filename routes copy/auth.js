import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { verificarToken } from "../app/index.js"; // Importar el middleware
import { pool } from "../database/conexion_db.js";

const router = express.Router();

// Configuración CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_aqui";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Registro con contraseña cifrada
router.post("/register", async (req, res) => {
const { full_name, national_id, email, password, role_id, institution_id } =
    req.body;

if (
    !full_name ||
    !national_id ||
    !email ||
    !password ||
    !role_id ||
    !institution_id
) {
    return res.status(400).json({ mensaje: "Faltan datos" });
}

try {
    // Cifrar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query =
    "INSERT INTO users (full_name, national_id, email, password, role_id, institution_id) VALUES (?, ?, ?, ?, ?, ?)";

    const [result] = await pool.query(query, [
    full_name,
    national_id,
    email,
    hashedPassword,
    role_id,
    institution_id,
    ]);

    res.status(201).json({
    mensaje: "Usuario registrado correctamente",
    user_id: result.insertId,
    });
} catch (err) {
    console.error("Error en el registro:", err);

    if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ mensaje: "El usuario ya existe" });
    }

    res.status(500).json({ mensaje: "Error en el servidor" });
}
});

// Login con JWT
router.post("/login", async (req, res) => {
const { email, password } = req.body;

if (!email || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
}

try {
    const query =
    "SELECT user_id, email, password, role_id, institution_id FROM users WHERE email = ?";
    const [results] = await pool.query(query, [email]);

    if (results.length === 0) {
    return res
        .status(401)
        .json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    const user = results[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
    return res
        .status(401)
        .json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    // Crear payload del JWT (sin incluir la contraseña)
    const payload = {
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id,
    institution_id: user.institution_id,
    };

    // Generar token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    // Enviar respuesta con token
    res.status(200).json({
        mensaje: "Login exitoso",
        token,
        user: payload
    });

    res.json({
    mensaje: "Login exitoso",
    token: token,
    user: {
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        institution_id: user.institution_id,
    },
    });
} catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
}
});

// Logout (con JWT es más simple)
router.post("/logout", verificarToken, (req, res) => {
  // Con JWT, el logout se maneja principalmente en el frontend
  // eliminando el token del almacenamiento local
res.json({
    mensaje: "Logout exitoso",
    nota: "Elimina el token del almacenamiento local",
});
});

// Ruta protegida de ejemplo para verificar token
router.get("/profile", verificarToken, async (req, res) => {
try {
    const query =
    "SELECT user_id, full_name, national_id, email, role_id, institution_id FROM users WHERE user_id = ?";
    const [results] = await pool.query(query, [req.user.user_id]);

    if (results.length === 0) {
    return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json({
    mensaje: "Perfil obtenido correctamente",
    user: results[0],
    });
} catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
}
});

// Verificar si el token es válido
router.get("/verify-token", verificarToken, (req, res) => {
res.json({
    mensaje: "Token válido",
    user: req.user,
});
});

export default router;
