# College Placement Guide

A full-stack, locally runnable web application built with Node.js, Express, and Vanilla JavaScript to manage campus placements, student profiles, resume building, and job applications.

---

## 🚀 Features

- **Role-Based Access Control**:
  - **Student**: Browse drives, check eligibility, apply, build/export PDF resumes, AI resume feedback, offline drafts.
  - **Faculty / TPO**: Create and publish placement drives, review applications, shortlist/select candidates, export reports.
  - **Administrator**: Approve faculty access requests, manage user roles, activate/suspend accounts, monitor audit logs.
- **Offline-First Functionality**:
  - Browser LocalStorage for drafts and preferences.
  - Service Worker for offline application shell caching.
  - Automatic background synchronization queue when network reconnects.
- **Interactive Resume Builder**:
  - Multiple professional PDF templates (Professional Blue, Modern Dark).
  - Live client-side preview.
  - Native server-side PDF generation with PDFKit (no remote rendering API needed).
- **AI Resume Review**:
  - Powered by OpenRouter API.
  - Analyzes resume text against optional job descriptions for keyword gaps, scores, strengths, and suggestions.
- **Zero-Database Architecture**:
  - Persistent server data stored in structured local JSON files with crash-safe atomic writes and mutex locks.

---

## 🛠 Tech Stack

- **Backend**: Node.js (ES Modules), Express.js, Helmet, Express-Rate-Limit, Zod, Bcryptjs, Multer, PDFKit.
- **Frontend**: HTML5, CSS3 (Custom Design System), Vanilla JavaScript (ES6+), Chart.js.
- **Storage**: Native `fs/promises` local JSON files in `storage/data/`.
- **Testing**: Vitest & Supertest.

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm

### 2. Setup & Configuration

Clone the repository and install dependencies:

```bash
cd College-Placement-Guide
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

*(Optional)* If you wish to use AI resume analysis, sign up at [OpenRouter](https://openrouter.ai/), generate an API key, and add it to your `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Initialize Storage & Seed Data

Run the storage initialization and demo data scripts:

```bash
# Initialize JSON storage collections
npm run storage:init

# Seed sample student, faculty, and placement records
npm run data:seed

# Create the initial administrator account
npm run admin:create
```

### 4. Start the Application

Start the development server:

```bash
npm run dev
```

Or for standard production start:

```bash
npm start
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 👥 Demo Credentials

For quick local testing, the following accounts are pre-seeded:

| Role | Email | Password |
|---|---|---|
| **Student** | `student@demo.cpg` | `Demo@1234` |
| **Student** | `priya@demo.cpg` | `Demo@1234` |
| **Faculty / TPO** | `faculty@demo.cpg` | `Demo@1234` |
| **Administrator** | `admin@cpg.local` | `AdminPassword123!` |

> ⚠️ **Warning**: Demo credentials are for local development and testing only.

---

## 🧪 Running Tests

Execute the automated test suite with Vitest:

```bash
npm test
```

---

## 📁 Project Structure

```text
College-Placement-Guide/
├── server/
│   └── src/
│       ├── app.js                 # Express app configuration & middleware
│       ├── server.js              # Server entry point
│       ├── config/env.js          # Environment loading and validation
│       ├── storage/               # Centralized JSON store & locking
│       ├── middleware/            # Auth, authorization, Zod validation
│       ├── routes/                # Modular REST API endpoints
│       └── services/              # Business logic (eligibility, PDF, sync, AI)
├── client/
│   ├── index.html                 # Single page application shell
│   ├── css/                       # Design system and responsive styles
│   ├── js/                        # Modular vanilla JS controllers
│   ├── manifest.json              # PWA manifest
│   └── service-worker.js          # Service worker for offline caching
├── storage/
│   ├── data/                      # Authoritative JSON files
│   ├── uploads/                   # Temporary file uploads
│   └── backups/                   # Automated data backups
├── scripts/                       # Init, seed, admin creation scripts
└── tests/                         # Vitest test files
```
