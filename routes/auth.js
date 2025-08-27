// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Registro (sin cifrar - solo para ejemplo de principiante)
// Registro solo para estudiantes, fuerza el rol y valida el correo
router.post('/register', (req, res) => {
  const { full_name, national_id, email, password, institution_id } = req.body;
  if (!full_name || !national_id || !email || !password || !institution_id) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }
  // Validar correo de estudiante
  if (!email.endsWith('@estudiante.edu')) {
    return res.status(400).json({ mensaje: 'El correo debe terminar en @estudiante.edu' });
  }
  // Buscar el role_id de estudiante
  const roleQuery = 'SELECT role_id FROM roles WHERE role_name = ? LIMIT 1';
  db.query(roleQuery, ['estudiante'], (err, roleResults) => {
    if (err || roleResults.length === 0) {
      console.error('Error obteniendo role_id:', err);
      return res.status(500).json({ mensaje: 'Error en el servidor (rol)' });
    }
    const role_id = roleResults[0].role_id;
    const query = 'INSERT INTO users (full_name, national_id, email, password, role_id, institution_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [full_name, national_id, email, password, role_id, institution_id], (err, result) => {
      if (err) {
        console.error('Error en el registro:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ mensaje: 'El usuario ya existe' });
        }
        return res.status(500).json({ mensaje: 'Error en el servidor' });
      }
      res.json({ mensaje: 'Usuario registrado correctamente' });
    });
  });
});

// Login (comprobación simple)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }
  // Validar correo de estudiante
  if (!email.endsWith('@estudiante.edu')) {
    return res.status(400).json({ mensaje: 'Solo pueden iniciar sesión los estudiantes con correo @estudiante.edu' });
  }
  const query = 'SELECT user_id, email FROM users WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ mensaje: 'Error en el servidor' });
    }
    if (results.length === 0) {
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }
    // Guardamos al usuario en la sesión
    req.session.user = { user_id: results[0].user_id, email: results[0].email };
    res.json({ mensaje: 'Login exitoso' });
  });
});

// Logout sencillo
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir sesión:', err);
      return res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Logout exitoso' });
  });
});

module.exports = router;