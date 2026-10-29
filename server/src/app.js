import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import LokiStore from 'connect-loki';

import env from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import drivesRoutes from './routes/drives.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import resumesRoutes from './routes/resumes.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import adminRoutes from './routes/admin.routes.js';
import syncRoutes from './routes/sync.routes.js';
import { verifyToken } from './utils/token.js';

const LokiSessionStore = LokiStore(session);

export function createApp() {
  const app = express();

  // Trust proxy for reverse proxies (Render, Vercel, Nginx, Cloudflare)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Session configuration
  const sessionStore = new LokiSessionStore({
    path: path.join(env.SESSIONS_DIR, 'sessions.db'),
    ttl: 24 * 60 * 60, // 1 day
    logErrors: true,
  });

  app.use(session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'cpg.sid',
    cookie: {
      httpOnly: true,
      secure: 'auto', // Correctly detects HTTPS when behind proxy (Render/Vercel)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }));

  // Seamless Token / Header authentication fallback
  app.use((req, res, next) => {
    if (!req.session) {
      req.session = {};
    }
    if (!req.session.userId) {
      const authHeader = req.headers.authorization || req.headers['x-session-token'];
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = verifyToken(token);
        if (decoded && decoded.userId) {
          req.session.userId = decoded.userId;
          req.session.role = decoded.role;
          req.session.email = decoded.email;
        }
      }
    }
    next();
  });

  // Serve static frontend files
  app.use(express.static(env.CLIENT_DIR, {
    index: 'index.html',
    extensions: ['html'],
  }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/drives', drivesRoutes);
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/resumes', resumesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api', reportsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/sync', syncRoutes);

  // SPA fallback — serve index.html for non-API, non-static routes
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      return res.sendFile(path.join(env.CLIENT_DIR, 'index.html'));
    }
    next();
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
