const Item = require('../models/itemModel');
const Budget = require('../models/budgetModel');
const Category = require('../models/categoryModel');
const { generateAlerts } = require('../utils/alerts');
const { generateTipsForUser } = require('../utils/tipGenerator');
const { success, fail } = require('../utils/responseHandler');

exports.createItem = async (req, res) => {
  try {
    const { budgetId, name, price, quantity = 1, categoryId, isEssential, notes, purchaseDate } = req.body;

    const budget = await Budget.findOne({ _id: budgetId, userId: req.user._id });
    if (!budget || !budget.isActive) return fail(res, new Error('Invalid or inactive budget'), 400);

    const category = await Category.findById(categoryId);
    if (!category) return fail(res, new Error('Category not found'), 404);

    const totalPrice = price * quantity;
    if (budget.currentSpent + totalPrice > budget.totalLimit) {
      return fail(res, new Error('Item exceeds total budget limit'), 400);
    }

    const item = await Item.create({
      userId: req.user._id,
      budgetId,
      name,
      price,
      quantity,
      categoryId,
      isEssential,
      notes,
      purchaseDate: purchaseDate || new Date()
    });

    await item.populate('categoryId');

    const updatedBudget = await Budget.findById(budgetId);

    const alerts = generateAlerts(updatedBudget.percentageSpent);
    const tips = await generateTipsForUser(req.user._id, budgetId);

    success(res, {
      data: item,
      budget: {
        currentSpent: updatedBudget.currentSpent,
        totalLimit: updatedBudget.totalLimit,
        remainingBudget: updatedBudget.remainingBudget,
        percentageSpent: updatedBudget.percentageSpent
      },
      alerts,
      tips: tips.slice(0, 3)
    }, 'Item created');
  } catch (error) {
    fail(res, error);
  }
};

exports.getItems = async (req, res) => {
  try {
    const { budgetId } = req.query;

    const query = { userId: req.user._id };
    if (budgetId) query.budgetId = budgetId;

    const items = await Item.find(query).populate('categoryId').sort('-purchaseDate');

    success(res, { data: items });
  } catch (error) {
    fail(res, error);
  }
};

exports.getItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('categoryId');

    if (!item) return fail(res, new Error('Item not found'), 404);
    success(res, { data: item });
  } catch (error) {
    fail(res, error);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { name, price, quantity, categoryId, isEssential, notes, purchaseDate } = req.body;

    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) return fail(res, new Error('Item not found'), 404);

    if (name !== undefined) item.name = name;
    if (price !== undefined) item.price = price;
    if (quantity !== undefined) item.quantity = quantity;
    if (categoryId !== undefined) item.categoryId = categoryId;
    if (isEssential !== undefined) item.isEssential = isEssential;
    if (notes !== undefined) item.notes = notes;
    if (purchaseDate !== undefined) item.purchaseDate = new Date(purchaseDate);

    await item.save();
    await item.populate('categoryId');

    const updatedBudget = await Budget.findById(item.budgetId);

    const alerts = generateAlerts(updatedBudget.percentageSpent);
    const tips = await generateTipsForUser(req.user._id, updatedBudget._id);

    success(res, {
      data: item,
      budget: {
        currentSpent: updatedBudget.currentSpent,
        totalLimit: updatedBudget.totalLimit,
        remainingBudget: updatedBudget.remainingBudget,
        percentageSpent: updatedBudget.percentageSpent
      },
      alerts,
      tips: tips.slice(0, 3)
    }, 'Item updated');
  } catch (error) {
    fail(res, error);
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!item) return fail(res, new Error('Item not found'), 404);

    const updatedBudget = await Budget.findById(item.budgetId);

    const alerts = generateAlerts(updatedBudget.percentageSpent);
    const tips = await generateTipsForUser(req.user._id, updatedBudget._id);

    success(res, {
      data: item,
      budget: {
        currentSpent: updatedBudget.currentSpent,
        totalLimit: updatedBudget.totalLimit,
        remainingBudget: updatedBudget.remainingBudget,
        percentageSpent: updatedBudget.percentageSpent
      },
      alerts,
      tips: tips.slice(0, 3)
    }, 'Item deleted');
  } catch (error) {
    fail(res, error);
  }
};
