const Tips = require('../models/tipsModel');
const tipGenerator = require('../utils/tipGenerator');
const { success, fail } = require('../utils/responseHandler');

// Generate dynamic tips
exports.generateTips = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const tips = await tipGenerator.generateTipsForUser(req.user._id, budgetId);

    success(res, { count: tips.length, tips });
  } catch (error) {
    fail(res, error);
  }
};

// Get all static tips
exports.getTips = async (req, res) => {
  try {
    const { category, triggerType, tags, limit = 5 } = req.query;

    const filters = {
      category,
      triggerType,
      tags: tags ? tags.split(',') : undefined,
      limit: parseInt(limit)
    };

    const tips = await Tips.getRelevantTips(filters);
    success(res, { count: tips.length, tips });
  } catch (error) {
    fail(res, error);
  }
};

exports.markTipHelpful = async (req, res) => {
  try {
    const tip = await Tips.findById(req.params.id);
    if (!tip) return fail(res, new Error('Tip not found'), 404);

    await tip.incrementHelpfulCount();
    success(res, { helpfulCount: tip.helpfulCount }, 'Marked helpful');
  } catch (error) {
    fail(res, error);
  }
};

exports.analyzeSpending = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const patterns = await tipGenerator.analyzeSpendingPatterns(req.user._id, budgetId);

    success(res, { patterns });
  } catch (error) {
    fail(res, error);
  }
};

exports.getThresholdTips = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const tips = await tipGenerator.generateBudgetThresholdTips(budgetId);

    success(res, { count: tips.length, tips });
  } catch (error) {
    fail(res, error);
  }
};

exports.getSeasonalTips = async (req, res) => {
  try {
    const tips = await tipGenerator.getSeasonalTips();
    success(res, { count: tips.length, tips });
  } catch (error) {
    fail(res, error);
  }
};

exports.initializeTips = async (req, res) => {
  try {
    await Tips.createDefaultTips();
    success(res, {}, 'Default tips initialized');
  } catch (error) {
    fail(res, error);
  }
};
