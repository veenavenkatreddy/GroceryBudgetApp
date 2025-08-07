const express = require('express');
const router = express.Router();
const controller = require('../controllers/exportController');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/auditLogger');

router.use(protect);

router.get('/budget/:budgetId', audit.exportData, controller.exportBudgetSummary);
router.get('/items/:budgetId', audit.exportData, controller.exportItems);
router.get('/categories/:budgetId', audit.exportData, controller.exportCategoryBreakdown);
router.get('/report', audit.exportData, controller.exportComprehensiveReport);

module.exports = router;

