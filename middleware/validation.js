const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidationRules = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    handleValidationErrors
  ],
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ]
};

// Budget validation rules
const budgetValidationRules = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Budget name is required')
      .isLength({ max: 100 })
      .withMessage('Budget name cannot exceed 100 characters'),
    body('totalLimit')
      .isNumeric()
      .withMessage('Total limit must be a number')
      .custom(value => value > 0)
      .withMessage('Total limit must be greater than 0'),
    body('period.start')
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('period.end')
      .isISO8601()
      .withMessage('End date must be a valid date')
      .custom((value, { req }) => new Date(value) > new Date(req.body.period.start))
      .withMessage('End date must be after start date'),
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    body('categories.*.categoryId')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('categories.*.limit')
      .optional()
      .isNumeric()
      .withMessage('Category limit must be a number')
      .custom(value => value >= 0)
      .withMessage('Category limit cannot be negative'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid budget ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Budget name cannot exceed 100 characters'),
    body('totalLimit')
      .optional()
      .isNumeric()
      .withMessage('Total limit must be a number')
      .custom(value => value > 0)
      .withMessage('Total limit must be greater than 0'),
    handleValidationErrors
  ]
};

// Item validation rules
const itemValidationRules = {
  create: [
    body('budgetId')
      .isMongoId()
      .withMessage('Invalid budget ID'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Item name is required')
      .isLength({ max: 200 })
      .withMessage('Item name cannot exceed 200 characters'),
    body('price')
      .isNumeric()
      .withMessage('Price must be a number')
      .custom(value => value >= 0)
      .withMessage('Price cannot be negative'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('categoryId')
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('isEssential')
      .optional()
      .isBoolean()
      .withMessage('isEssential must be true or false'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    body('purchaseDate')
      .optional()
      .isISO8601()
      .withMessage('Purchase date must be a valid date'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid item ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Item name cannot exceed 200 characters'),
    body('price')
      .optional()
      .isNumeric()
      .withMessage('Price must be a number')
      .custom(value => value >= 0)
      .withMessage('Price cannot be negative'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('categoryId')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    handleValidationErrors
  ],
  batchCreate: [
    body('budgetId')
      .isMongoId()
      .withMessage('Invalid budget ID'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items must be a non-empty array'),
    body('items.*.name')
      .trim()
      .notEmpty()
      .withMessage('Each item must have a name'),
    body('items.*.price')
      .isNumeric()
      .withMessage('Each item price must be a number')
      .custom(value => value >= 0)
      .withMessage('Price cannot be negative'),
    body('items.*.categoryId')
      .isMongoId()
      .withMessage('Each item must have a valid category ID'),
    handleValidationErrors
  ]
};

// Query validation rules
const queryValidationRules = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
  ],
  dateRange: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid date'),
    handleValidationErrors
  ]
};

// Category validation rules
const categoryValidationRules = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ max: 50 })
      .withMessage('Category name cannot exceed 50 characters'),
    body('icon')
      .optional()
      .isLength({ max: 10 })
      .withMessage('Icon cannot exceed 10 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color must be a valid hex color (e.g., #FF0000)'),
    body('parentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent category ID'),
    handleValidationErrors
  ]
};

// MongoDB ID validation
const mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  userValidationRules,
  budgetValidationRules,
  itemValidationRules,
  queryValidationRules,
  categoryValidationRules,
  mongoIdValidation,
  handleValidationErrors
};