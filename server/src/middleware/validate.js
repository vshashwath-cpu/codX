import { ZodError } from 'zod';

/**
 * Validation middleware factory.
 * Validates request body, query, or params against a Zod schema.
 * 
 * @param {Object} schemas - Object with optional body, query, params Zod schemas
 * @returns {Function} Express middleware
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        for (const key of Object.keys(parsed)) {
          req.query[key] = parsed[key];
        }
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        for (const key of Object.keys(parsed)) {
          req.params[key] = parsed[key];
        }
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
      next(err);
    }
  };
}

export default validate;
