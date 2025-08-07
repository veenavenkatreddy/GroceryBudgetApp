const express = require('express');
const router = express.Router();
const controller = require('../controllers/itemController');
const { itemValidationRules, mongoIdValidation } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/auditLogger');

router.use(protect);

router.post('/', itemValidationRules.create, audit.itemCreate, controller.createItem);
router.post('/batch', itemValidationRules.batchCreate, audit.itemBatchCreate, controller.batchCreateItems);
router.get('/', controller.getItems);
router.get('/:id', mongoIdValidation(), controller.getItem);
router.put('/:id', itemValidationRules.update, audit.itemUpdate, controller.updateItem);
router.delete('/:id', mongoIdValidation(), audit.itemDelete, controller.deleteItem);

module.exports = router;