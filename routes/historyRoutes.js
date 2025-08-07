const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { mongoIdValidation, queryValidationRules } = require('../middleware/validation');
const {
  getUserActivity,
  getBudgetAuditTrail,
  getSpendingTrends,
  comparePeriods,
  getActivitySummary,
  getSystemActivity,
  cleanAuditLogs
} = require('../controllers/historyController');

// All routes require authentication
router.use(protect);

// User activity and audit trail
router.get('/activity', queryValidationRules.dateRange, getUserActivity);

// Activity summary for dashboard
router.get('/activity/summary', getActivitySummary);

// Budget-specific audit trail
router.get('/budget/:budgetId/audit', mongoIdValidation('budgetId'), getBudgetAuditTrail);

// Budget period comparison
router.get('/budget/:budgetId/compare', mongoIdValidation('budgetId'), comparePeriods);

// Spending trends analysis
router.get('/trends', getSpendingTrends);

// System-wide activity (admin only - add role check in production)
router.get('/system/activity', queryValidationRules.dateRange, getSystemActivity);

// Clean old audit logs (admin only - add role check in production)
router.post('/audit/clean', cleanAuditLogs);

module.exports = router;