// Cargar variables de entorno y librerías
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { pool } from "../database/conexion_db.js";
import { sincronizarTodosLosGeneros } from "../api/sync_openlibrary.js";
import authRoutes from "../services/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_aqui";

// Configuración middleware
app.use(cors());
app.use(express.json());

// Configurar archivos estáticos
app.use(express.static('frontend'));
app.use('/assets', express.static('frontend/assets'));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile('frontend/views/index.html', { root: '.' });
});

// ==================== FUNCIONES AUXILIARES ====================

// Manejar errores de base de datos
function manejarError(error, res, mensaje = "Error en el servidor") {
    console.error("❌", mensaje, error.message);
    res.status(500).json({
        success: false,
        message: mensaje,
        error: error.message
    });
}

// Respuesta exitosa
function respuestaOK(res, data, mensaje = "Operación exitosa") {
    res.status(200).json({
        success: true,
        message: mensaje,
        data: data
    });
}

// Verificar token JWT (middleware)
export function verificarToken(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token requerido"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Token inválido"
        });
    }
}
app.use("/api/auth", authRoutes);
// ==================== LIBROS PÚBLICOS ====================

// 📚 GET /api/books - Obtener libros con filtros y paginación
app.get('/api/books', async (req, res) => {
    try {
        const pagina = parseInt(req.query.page) || 1;
        const limite = parseInt(req.query.limit) || 20;
        const busqueda = req.query.search || '';
        const genero = req.query.genre || '';
        const año = req.query.year || '';
        
        const offset = (pagina - 1) * limite;

        let query = `
            SELECT 
                b.book_id,
                b.title,
                b.author,
                b.description,
                b.cover_url,
                b.published_year,
                GROUP_CONCAT(g.genre_name SEPARATOR ', ') as genres,
                COALESCE(bm.views, 0) as views,
                COALESCE(bm.likes, 0) as likes,
                COALESCE(bm.favorites, 0) as favorites
            FROM books b
            LEFT JOIN books_genres bg ON b.book_id = bg.book_id
            LEFT JOIN genres g ON bg.genre_id = g.genre_id
            LEFT JOIN book_metrics bm ON b.book_id = bm.book_id
        `;
        
        let params = [];
        let conditions = [];

        if (busqueda) {
            conditions.push("(b.title LIKE ? OR b.author LIKE ?)");
            params.push(`%${busqueda}%`, `%${busqueda}%`);
        }

        if (genero) {
            conditions.push("g.genre_name = ?");
            params.push(genero);
        }

        if (año) {
            conditions.push("b.published_year = ?");
            params.push(año);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += `
            GROUP BY b.book_id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `;
        params.push(limite, offset);

        const [libros] = await pool.query(query, params);

        // Contar total
        let queryConteo = "SELECT COUNT(DISTINCT b.book_id) as total FROM books b";
        if (busqueda || genero || año) {
            queryConteo += " LEFT JOIN books_genres bg ON b.book_id = bg.book_id LEFT JOIN genres g ON bg.genre_id = g.genre_id";
            if (conditions.length > 0) {
                queryConteo += " WHERE " + conditions.join(" AND ");
            }
        }

        const [[{ total }]] = await pool.query(queryConteo, params.slice(0, -2));
        const totalPaginas = Math.ceil(total / limite);

        respuestaOK(res, {
            libros,
            paginacion: {
                paginaActual: pagina,
                totalPaginas,
                totalLibros: total,
                librosPorPagina: limite
            }
        });

    } catch (error) {
        manejarError(error, res, "Error al obtener libros");
    }
});

// 📖 GET /api/books/:id - Obtener libro específico y aumentar vistas
app.get('/api/books/:id', async (req, res) => {
    try {
        const bookId = req.params.id;

        // Obtener libro
        const query = `
            SELECT 
                b.book_id,
                b.title,
                b.author,
                b.description,
                b.cover_url,
                b.published_year,
                GROUP_CONCAT(g.genre_name SEPARATOR ', ') as genres,
                COALESCE(bm.views, 0) as views,
                COALESCE(bm.likes, 0) as likes,
                COALESCE(bm.favorites, 0) as favorites
            FROM books b
            LEFT JOIN books_genres bg ON b.book_id = bg.book_id
            LEFT JOIN genres g ON bg.genre_id = g.genre_id
            LEFT JOIN book_metrics bm ON b.book_id = bm.book_id
            WHERE b.book_id = ?
            GROUP BY b.book_id
        `;

        const [resultado] = await pool.query(query, [bookId]);

        if (resultado.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Libro no encontrado"
            });
        }

        // Aumentar contador de vistas
        await pool.query(`
            INSERT INTO book_metrics (book_id, views) VALUES (?, 1)
            ON DUPLICATE KEY UPDATE views = views + 1
        `, [bookId]);

        respuestaOK(res, resultado[0], "Libro encontrado");

    } catch (error) {
        manejarError(error, res, "Error al obtener el libro");
    }
});

