const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Budget name is required'],
    trim: true
  },
  totalLimit: {
    type: Number,
    required: [true, 'Total budget limit is required'],
    min: [0, 'Budget limit cannot be negative']
  },
  period: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  categories: [{
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    limit: {
      type: Number,
      min: 0
    }
  }],
  currentSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate remaining budget
budgetSchema.virtual('remainingBudget').get(function() {
  return this.totalLimit - this.currentSpent;
});

// Calculate percentage spent
budgetSchema.virtual('percentageSpent').get(function() {
  return this.totalLimit > 0 ? (this.currentSpent / this.totalLimit) * 100 : 0;
});

// Ensure virtual fields are included in JSON
budgetSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Budget', budgetSchema);