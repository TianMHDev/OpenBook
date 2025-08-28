import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // Cargar variables de entorno desde el archivo .env

// Crear un pool de conexiones a la base de datos MySQL 
// Utilizando las variables de entorno para la configuración
// Asegúrate de que las variables de entorno estén definidas en tu archivo .env
// y que el archivo .env esté en la raíz del proyecto.

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection(); // obtener conexión
    console.log('✅ Connection to MySQL established');
    connection.release(); // liberar conexión
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error.message);
  }
};

checkConnection();