const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Get platform stats
router.get('/overview', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await db.get(`SELECT COUNT(*) as count FROM users`);
    const totalCourses = await db.get(`SELECT COUNT(*) as count FROM courses`);
    const totalPlans = await db.get(`SELECT COUNT(*) as count FROM study_plans`);
    const totalAssignments = await db.get(`SELECT COUNT(*) as count FROM assignments`);
    const totalQuizzes = await db.get(`SELECT COUNT(*) as count FROM tests_and_quizzes`);
    const totalAlerts = await db.get(`SELECT COUNT(*) as count FROM daily_alerts`);

    const users = await db.query(
      `SELECT id, name, email, role, invite_code, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      metrics: {
        users: totalUsers?.count || 0,
        courses: totalCourses?.count || 0,
        study_plans: totalPlans?.count || 0,
        assignments: totalAssignments?.count || 0,
        quizzes: totalQuizzes?.count || 0,
        alerts_sent: totalAlerts?.count || 0
      },
      dbStatus: db.getDbStatus(),
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role or status
router.patch('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role, is_active } = req.body;
    const targetUserId = req.params.id;

    if (role) {
      await db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, targetUserId]);
    }
    if (is_active !== undefined) {
      await db.run(`UPDATE users SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, targetUserId]);
    }

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset all platform details/data back to clean initial demo state
router.post('/reset', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.resetPlatformData();
    res.json({ message: 'Platform data and admin metrics have been completely reset to initial clean state.' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset platform data: ' + err.message });
  }
});

module.exports = router;
