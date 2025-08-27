// middleware/guardian.js
// Guardian sencillo que verifica sesión en memoria
function guardian(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({ mensaje: 'No autorizado. Inicia sesión.' });
  }
}

module.exports = guardian;