import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Configure multer for PDF resume uploads.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

export const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

export default { uploadResume };
