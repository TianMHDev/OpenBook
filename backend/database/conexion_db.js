import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // Loading Environment Variables from the .env File

// Creating a MySQL Database Connection Pool
// Using Environment Variables for Configuration
// Make sure the environment variables are defined in your .env file
// and that the .env file is in the project root.

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection(); // get connection
    console.log('✅ Connection to MySQL established');
    connection.release(); // release connection
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error.message);
  }
};

checkConnection();