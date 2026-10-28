/**
 * Global error handler middleware.
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 5MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
    });
  }

  // Zod validation errors (catch-all)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    success: false,
    error: message,
  });
}

/**
 * 404 handler for unknown routes.
 */
export function notFoundHandler(req, res) {
  // If it's an API route, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`,
    });
  }
  // For non-API routes, let the SPA handle it
  res.status(404).send('Not found');
}

export default { errorHandler, notFoundHandler };
