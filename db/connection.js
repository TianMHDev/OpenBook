// db/connection.js
// Conexión básica a MySQL usando mysql2
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Qwe.123*',
  database: process.env.DB_NAME || 'openbook'
});

connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la BD:', err);
    return;
  }
  console.log('Conectado a la BD MySQL');
});

module.exports = connection;