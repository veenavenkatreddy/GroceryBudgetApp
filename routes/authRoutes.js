const express = require('express');
const router = express.Router();
const { register, login, logout, updateProfile, changePassword, updateSettings, verifyToken } = require('../controllers/authController');
const { userValidationRules } = require('../middleware/validation');
const auditLoggers = require('../middleware/auditLogger');
const { protect } = require('../middleware/auth');

console.log('Auth routes file loaded');

// Auth routes
router.post('/register', userValidationRules.register, register, auditLoggers.userRegister);
router.post('/login', userValidationRules.login, login, auditLoggers.userLogin);
router.post('/logout', protect, auditLoggers.userLogout, logout);
router.put('/users/profile', protect, updateProfile)

console.log('Auth routes registered');

module.exports = router;