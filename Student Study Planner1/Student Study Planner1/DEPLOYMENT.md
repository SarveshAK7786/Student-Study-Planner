# 🚀 Smart Study Planner — Deployment Guide

This guide provides step-by-step instructions to deploy the Smart Study Planner application locally or to cloud platforms (Docker, Render, Railway, Heroku, AWS/VPS).

---

## ⚡ Option 1: Quick Unified Production Server (Recommended for Evaluation)

The application includes an automated single-command production server that builds the React frontend and serves both the client SPA and backend REST APIs on **port 5000**:

```bash
# 1. Install all dependencies and build client bundle
npm run postinstall

# 2. Start the unified production server
npm start
```

Access the application in your browser:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🐳 Option 2: Docker & Docker Compose (Full Stack with MySQL 8)

The project includes a multi-stage [`Dockerfile`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/Dockerfile) and [`docker-compose.yml`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/docker-compose.yml) orchestrating the app alongside an isolated MySQL 8.0 database container:

```bash
# Start MySQL 8 and Web App containers in the background
docker compose up -d --build
```

- **App URL:** `http://localhost:5000`
- **MySQL Port:** `3306`
- **Database Name:** `smart_study_planner`
- **Initial Schema:** Automatically executed from `database/schema.sql` on first boot.

To shut down:
```bash
docker compose down
```

---

## ☁️ Option 3: Deploy to Cloud (Render / Railway / Heroku)

### A. Render (Automatic Blueprint)
1. Push your code to GitHub or GitLab.
2. Log in to [Render.com](https://render.com) and click **New + > Blueprint**.
3. Select your repository — Render will automatically read [`render.yaml`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/render.yaml).
4. Click **Apply** to deploy the web service.

### B. Railway or Heroku
1. The repository includes a [`Procfile`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/Procfile):
   ```
   web: npm start
   ```
2. In Railway or Heroku dashboard, connect your GitHub repository.
3. Configure the following Environment Variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=your_secure_secret_key`
   - `DB_TYPE=mysql` (or leave default to use zero-config SQLite mode)
   - `DB_HOST=your_mysql_host`
   - `DB_USER=your_mysql_user`
   - `DB_PASSWORD=your_mysql_password`
   - `DB_NAME=smart_study_planner`
   - `ANTHROPIC_API_KEY=your_claude_api_key` *(optional)*

---

## 🗄️ MySQL Database Setup (Manual / Localhost)

If you are running your own local MySQL 8.0 server:

1. Open your terminal or MySQL Workbench:
```bash
mysql -u root -p < database/schema.sql
```

2. Open [`server/.env`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/server/.env) and enter your password:
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_root_password
DB_NAME=smart_study_planner
```

3. Restart the server (`npm start`). The Navbar status pill will display **"MySQL 8.0 Connected"**.
