const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const User = require('../models/User');

const phonePattern = /^\+?[1-9]\d{9,14}$/;
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  phone: z.string().trim().regex(phonePattern, 'A valid phone number is required'),
  password: passwordSchema,
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
}).strict();

const safeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
});

const validationError = (result) => {
  const error = new Error(result.error.issues.map((issue) => issue.message).join(', '));
  error.statusCode = 400;
  return error;
};

const createAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { subject: user._id.toString(), expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

const register = async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw validationError(result);
    }

    const { name, email, phone, password } = result.data;
    const existingUser = await User.exists({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: 'ATTENDEE',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: safeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw validationError(result);
    }

    const { email, password } = result.data;
    const user = await User.findOne({ email });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      accessToken: createAccessToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = (req, res) => {
  res.json({ success: true, user: safeUser(req.user) });
};

const logout = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    return res.json({
      success: true,
      message: 'Logged out successfully. All existing access tokens have been revoked.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, getCurrentUser, logout };
