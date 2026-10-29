const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, getDbStatus } = require('./config/db');
const { initAlertScheduler } = require('./services/alertService');

// Import Route Handlers
const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const studyPlansRoutes = require('./routes/studyPlans');
const assignmentsRoutes = require('./routes/assignments');
const testsRoutes = require('./routes/tests');
const notesRoutes = require('./routes/notes');
const chatbotRoutes = require('./routes/chatbot');
const alertsRoutes = require('./routes/alerts');
const parentRoutes = require('./routes/parent');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const docNotesRoutes = require('./routes/docNotes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health and DB Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: getDbStatus(),
    version: '1.0.0'
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/study-plans', studyPlansRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doc-notes', docNotesRoutes);

const fs = require('fs');

// Optional: Serve client build if available
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

// SPA Catch-All fallback for production frontend routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    message: 'Smart Study Planner API Server Running',
    docs: '/api/health'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Database
async function bootstrap() {
  try {
    await initDatabase();
    initAlertScheduler();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Smart Study Planner Server running on http://localhost:${PORT}`);
      console.log(`📦 Database Engine: ${getDbStatus().driver.toUpperCase()}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
