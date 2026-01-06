import express from 'express';
import { initializeDatabase } from '../database/init_db.js';

const router = express.Router();

router.get('/reset-db-secret-123', async (req, res) => {
    try {
        console.log("⚠️ Manual DB Reset triggered via API");
        await initializeDatabase();
        res.json({ success: true, message: "Base de datos reiniciada correctamente." });
    } catch (error) {
        console.error("❌ Reset Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
