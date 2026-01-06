import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
    let config;

    if (process.env.DATABASE_URL) {
        const dbUrl = new URL(process.env.DATABASE_URL);
        config = {
            host: dbUrl.hostname,
            user: dbUrl.username,
            password: dbUrl.password,
            database: dbUrl.pathname.slice(1),
            port: Number(dbUrl.port) || 3306,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true
        };
    } else {
        config = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true,
            ssl: (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : undefined
        };
    }

    let connection;
    try {
        connection = await mysql.createConnection(config);
        
        // 1. Check if tables already exist to avoid overwriting
        const [rows] = await connection.query("SHOW TABLES LIKE 'users'");
        if (rows.length > 0) {
            console.log("✅ La base de datos ya está inicializada (tablas encontradas).");
            return; 
        }

        console.log("🆕 Base de datos vacía detectada. Iniciando creación de tablas...");
        
        const scriptPath = path.join(__dirname, '../../docs/script.sql');
        let sql = fs.readFileSync(scriptPath, 'utf8');

        // Clean up script
        sql = sql.replace(/DROP DATABASE IF EXISTS openbook;/g, '')
                 .replace(/CREATE DATABASE openbook;/g, '')
                 .replace(/USE openbook;/g, '')
                 .replace(/DELIMITER \/\//g, '')
                 .replace(/DELIMITER ;/g, '')
                 .replace(/END\/\//g, 'END;');

        await connection.query(sql);
        console.log("✅ Tablas y datos semilla creados exitosamente.");

    } catch (error) {
        console.error("❌ Error inicializando la base de datos:", error);
        // Don't throw to allow server to try starting anyway
    } finally {
        if (connection) await connection.end();
    }
}
