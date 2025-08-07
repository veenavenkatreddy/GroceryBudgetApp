const express = require('express');
const router = express.Router();
const controller = require('../controllers/tipsController');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/auditLogger');

router.use(protect);

router.get('/', audit.tipView, controller.getTips);
router.get('/generate/:budgetId', controller.generateTips);
router.get('/threshold/:budgetId', controller.getThresholdTips);
router.get('/seasonal', controller.getSeasonalTips);
router.get('/analyze/:budgetId', controller.analyzeSpending);
router.post('/initialize', controller.initializeTips);
router.post('/helpful/:id', audit.tipHelpful, controller.markTipHelpful);

module.exports = router;