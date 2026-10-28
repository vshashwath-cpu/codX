/**
 * Authentication middleware — verifies the user has a valid session.
 */
export function authenticate(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
  }
  next();
}

export default authenticate;
