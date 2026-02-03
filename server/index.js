/**
 * @fileoverview King's POS API Server
 * 
 * Entry point for the Express/MongoDB backend API
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { connectRedis, setupRedisShutdown } from './config/redis.js';
import { initializeSocket } from './socket/index.js';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import auth2faRoutes from './routes/auth2fa.js';
import employeesRoutes from './routes/employees.js';
import shiftsRoutes from './routes/shifts.js';
import productsRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import customersRoutes from './routes/customers.js';
import creditsRoutes from './routes/credits.js';
import syncRoutes from './routes/sync.js';
import auditRoutes from './routes/audit.js';
import conflictsRoutes from './routes/conflicts.js';
import cacheRoutes from './routes/cache.js';
import indexRoutes from './routes/indexes.js';
import analyticsRoutes from './routes/analytics.js';
import storesRoutes from './routes/stores.js';
import loyaltyRoutes from './routes/loyalty.js';
import exportRoutes from './routes/export.js';
import inventoryRoutes from './routes/inventory.js';
import organizationsRoutes from './routes/organizations.js';
import reportsRoutes from './routes/reports.js';
import pluginsRoutes from './routes/plugins.js';
import workflowsRoutes from './routes/workflows.js';
import customerPortalRoutes from './routes/customerPortal.js';
import notificationsRoutes from './routes/notifications.js';

// Import middleware
import { auditLogger } from './middleware/auditLogger.js';
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Attach io to app for use in routes
app.set('io', io);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded logos)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Audit logging middleware (after auth, before routes)
app.use(auditLogger({
    logResponse: false,
    excludePaths: ['/health', '/api/auth/me', '/api/sync/pull']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/2fa', auth2faRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/indexes', indexRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/customer-portal', customerPortalRoutes);
app.use('/api/notifications', notificationsRoutes);

// 404 handler
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

// Set up global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Start server
const startServer = async () => {
    try {
        logger.info('Starting King\'s POS API Server...');

        // Connect to MongoDB
        await connectDB();
        logger.info('Database connected successfully');

        // Connect to Redis (optional - server works without it)
        await connectRedis();

        // Set up Redis shutdown handlers
        setupRedisShutdown();

        // Start listening
        httpServer.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════╗
║     King's POS API Server Running        ║
╠══════════════════════════════════════════╣
║  Port: ${PORT}                              ║
║  Mode: ${process.env.NODE_ENV || 'development'}                     ║
║  Health: http://localhost:${PORT}/health    ║
║  Socket.io: Enabled                      ║
╚══════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
