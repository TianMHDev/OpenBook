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
        
        // 1. Check if tables already exist
        const [rows] = await connection.query("SHOW TABLES LIKE 'users'");
        let tablasExisten = rows.length > 0;

        if (tablasExisten) {
            console.log("✅ La base de datos ya está inicializada. No se realizarán cambios estructurales.");
        } else {
            console.log("🆕 Base de datos nueva detectada. Iniciando creación de tablas...");
            const scriptPath = path.join(__dirname, '../../docs/script.sql');
            let sql = fs.readFileSync(scriptPath, 'utf8');

            // Clean up script
            sql = sql.replace(/DROP DATABASE IF EXISTS openbook;/g, '')
                     .replace(/CREATE DATABASE openbook;/g, '')
                     .replace(/USE openbook;/g, '')
                     .replace(/DELIMITER \/\//g, '')
                     .replace(/DELIMITER ;/g, '')
                     .replace(/END\/\//g, 'END;')
                     .replace(/"/g, "'");

            await connection.query(sql);
            console.log("✅ Tablas creadas exitosamente.");
        }
        
        // 2. Load test data (users) ONLY if table is empty
        if (userRows[0].count === 0) {
             console.log("🌱 Insertando datos de prueba (usuarios)...");
             const dataScriptPath = path.join(__dirname, '../../docs/data_users.sql');
             let dataSql = fs.readFileSync(dataScriptPath, 'utf8');
             
             // Clean data script just in case
             dataSql = dataSql.replace(/"/g, "'");

             try {
                await connection.query(dataSql);
                console.log("✅ Datos de prueba insertados exitosamente.");
             } catch (dataError) {
                console.warn("⚠️ Advertencia insertando datos de prueba:", dataError.message);
                console.warn("ℹ️ Es posible que algunos datos (asignaciones de libros) fallen si los libros no se han sincronizado aún. Los usuarios deberían haberse creado.");
             }
        }
        console.log("✅ Tablas y datos semilla creados exitosamente.");

    } catch (error) {
        console.error("❌ Error inicializando la base de datos:", error);
        // Don't throw to allow server to try starting anyway
    } finally {
        if (connection) await connection.end();
    }
}
