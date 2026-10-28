# Deployment Guide — College Placement Guide

This guide covers deployment options for **College Placement Guide**. Since the application uses local JSON file persistence in `storage/data/`, the deployment target must support persistent filesystem storage (or Docker volumes).

---

## ⚡ Option 1: Render.com (Recommended — 1-Click with Persistent Disk)

Render supports persistent disks on web services so your JSON database records survive server restarts and redeploys.

### Steps:
1. Push your repository to **GitHub** or **GitLab**:
   ```bash
   git remote add origin https://github.com/your-username/college-placement-guide.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](./render.yaml).
4. Configure any optional environment variables (such as `OPENROUTER_API_KEY` for AI resume analysis).
5. Click **Apply**. Render will build and deploy the web service with:
   - Build Command: `npm install && node scripts/init-storage.js && node scripts/seed-demo-data.js`
   - Start Command: `npm start`
   - Persistent Disk: Mounted at `/app/storage` (1 GB)

---

## 🚂 Option 2: Railway.app

1. Install the Railway CLI or visit [Railway.app](https://railway.app/).
2. Click **New Project > Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the [`railway.json`](./railway.json) configuration and [`Procfile`](./Procfile).
5. In project settings, add a **Volume** mounted to `/app/storage` so JSON files are persisted across deploys.
6. Under **Variables**, add:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `SESSION_SECRET=your_random_secret_here`
   - *(Optional)* `OPENROUTER_API_KEY=your_key`

---

## 🐳 Option 3: Docker Container (Any VPS, DigitalOcean, AWS EC2, or Cloud Run)

The repository includes a production-ready [`Dockerfile`](./Dockerfile).

### 1. Build the Docker Image:
```bash
docker build -t college-placement-guide:latest .
```

### 2. Run the Container with Volume Persistence:
```bash
docker run -d \
  --name cpg-app \
  -p 3000:3000 \
  -v $(pwd)/storage/data:/app/storage/data \
  -e NODE_ENV=production \
  -e SESSION_SECRET="your_secure_random_session_secret" \
  -e OPENROUTER_API_KEY="your_openrouter_api_key_optional" \
  college-placement-guide:latest
```

The application will be live at `http://localhost:3000` (or `http://YOUR_SERVER_IP:3000`).

---

## ☁ Option 4: Fly.io

1. Install the [Flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/).
2. Run in the project directory:
   ```bash
   fly launch
   ```
3. Create a persistent volume for storage:
   ```bash
   fly volumes create cpg_storage --size 1
   ```
4. Attach the volume in `fly.toml`:
   ```toml
   [mounts]
     source = "cpg_storage"
     destination = "/app/storage"
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

---

## 🏠 Option 5: Local Production & LAN Access

To run the application in production mode accessible across your local network/office/college Wi-Fi:

1. Ensure storage is initialized:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```
3. Other devices on the same Wi-Fi can access the application via your local IP:
   `http://<YOUR_COMPUTER_IP>:3000`
   *(Check your IP using `ipconfig` on Windows).*
