import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // Loading Environment Variables from the .env File

// Creating a MySQL Database Connection Pool
// Using Environment Variables for Configuration
// Make sure the environment variables are defined in your .env file
// and that the .env file is in the project root.

let connectionConfig;

if (process.env.DATABASE_URL) {
  console.log("🔗 Using DATABASE_URL for connection");
  const dbUrl = new URL(process.env.DATABASE_URL);
  connectionConfig = {
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    port: Number(dbUrl.port) || 3306,
    ssl: { rejectUnauthorized: false }, // Aiven requires SSL
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  console.log("🔗 Using separate environment variables for connection");
  connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }
}

export const pool = mysql.createPool(connectionConfig);

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