const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Category = require('../models/categoryModel');

// All routes require authentication
router.use(protect);

// Get all categories for user (including system categories)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.getUserCategories(req.user._id);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Create custom category
router.post('/', async (req, res) => {
  try {
    const { name, icon, color, parentId } = req.body;

    // Check if user already has this category
    const existing = await Category.findOne({
      name: name,
      userId: req.user._id
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a category with this name'
      });
    }

    const category = await Category.create({
      name,
      icon: icon || '📦',
      color: color || '#6c757d',
      userId: req.user._id,
      parentId,
      isSystem: false
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;