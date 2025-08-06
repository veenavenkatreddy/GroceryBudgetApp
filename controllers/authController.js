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

exports.logout = (req, res) => {
  // Token-based: logout handled client-side
  success(res, {}, 'Logged out successfully');
};
