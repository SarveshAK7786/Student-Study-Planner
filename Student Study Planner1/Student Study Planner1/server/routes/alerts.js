const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { processDailyAlertsForStudent, triggerDailyAlertsForAllStudents } = require('../services/alertService');

// Get alert logs for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = await db.query(
      `SELECT da.*, u.name as recipient_name, s.name as student_name
       FROM daily_alerts da
       JOIN users u ON da.recipient_id = u.id
       JOIN users s ON da.student_id = s.id
       WHERE da.recipient_id = ? OR da.student_id = ?
       ORDER BY da.sent_at DESC LIMIT 20`,
      [req.user.id, req.user.id]
    );

    const parsed = alerts.map(a => ({
      ...a,
      details_json: typeof a.details_json === 'string' ? JSON.parse(a.details_json || '{}') : (a.details_json || {})
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger daily alert manually for testing/demo
router.post('/trigger-now', authenticateToken, async (req, res) => {
  try {
    let studentId = req.body.student_id;

    if (!studentId) {
      if (req.user.role === 'student') {
        studentId = req.user.id;
      } else if (req.user.role === 'parent') {
        const link = await db.get(
          `SELECT student_id FROM parent_student_links WHERE parent_id = ? AND status = 'active' ORDER BY linked_at DESC LIMIT 1`,
          [req.user.id]
        );
        studentId = link ? link.student_id : null;
      } else if (req.user.role === 'admin') {
        const anyStudent = await db.get(`SELECT id FROM users WHERE role = 'student' LIMIT 1`);
        studentId = anyStudent ? anyStudent.id : null;
      }
    }

    if (!studentId) {
      return res.status(400).json({ error: 'No active student found to dispatch progress report for.' });
    }

    const result = await processDailyAlertsForStudent(studentId);

    res.json({
      message: 'Daily progress alerts generated and dispatched to Student and Parent accounts!',
      result
    });
  } catch (err) {
    console.error('Trigger alert error:', err);
    res.status(500).json({ error: 'Failed to process daily alerts.' });
  }
});

// Admin trigger for all students
router.post('/trigger-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const report = await triggerDailyAlertsForAllStudents();
    res.json({ message: 'Daily digests sent for all students.', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
