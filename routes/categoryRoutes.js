const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryController');
const { categoryValidationRules, mongoIdValidation } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/auditLogger');

router.use(protect);

router.post('/', categoryValidationRules.create, audit.categoryCreate, controller.createCategory);
router.get('/', controller.getCategories);
router.put('/:id', categoryValidationRules.create, audit.categoryUpdate, controller.updateCategory);
router.delete('/:id', mongoIdValidation(), audit.categoryDelete, controller.deleteCategory);

module.exports = router;