// ==================== GÉNEROS ====================

// 🎭 GET /api/genres - Obtener todos los géneros
app.get('/api/genres', async (req, res) => {
    try {
        const [generos] = await pool.query(`
            SELECT 
                g.genre_id,
                g.genre_name,
                COUNT(bg.book_id) as total_books
            FROM genres g
            LEFT JOIN books_genres bg ON g.genre_id = bg.genre_id
            GROUP BY g.genre_id, g.genre_name
            HAVING total_books > 0
            ORDER BY g.genre_name ASC
        `);

        respuestaOK(res, generos, "Géneros obtenidos exitosamente");

    } catch (error) {
        manejarError(error, res, "Error al obtener géneros");
    }
});

// ==================== INTERACCIONES DE USUARIO (REQUIEREN LOGIN) ====================

// ❤️ POST /api/books/:id/like - Dar like a un libro
app.post('/api/books/:id/like', verificarToken, async (req, res) => {
    try {
        const bookId = req.params.id;
        const userId = req.user.user_id;

        // Verificar si ya dio like
        const [likeExistente] = await pool.query(
            "SELECT reaction_id FROM books_reactions WHERE user_id = ? AND book_id = ? AND reaction_type = 'like'",
            [userId, bookId]
        );

        if (likeExistente.length > 0) {
            // Quitar like
            await pool.query(
                "DELETE FROM books_reactions WHERE user_id = ? AND book_id = ? AND reaction_type = 'like'",
                [userId, bookId]
            );

            // Reducir contador
            await pool.query(`
                INSERT INTO book_metrics (book_id, likes) VALUES (?, 0)
                ON DUPLICATE KEY UPDATE likes = GREATEST(likes - 1, 0)
            `, [bookId]);

            respuestaOK(res, { liked: false }, "Like removido");
        } else {
            // Agregar like
            await pool.query(
                "INSERT INTO books_reactions (user_id, book_id, reaction_type) VALUES (?, ?, 'like')",
                [userId, bookId]
            );

            // Aumentar contador
            await pool.query(`
                INSERT INTO book_metrics (book_id, likes) VALUES (?, 1)
                ON DUPLICATE KEY UPDATE likes = likes + 1
            `, [bookId]);

            respuestaOK(res, { liked: true }, "Like agregado");
        }

    } catch (error) {
        manejarError(error, res, "Error al procesar like");
    }
});

// ⭐ POST /api/books/:id/favorite - Agregar/quitar de favoritos
app.post('/api/books/:id/favorite', verificarToken, async (req, res) => {
    try {
        const bookId = req.params.id;
        const userId = req.user.user_id;

        // Verificar si ya está en favoritos
        const [favoritoExistente] = await pool.query(
            "SELECT user_id FROM users_books WHERE user_id = ? AND book_id = ? AND status = 'favoritos'",
            [userId, bookId]
        );

        if (favoritoExistente.length > 0) {
            // Quitar de favoritos
            await pool.query(
                "DELETE FROM users_books WHERE user_id = ? AND book_id = ? AND status = 'favoritos'",
                [userId, bookId]
            );

            // Reducir contador
            await pool.query(`
                INSERT INTO book_metrics (book_id, favorites) VALUES (?, 0)
                ON DUPLICATE KEY UPDATE favorites = GREATEST(favorites - 1, 0)
            `, [bookId]);

            respuestaOK(res, { favorite: false }, "Removido de favoritos");
        } else {
            // Agregar a favoritos
            await pool.query(
                "INSERT INTO users_books (user_id, book_id, status) VALUES (?, ?, 'favoritos') ON DUPLICATE KEY UPDATE status = 'favoritos'",
                [userId, bookId]
            );

            // Aumentar contador
            await pool.query(`
                INSERT INTO book_metrics (book_id, favorites) VALUES (?, 1)
                ON DUPLICATE KEY UPDATE favorites = favorites + 1
            `, [bookId]);

            respuestaOK(res, { favorite: true }, "Agregado a favoritos");
        }

    } catch (error) {
        manejarError(error, res, "Error al procesar favorito");
    }
});

