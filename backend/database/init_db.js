import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    let config;

    if (process.env.DATABASE_URL) {
        console.log("🔗 Usando DATABASE_URL");
        const dbUrl = new URL(process.env.DATABASE_URL);
        config = {
            host: dbUrl.hostname,
            user: dbUrl.username,
            password: dbUrl.password,
            database: dbUrl.pathname.slice(1),
            port: Number(dbUrl.port) || 3306,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true // Importante para ejecutar el script completo
        };
    } else {
        console.log("🔗 Usando variables de entorno individuales");
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
        console.log("✅ Conectado a la base de datos");
        
        const scriptPath = path.join(__dirname, '../../docs/script.sql');
        let sql = fs.readFileSync(scriptPath, 'utf8');

        // Limpiar el script para que funcione en Aiven/Render (eliminando creación de DB y delimitadores)
        sql = sql.replace(/DROP DATABASE IF EXISTS openbook;/g, '')
                 .replace(/CREATE DATABASE openbook;/g, '')
                 .replace(/USE openbook;/g, '')
                 .replace(/DELIMITER \/\//g, '')
                 .replace(/DELIMITER ;/g, '')
                 .replace(/END\/\//g, 'END;');

        console.log("🚀 Ejecutando script de creación de tablas...");
        await connection.query(sql);
        console.log("✅ Tablas creadas exitosamente.");
        
        console.log("ℹ️ Nota: Los datos de prueba (libros) se sincronizarán cuando inicies el servidor.");

    } catch (error) {
        console.error("❌ Error inicializando la base de datos:", error);
    } finally {
        if (connection) await connection.end();
    }
}

initDB();
