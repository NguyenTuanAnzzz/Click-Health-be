const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error.model');

module.exports = (req, res, next) => {
  // Allow preflight requests to pass through for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next(new HttpError('Authentication failed: Missing Authorization header.', 401));
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new HttpError('Authentication failed: Invalid token format.', 401));
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const allowedRoles = ['ADMIN', 'PATIENT'];

    if (!allowedRoles.includes(decodedToken.role)) {
      return next(
        new HttpError('Forbidden: Access denied.', 403)
      );
    }
    
    req.userData = {
      id: decodedToken.userId, // Change from decodedToken.id to decodedToken.userId
      email: decodedToken.email,
      role: decodedToken.role
    };

    next();
  } catch (err) {
    return next(new HttpError('Authentication failed: Invalid or expired token.', 401));
  }
};

module.exports.admin = (req, res, next) => {
  module.exports(req, res, (err) => {
    if (err) return next(err);
    if (!req.userData || req.userData.role !== 'ADMIN') {
      return next(new HttpError('Forbidden: Admin access required.', 403));
    }
    next();
  });
};


