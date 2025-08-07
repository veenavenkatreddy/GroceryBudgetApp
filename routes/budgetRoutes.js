const express = require('express');
const router = express.Router();
const controller = require('../controllers/budgetController');
const { budgetValidationRules, mongoIdValidation } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/auditLogger');

router.use(protect);

router.post('/', budgetValidationRules.create, audit.budgetCreate, controller.createBudget);
router.get('/', controller.getBudgets);
router.get('/:id', mongoIdValidation(), audit.budgetView, controller.getBudget);
router.put('/:id', budgetValidationRules.update, audit.budgetUpdate, controller.updateBudget);
router.delete('/:id', mongoIdValidation(), audit.budgetDelete, controller.deleteBudget);

module.exports = router;
