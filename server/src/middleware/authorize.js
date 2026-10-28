/**
 * Role-based authorization middleware factory.
 * @param  {...string} allowedRoles - Roles that are permitted access
 * @returns {Function} Express middleware
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!req.session.role || !allowedRoles.includes(req.session.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
}

export default authorize;
