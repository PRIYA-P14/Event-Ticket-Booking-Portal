const jwt = require('jsonwebtoken');

const User = require('../models/User');

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();
  return token || null;
};

const authenticate = async (req, res, next) => {
  const token = getBearerToken(req.get('Authorization'));

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.sub || !payload.role || !Number.isInteger(payload.tokenVersion)) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive or unavailable' });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Authentication token has been revoked' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Authentication token has expired' });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TypeError') {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    return next(error);
  }
};

module.exports = authenticate;
