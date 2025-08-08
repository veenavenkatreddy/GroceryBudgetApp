const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');
const Category = require('../models/categoryModel');
const tipGenerator = require('../utils/tipGenerator');
const User = require('../models/userModel');

// Public home page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Welcome to CartWise',
    activeTab: '',
    user: {}
  });
});

// Dashboard - protected
router.get('/dashboard', protect, async (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    activeTab: 'dashboard',
    user: req.user
  });
});

// Budgets - protected
router.get('/budgets', protect, async (req, res) => {
  res.render('budgets', {
    title: 'Budgets',
    activeTab: 'budgets',
    user: req.user
  });
});

// Items - protected
router.get('/items', protect, async (req, res) => {
  res.render('items', {
    title: 'Items',
    activeTab: 'items',
    user: req.user
  });
});

// Tips - protected
router.get('/tips', protect, async (req, res) => {
  res.render('tips', {
    title: 'Tips',
    activeTab: 'tips',
    user: req.user
  });
});

// Export - protected
router.get('/export', protect, async (req, res) => {
  res.render('export', {
    title: 'Export Data',
    activeTab: 'export',
    user: req.user
  });
});

// Profile - protected
router.get('/profile', protect, async (req, res) => {
  res.render('profile', {
    title: 'Profile',
    activeTab: '',
    user: req.user
  });
});

module.exports = router;
