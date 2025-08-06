const historyTracker = require('../utils/historyTracker');
const Audit = require('../models/auditModel');

// Get user activity audit trail
exports.getUserActivity = async (req, res) => {
  try {
    const { startDate, endDate, action, entityType, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const options = {
      startDate,
      endDate,
      action,
      entityType,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const activity = await historyTracker.getUserAuditTrail(userId, options);

    res.status(200).json({
      success: true,
      ...activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity history',
      error: error.message
    });
  }
};

// Get budget-specific audit trail
exports.getBudgetAuditTrail = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const userId = req.user._id;

    const audits = await historyTracker.getBudgetAuditTrail(budgetId, userId);

    res.status(200).json({
      success: true,
      count: audits.length,
      audits
    });
  } catch (error) {
    console.error('Error fetching budget audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget history',
      error: error.message
    });
  }
};

// Get spending trends
exports.getSpendingTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;

    const trends = await historyTracker.analyzeSpendingTrends(userId, parseInt(days));

    res.status(200).json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Error analyzing spending trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing trends',
      error: error.message
    });
  }
};

// Compare budget periods
exports.comparePeriods = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const userId = req.user._id;

    const comparison = await historyTracker.comparePeriods(userId, budgetId);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Unable to compare periods'
      });
    }

    res.status(200).json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Error comparing periods:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing budget periods',
      error: error.message
    });
  }
};

// Get activity summary for dashboard
exports.getActivitySummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user._id;

    const summary = await historyTracker.getActivitySummary(userId, parseInt(days));

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting activity summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity summary',
      error: error.message
    });
  }
};

// Get system-wide activity summary (admin only - add role check in production)
exports.getSystemActivity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const options = {
      startDate,
      endDate
    };

    const summary = await Audit.getActivitySummary(options);

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting system activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system activity',
      error: error.message
    });
  }
};

// Clean old audit logs (admin only - add role check in production)
exports.cleanAuditLogs = async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const deletedCount = await Audit.cleanOldLogs(parseInt(daysToKeep));

    res.status(200).json({
      success: true,
      message: `Cleaned ${deletedCount} old audit logs`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning audit logs',
      error: error.message
    });
  }
};