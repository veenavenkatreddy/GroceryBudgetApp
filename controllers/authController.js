const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { success, fail } = require('../utils/responseHandler');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
  expiresIn: '40d'
});

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return fail(res, new Error('User already exists'), 400);

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);

    success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    }, 'Registered successfully');
  } catch (error) {
    fail(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password)))
      return fail(res, new Error('Invalid credentials'), 401);

    const token = generateToken(user._id);

    success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    }, 'Logged in successfully');
  } catch (error) {
    fail(res, error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user._id;

    // Check if username or email already taken by another user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already taken'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = (req, res) => {
  // Token-based: logout handled client-side
  success(res, {}, 'Logged out successfully');
};
