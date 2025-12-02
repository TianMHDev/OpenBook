/**
 * OpenBook Backend Server
 * Main application entry point for the OpenBook digital library platform
 * 
 * Features:
 * - RESTful API for book management
 * - User authentication with JWT
 * - Teacher-student assignment system
 * - Book progress tracking
 * - External API integration (OpenLibrary)
 * 
 * @author OpenBook Development Team
 * @version 1.0.0
 */

// Load environment variables and libraries
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/conexion_db.js";
import { sincronizarTodosLosGeneros } from "../api/sync_openlibrary.js";

// Import organized routes
import apiRoutes from "../routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../../frontend');

app.use(cors());
app.use(express.json());

// Configure static files - MUST come before routes
app.use('/frontend', express.static(frontendPath));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));
app.use('/styles', express.static(path.join(frontendPath, 'styles')));
app.use(express.static(frontendPath));

// ============================================================================
// API ROUTES
// ============================================================================

// Mount all API routes under /api
app.use('/api', apiRoutes);

// ============================================================================
// FRONTEND ROUTES (SERVE HTML PAGES)
// ============================================================================

// Main route - redirect based on authentication
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/index.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/login.html'));
});

// Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/register.html'));
});

// Protected routes - Teacher Dashboard
app.get('/teacher-dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/teacher-dashboard.html'));
});

app.get('/teacher-catalog', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/teacher-catalog.html'));
});

app.get('/teacher-favs', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/teacher-favs.html'));
});

app.get('/teacher-mystudents', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/teacher-mystudents.html'));
});

// Protected routes - Student Dashboard
app.get('/student-dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/student-dashboard.html'));
});

app.get('/student-catalog', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/student-catalog.html'));
});

app.get('/student-favs', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/student-favs.html'));
});

app.get('/students-mybooks', (req, res) => {
    res.sendFile(path.join(frontendPath, 'views/students-mybooks.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// API 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API Endpoint ${req.method} ${req.originalUrl} no encontrado`
    });
});

// Catch-all for undefined routes - serve main page
app.use('*', (req, res) => {
    // Don't serve index.html for static file requests
    if (req.path.includes('.')) {
        return res.status(404).json({
            success: false,
            message: `Archivo no encontrado: ${req.path}`
        });
    }
    res.sendFile(path.join(frontendPath, 'views/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error("❌ Error no manejado:", error);
    res.status(500).json({
        success: false,
        message: "Error interno del servidor"
    });
});

// ============================================================================
// START SERVER
// ============================================================================

// Start the server and synchronization
// Server startup logic moved to server.js

export default app;