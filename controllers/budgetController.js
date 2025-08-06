const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');
const { generateTipsForUser } = require('../utils/tipGenerator');
const { success, fail } = require('../utils/responseHandler');

exports.createBudget = async (req, res) => {
  try {
    const { name, totalLimit, period, categories } = req.body;

    const existing = await Budget.findOne({ userId: req.user._id, isActive: true });
    if (existing) {
      existing.isActive = false;
      await existing.save();
    }

    const budget = await Budget.create({
      userId: req.user._id,
      name,
      totalLimit,
      period: {
        start: new Date(period.start),
        end: new Date(period.end)
      },
      categories: categories || []
    });

    await budget.populate('categories.categoryId');
    success(res, { data: budget }, 'Budget created');
  } catch (error) {
    fail(res, error);
  }
};

exports.getBudgets = async (req, res) => {
  try {
    const { active, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };
    if (active !== undefined) query.isActive = active === 'true';

    const budgets = await Budget.find(query)
      .populate('categories.categoryId')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Budget.countDocuments(query);
    success(res, {
      data: budgets,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    fail(res, error);
  }
};

exports.getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('categories.categoryId');

    if (!budget) return fail(res, new Error('Budget not found'), 404);

    // Generate spending alerts
    const alerts = [];
    const percentageSpent = budget.percentageSpent;
    
    // Check budget thresholds
    if (percentageSpent >= 90) {
      alerts.push({
        type: 'critical',
        message: 'Critical: You have used 90% or more of your budget!',
        percentage: percentageSpent
      });
    } else if (percentageSpent >= 75) {
      alerts.push({
        type: 'warning',
        message: 'Warning: You have used 75% of your budget',
        percentage: percentageSpent
      });
    } else if (percentageSpent >= 50) {
      alerts.push({
        type: 'info',
        message: 'Info: You have used 50% of your budget',
        percentage: percentageSpent
      });
    }
    
    // Generate tips based on spending
    let tips = [];
    if (percentageSpent >= 50) {
      tips = await tipGenerator.generateTipsForUser(req.user._id, budget._id);
    }

    success(res, {
      data: budget,
      alerts,
      tips: tips.slice(0, 3)
    });
  } catch (error) {
    fail(res, error);
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { name, totalLimit, categories, isActive } = req.body;

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) return fail(res, new Error('Budget not found'), 404);

    if (name !== undefined) budget.name = name;
    if (totalLimit !== undefined) budget.totalLimit = totalLimit;
    if (categories !== undefined) budget.categories = categories;
    if (isActive !== undefined) budget.isActive = isActive;

    await budget.save();
    await budget.populate('categories.categoryId');

    success(res, { data: budget }, 'Budget updated');
  } catch (error) {
    fail(res, error);
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) return fail(res, new Error('Budget not found'), 404);

    const itemCount = await Item.countDocuments({ budgetId: budget._id });
    if (itemCount > 0)
      return fail(res, new Error('Delete all items before removing budget'), 400);

    await budget.deleteOne();
    success(res, {}, 'Budget deleted');
  } catch (error) {
    fail(res, error);
  }
};

// Get budget history
exports.getBudgetHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { 
      userId: req.user._id,
      isActive: false
    };

    if (startDate || endDate) {
      query['period.start'] = {};
      if (startDate) query['period.start'].$gte = new Date(startDate);
      if (endDate) query['period.start'].$lte = new Date(endDate);
    }

    const budgets = await Budget.find(query)
      .populate('categories.categoryId')
      .sort('-period.start');

    // Calculate statistics
    const stats = {
      totalBudgets: budgets.length,
      totalSpent: budgets.reduce((sum, b) => sum + b.currentSpent, 0),
      totalLimit: budgets.reduce((sum, b) => sum + b.totalLimit, 0),
      averageSpent: budgets.length > 0 ? 
        budgets.reduce((sum, b) => sum + b.currentSpent, 0) / budgets.length : 0
    };

    success(res, { data: budgets });
  } catch (error) {
    fail(res, error);
  }
};


exports.getActiveBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      userId: req.user._id,
      isActive: true,
      'period.start': { $lte: new Date() },
      'period.end': { $gte: new Date() }
    }).populate('categories.categoryId');

    success(res, { data: budget });
  } catch (error) {
    fail(res, error);
  }
};

exports.updateCategoryAllocation = async (req, res) => {
  try {
    const { categories } = req.body;

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) return fail(res, new Error('Budget not found'), 404);

    const total = categories.reduce((sum, cat) => sum + (cat.limit || 0), 0);
    if (total > budget.totalLimit)
      return fail(res, new Error('Category limits exceed budget total'), 400);

    budget.categories = categories;
    await budget.save();
    await budget.populate('categories.categoryId');

    success(res, { data: budget }, 'Category limits updated');
  } catch (error) {
    fail(res, error);
  }
};
