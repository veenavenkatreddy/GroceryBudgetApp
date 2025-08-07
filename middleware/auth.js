const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Missing token' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user)
      return res.status(401).json({ success: false, message: 'User not found' });

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: error.message
    });
  }
};
