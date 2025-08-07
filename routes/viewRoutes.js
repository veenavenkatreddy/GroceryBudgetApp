const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');
const Category = require('../models/categoryModel');
const tipGenerator = require('../utils/tipGenerator');
const User = require('../models/userModel');

router.get('/', (req,res) => {
    res.render(home)
});

module.exports = router;