const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { itemValidationRules, queryValidationRules, mongoIdValidation } = require('../middleware/validation');
const {
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
  getRunningTotals,
  batchCreateItems
} = require('../controllers/itemController');

// All routes require authentication
router.use(protect);

// Item routes
router.route('/')
  .get([...queryValidationRules.pagination, ...queryValidationRules.dateRange], getItems)
  .post(itemValidationRules.create, createItem);

router.post('/batch', itemValidationRules.batchCreate, batchCreateItems);

router.route('/:id')
  .get(mongoIdValidation(), getItem)
  .put(itemValidationRules.update, updateItem)
  .delete(mongoIdValidation(), deleteItem);

router.get('/budget/:budgetId/totals', mongoIdValidation('budgetId'), getRunningTotals);

module.exports = router;