const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  },
  icon: {
    type: String,
    default: '📦'
  },
  color: {
    type: String,
    default: '#6c757d',
    match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color']
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for user categories
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

// Static method to create default categories
categorySchema.statics.createDefaultCategories = async function() {
  const defaultCategories = [
    { name: 'Produce', icon: '🥬', color: '#28a745', isSystem: true, order: 1 },
    { name: 'Dairy', icon: '🥛', color: '#17a2b8', isSystem: true, order: 2 },
    { name: 'Meat', icon: '🥩', color: '#dc3545', isSystem: true, order: 3 },
    { name: 'Bakery', icon: '🍞', color: '#ffc107', isSystem: true, order: 4 },
    { name: 'Frozen', icon: '🧊', color: '#6c757d', isSystem: true, order: 5 },
    { name: 'Pantry', icon: '🥫', color: '#fd7e14', isSystem: true, order: 6 },
    { name: 'Beverages', icon: '☕', color: '#795548', isSystem: true, order: 7 },
    { name: 'Snacks', icon: '🍿', color: '#e91e63', isSystem: true, order: 8 },
    { name: 'Household', icon: '🧹', color: '#9c27b0', isSystem: true, order: 9 },
    { name: 'Personal Care', icon: '🧼', color: '#673ab7', isSystem: true, order: 10 },
    { name: 'Other', icon: '📦', color: '#6c757d', isSystem: true, order: 11 }
  ];

  try {
    for (const category of defaultCategories) {
      await this.findOneAndUpdate(
        { name: category.name, isSystem: true },
        category,
        { upsert: true, new: true }
      );
    }
    console.log('Default categories created successfully');
  } catch (error) {
    console.error('Error creating default categories:', error);
  }
};

// Method to get categories for a user (including system categories)
categorySchema.statics.getUserCategories = async function(userId) {
  return await this.find({
    $or: [
      { isSystem: true },
      { userId: userId }
    ]
  }).sort('order name');
};

module.exports = mongoose.model('Category', categorySchema);