// 📚 GET /api/user/favorites - Obtener libros favoritos del usuario
app.get('/api/user/favorites', verificarToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [favoritos] = await pool.query(`
            SELECT 
                b.book_id,
                b.title,
                b.author,
                b.cover_url,
                b.published_year,
                ub.registered_at as fecha_favorito
            FROM users_books ub
            INNER JOIN books b ON ub.book_id = b.book_id
            WHERE ub.user_id = ? AND ub.status = 'favoritos'
            ORDER BY ub.registered_at DESC
        `, [userId]);

        respuestaOK(res, favoritos, "Favoritos obtenidos exitosamente");

    } catch (error) {
        manejarError(error, res, "Error al obtener favoritos");
    }
});

// 📊 GET /api/user/profile - Obtener perfil del usuario
app.get('/api/user/profile', verificarToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [[usuario]] = await pool.query(`
            SELECT 
                u.user_id,
                u.full_name,
                u.email,
                u.national_id,
                r.role_name,
                i.institution_name,
                u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            WHERE u.user_id = ?
        `, [userId]);

        // Contar estadísticas del usuario
        const [[stats]] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN ub.status = 'favoritos' THEN 1 END) as total_favoritos,
                COUNT(CASE WHEN br.reaction_type = 'like' THEN 1 END) as total_likes
            FROM users u
            LEFT JOIN users_books ub ON u.user_id = ub.user_id
            LEFT JOIN books_reactions br ON u.user_id = br.user_id
            WHERE u.user_id = ?
        `, [userId]);

        respuestaOK(res, {
            ...usuario,
            estadisticas: stats
        }, "Perfil obtenido exitosamente");

    } catch (error) {
        manejarError(error, res, "Error al obtener perfil");
    }
});

// ==================== ESTADÍSTICAS GENERALES ====================

// 📊 GET /api/stats - Estadísticas generales de la plataforma
app.get('/api/stats', async (req, res) => {
    try {
        // Estadísticas básicas
        const [[stats]] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM books) as total_libros,
                (SELECT COUNT(*) FROM users) as total_usuarios,
                (SELECT COUNT(*) FROM genres) as total_generos,
                (SELECT COUNT(*) FROM books WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as libros_recientes
        `);

        // Top 5 libros más populares
        const [librosPopulares] = await pool.query(`
            SELECT 
                b.book_id,
                b.title,
                b.author,
                b.cover_url,
                COALESCE(bm.views, 0) as views,
                COALESCE(bm.likes, 0) as likes,
                COALESCE(bm.favorites, 0) as favorites
            FROM books b
            LEFT JOIN book_metrics bm ON b.book_id = bm.book_id
            ORDER BY (COALESCE(bm.views, 0) + COALESCE(bm.likes, 0) * 2 + COALESCE(bm.favorites, 0) * 3) DESC
            LIMIT 5
        `);

        // Géneros más populares
        const [generosPopulares] = await pool.query(`
            SELECT 
                g.genre_name,
                COUNT(bg.book_id) as total_libros
            FROM genres g
            LEFT JOIN books_genres bg ON g.genre_id = bg.genre_id
            GROUP BY g.genre_id, g.genre_name
            ORDER BY total_libros DESC
            LIMIT 5
        `);

        respuestaOK(res, {
            estadisticas: stats,
            librosPopulares,
            generosPopulares
        }, "Estadísticas obtenidas exitosamente");

    } catch (error) {
        manejarError(error, res, "Error al obtener estadísticas");
    }
});

// ==================== MANEJO DE ERRORES ====================

// Endpoint no encontrado
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} no encontrado`
    });
});

// Error global
app.use((error, req, res, next) => {
    console.error("❌ Error no manejado:", error);
    res.status(500).json({
        success: false,
        message: "Error interno del servidor"
    });
});

// ==================== INICIAR SERVIDOR ====================

// Iniciar el servidor y la sincronización
app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    
    // Verificar si la base de datos está vacía antes de sincronizar
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM books");
        if (rows[0].count === 0) {
            console.log("📚 La base de datos está vacía. Iniciando sincronización...");
            await sincronizarTodosLosGeneros();
        } else {
            console.log("✅ La base de datos ya tiene libros. No se necesita sincronización.");
        }
    } catch (error) {
        console.error("❌ Error al verificar la base de datos:", error.message);
    }
});

export default app;