// server.js
// Servidor principal: express + session + rutas modularizadas
const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth.routes');
const guardian = require('./middleware/guardian');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Sesión en memoria (NO para producción)
app.use(session({
  secret: 'mi-secreto-change-me',
  resave: false,
  saveUninitialized: false
}));

// Rutas de autenticación
app.use('/auth', authRoutes);

// Ruta protegida con guardian
app.get('/perfil', guardian, (req, res) => {
  res.json({ mensaje: `Bienvenido ${req.session.user.username}` });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});