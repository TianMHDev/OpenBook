import express from 'express';
import authRoutes from './auth.routes.js';
import teacherRoutes from './teacher.routes.js';
import bookRoutes from './book.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/teacher', teacherRoutes);
router.use('/books', bookRoutes);
router.use('/users', userRoutes);

export default router;
