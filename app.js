const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const viewRoutes = require('./routes/viewRoutes');
const authRoutes = require('./routes/authRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const itemRoutes = require('./routes/itemRoutes');
const tipsRoutes = require('./routes/tipsRoutes');
const exportRoutes = require('./routes/exportRoutes');
//const historyRoutes = require('./routes/historyRoutes');

const app = express();

// Middleware  
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'pug');
app.set('views',path.join(__dirname, 'views'));


// View Routes
app.use('/', viewRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/export', exportRoutes);
//app.use('/api/history', historyRoutes);

module.exports = app;