import app from './backend/app/index.js';
import { pool } from './backend/database/conexion_db.js';
import { sincronizarTodosLosGeneros } from './backend/api/sync_openlibrary.js';
import { initializeDatabase } from './backend/database/init_db.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

// Initialize DB before starting server
console.log("⏳ Checking database status...");
await initializeDatabase();

app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: frontend/`);
    console.log(`🔐 Protected routes configured by roles`);
    console.log(`📚 API endpoints available at: /api/*`);
    
    // Check if the database is empty before synchronizing books
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM books");
        if (rows[0].count === 0) {
            console.log("📚 Books table empty. Starting synchronization...");
            await sincronizarTodosLosGeneros();
        } else {
            console.log("✅ Books already synced. No synchronization needed.");
        }
    } catch (error) {
        console.error("❌ Error checking books:", error.message);
    }
});
