const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isEssential: {
    type: Boolean,
    default: false
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict'],
    default: 'synced'
  }
});

// Calculate total price
itemSchema.virtual('totalPrice').get(function() {
  return this.price * this.quantity;
});

// Create compound index for performance
itemSchema.index({ budgetId: 1, userId: 1, categoryId: 1 });
itemSchema.index({ purchaseDate: -1 });

// Ensure virtual fields are included in JSON
itemSchema.set('toJSON', { virtuals: true });

// Middleware to update budget's currentSpent when item is saved
itemSchema.post('save', async function() {
  const Budget = mongoose.model('Budget');
  const budget = await Budget.findById(this.budgetId);
  if (budget) {
    const Item = mongoose.model('Item');
    const items = await Item.find({ budgetId: this.budgetId });
    const totalSpent = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    budget.currentSpent = totalSpent;
    await budget.save();
  }
});

// Middleware to update budget when item is removed
itemSchema.post('remove', async function() {
  const Budget = mongoose.model('Budget');
  const budget = await Budget.findById(this.budgetId);
  if (budget) {
    const Item = mongoose.model('Item');
    const items = await Item.find({ budgetId: this.budgetId });
    const totalSpent = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    budget.currentSpent = totalSpent;
    await budget.save();
  }
});

module.exports = mongoose.model('Item', itemSchema);