
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }

  User.findById(payload.id)
    .select('role active')
    .lean()
    .then(user => {
      if (!user || user.active === false) {
        return res.status(401).json({
          message: 'Account is inactive or no longer exists',
        });
      }

      // Use the current database role, not an outdated token role.
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      next();
    })
    .catch(next);
};

export const requireRole = (...roles) => (req, res, next) => {
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'Forbidden' });
};
