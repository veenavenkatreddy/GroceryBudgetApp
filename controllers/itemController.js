const Item = require('../models/itemModel');
const Budget = require('../models/budgetModel');
const Category = require('../models/categoryModel');
const tipGenerator = require('../utils/tipGenerator');

// Create new item
exports.createItem = async (req, res) => {
  try {
    const { budgetId, name, price, quantity, categoryId, isEssential, notes, purchaseDate } = req.body;

    // Verify budget exists and belongs to user
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if budget is active
    if (!budget.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add items to inactive budget'
      });
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if adding this item will exceed budget
    const totalPrice = price * (quantity || 1);
    if (budget.currentSpent + totalPrice > budget.totalLimit) {
      return res.status(400).json({
        success: false,
        message: 'Adding this item will exceed your budget limit',
        data: {
          currentSpent: budget.currentSpent,
          budgetLimit: budget.totalLimit,
          itemCost: totalPrice,
          wouldExceedBy: (budget.currentSpent + totalPrice) - budget.totalLimit
        }
      });
    }

    // Check category limit if exists
    const categoryAllocation = budget.categories.find(
      cat => cat.categoryId.toString() === categoryId
    );
    
    if (categoryAllocation && categoryAllocation.limit) {
      const categoryItems = await Item.find({
        budgetId: budgetId,
        categoryId: categoryId
      });
      
      const categorySpent = categoryItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );

      if (categorySpent + totalPrice > categoryAllocation.limit) {
        return res.status(400).json({
          success: false,
          message: `Adding this item will exceed your ${category.name} category limit`,
          data: {
            categorySpent: categorySpent,
            categoryLimit: categoryAllocation.limit,
            itemCost: totalPrice,
            wouldExceedBy: (categorySpent + totalPrice) - categoryAllocation.limit
          }
        });
      }
    }

    // Create item
    const item = await Item.create({
      budgetId,
      userId: req.user._id,
      name,
      price,
      quantity: quantity || 1,
      categoryId,
      isEssential: isEssential || false,
      notes,
      purchaseDate: purchaseDate || Date.now()
    });

    await item.populate('categoryId');

    // Update budget's currentSpent (handled by item middleware)
    const updatedBudget = await Budget.findById(budgetId);
    
    // Generate spending alerts
    const alerts = [];
    const percentageSpent = updatedBudget.percentageSpent;
    
    // Check budget thresholds
    if (percentageSpent >= 90 && !alerts.length) {
      alerts.push({
        type: 'critical',
        message: 'Critical: You have used 90% or more of your budget!',
        percentage: percentageSpent
      });
    } else if (percentageSpent >= 75 && !alerts.length) {
      alerts.push({
        type: 'warning',
        message: 'Warning: You have used 75% of your budget',
        percentage: percentageSpent
      });
    } else if (percentageSpent >= 50 && !alerts.length) {
      alerts.push({
        type: 'info',
        message: 'Info: You have used 50% of your budget',
        percentage: percentageSpent
      });
    }
    
    // Check for category overspending
    if (categoryAllocation && categoryAllocation.limit) {
      const categoryItems = await Item.find({
        budgetId: budgetId,
        categoryId: categoryId
      });
      
      const categorySpent = categoryItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );
      
      const categoryPercentage = (categorySpent / categoryAllocation.limit) * 100;
      if (categoryPercentage >= 80) {
        alerts.push({
          type: 'warning',
          message: `You have used ${categoryPercentage.toFixed(0)}% of your ${category.name} budget`,
          category: category.name,
          percentage: categoryPercentage
        });
      }
    }
    
    // Generate contextual tips if spending is high
    let tips = [];
    if (percentageSpent >= 50) {
      tips = await tipGenerator.generateBudgetThresholdTips(budgetId);
    }

    res.status(201).json({
      success: true,
      data: item,
      budget: {
        currentSpent: updatedBudget.currentSpent,
        totalLimit: updatedBudget.totalLimit,
        remainingBudget: updatedBudget.remainingBudget,
        percentageSpent: updatedBudget.percentageSpent
      },
      alerts,
      tips: tips.slice(0, 3) // Limit to 3 tips
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all items
exports.getItems = async (req, res) => {
  try {
    const { budgetId, categoryId, isEssential, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };

    if (budgetId) query.budgetId = budgetId;
    if (categoryId) query.categoryId = categoryId;
    if (isEssential !== undefined) query.isEssential = isEssential === 'true';

    if (dateFrom || dateTo) {
      query.purchaseDate = {};
      if (dateFrom) query.purchaseDate.$gte = new Date(dateFrom);
      if (dateTo) query.purchaseDate.$lte = new Date(dateTo);
    }

    const items = await Item.find(query)
      .populate('categoryId')
      .populate('budgetId', 'name')
      .sort('-purchaseDate')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Item.countDocuments(query);

    // Calculate totals
    const allItems = await Item.find(query);
    const totalSpent = allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const essentialSpent = allItems
      .filter(item => item.isEssential)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      data: items,
      stats: {
        totalItems: total,
        totalSpent,
        essentialSpent,
        nonEssentialSpent: totalSpent - essentialSpent
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get single item
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('categoryId')
      .populate('budgetId', 'name');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const { name, price, quantity, categoryId, isEssential, notes } = req.body;

    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // If price or quantity changed, check budget limits
    if (price !== undefined || quantity !== undefined) {
      const newPrice = price !== undefined ? price : item.price;
      const newQuantity = quantity !== undefined ? quantity : item.quantity;
      const oldTotal = item.price * item.quantity;
      const newTotal = newPrice * newQuantity;
      const difference = newTotal - oldTotal;

      if (difference > 0) {
        const budget = await Budget.findById(item.budgetId);
        if (budget.currentSpent + difference > budget.totalLimit) {
          return res.status(400).json({
            success: false,
            message: 'Update will exceed budget limit',
            data: {
              currentSpent: budget.currentSpent,
              budgetLimit: budget.totalLimit,
              increase: difference,
              wouldExceedBy: (budget.currentSpent + difference) - budget.totalLimit
            }
          });
        }
      }
    }

    // Update fields
    if (name !== undefined) item.name = name;
    if (price !== undefined) item.price = price;
    if (quantity !== undefined) item.quantity = quantity;
    if (categoryId !== undefined) item.categoryId = categoryId;
    if (isEssential !== undefined) item.isEssential = isEssential;
    if (notes !== undefined) item.notes = notes;

    await item.save();
    await item.populate('categoryId');

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get running totals for budget
exports.getRunningTotals = async (req, res) => {
  try {
    const { budgetId } = req.params;

    // Verify budget belongs to user
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Get all items for the budget
    const items = await Item.find({ budgetId }).populate('categoryId');

    // Calculate category totals
    const categoryTotals = {};
    items.forEach(item => {
      const categoryName = item.categoryId.name;
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = {
          categoryId: item.categoryId._id,
          name: categoryName,
          spent: 0,
          itemCount: 0,
          essentialSpent: 0,
          nonEssentialSpent: 0
        };
      }
      
      const itemTotal = item.price * item.quantity;
      categoryTotals[categoryName].spent += itemTotal;
      categoryTotals[categoryName].itemCount += 1;
      
      if (item.isEssential) {
        categoryTotals[categoryName].essentialSpent += itemTotal;
      } else {
        categoryTotals[categoryName].nonEssentialSpent += itemTotal;
      }
    });

    // Add category limits if set
    budget.categories.forEach(cat => {
      const categoryName = Object.keys(categoryTotals).find(
        name => categoryTotals[name].categoryId.toString() === cat.categoryId.toString()
      );
      if (categoryName && cat.limit) {
        categoryTotals[categoryName].limit = cat.limit;
        categoryTotals[categoryName].remaining = cat.limit - categoryTotals[categoryName].spent;
        categoryTotals[categoryName].percentageUsed = 
          (categoryTotals[categoryName].spent / cat.limit) * 100;
      }
    });

    res.json({
      success: true,
      data: {
        budget: {
          id: budget._id,
          name: budget.name,
          totalLimit: budget.totalLimit,
          currentSpent: budget.currentSpent,
          remaining: budget.remainingBudget,
          percentageUsed: budget.percentageSpent
        },
        categoryBreakdown: Object.values(categoryTotals),
        summary: {
          totalItems: items.length,
          essentialItems: items.filter(i => i.isEssential).length,
          nonEssentialItems: items.filter(i => !i.isEssential).length,
          averageItemCost: items.length > 0 ? 
            budget.currentSpent / items.length : 0
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Batch create items
exports.batchCreateItems = async (req, res) => {
  try {
    const { budgetId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of items'
      });
    }

    // Verify budget
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Calculate total cost
    const totalCost = items.reduce((sum, item) => 
      sum + (item.price * (item.quantity || 1)), 0
    );

    if (budget.currentSpent + totalCost > budget.totalLimit) {
      return res.status(400).json({
        success: false,
        message: 'Batch will exceed budget limit',
        data: {
          currentSpent: budget.currentSpent,
          budgetLimit: budget.totalLimit,
          batchCost: totalCost,
          wouldExceedBy: (budget.currentSpent + totalCost) - budget.totalLimit
        }
      });
    }

    // Create items
    const createdItems = [];
    const errors = [];

    for (const itemData of items) {
      try {
        const item = await Item.create({
          ...itemData,
          budgetId,
          userId: req.user._id,
          quantity: itemData.quantity || 1,
          isEssential: itemData.isEssential || false,
          purchaseDate: itemData.purchaseDate || Date.now()
        });
        await item.populate('categoryId');
        createdItems.push(item);
      } catch (error) {
        errors.push({
          item: itemData,
          error: error.message
        });
      }
    }

    // Update budget manually to ensure it's current
    const updatedBudget = await Budget.findById(budgetId);
    const allItems = await Item.find({ budgetId: budgetId });
    const totalSpent = allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updatedBudget.currentSpent = totalSpent;
    await updatedBudget.save();

    res.status(201).json({
      success: true,
      data: createdItems,
      budget: {
        currentSpent: updatedBudget.currentSpent,
        totalLimit: updatedBudget.totalLimit,
        remainingBudget: updatedBudget.remainingBudget,
        percentageSpent: updatedBudget.percentageSpent
      },
      summary: {
        total: items.length,
        created: createdItems.length,
        failed: errors.length
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};