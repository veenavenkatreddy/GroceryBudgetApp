const express = require('express');
const router = express.Router();

// View routes (Pug rendering)
router.use('/', require('./viewRoutes'));

// API Routes
router.use('/api/auth', require('./authRoutes'));
router.use('/api/users', require('./authRoutes')); // Profile endpoints live here
router.use('/api/budgets', require('./budgetRoutes'));
router.use('/api/categories', require('./categoryRoutes'));
router.use('/api/items', require('./itemRoutes'));
router.use('/api/tips', require('./tipsRoutes'));
router.use('/api/exports', require('./exportRoutes'));
router.use('/api/history', require('./historyRoutes'));

module.exports = router;
