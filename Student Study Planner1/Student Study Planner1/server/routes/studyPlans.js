const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get study plans (filter by date or course)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.query.student_id && req.user.role === 'parent' ? req.query.student_id : req.user.id;
    const { date, course_id, status } = req.query;

    let sql = `
      SELECT sp.*, c.name AS course_name, c.color_code
      FROM study_plans sp
      JOIN courses c ON sp.course_id = c.id
      WHERE sp.user_id = ?
    `;
    const params = [studentId];

    if (date) {
      sql += ` AND sp.scheduled_date = ?`;
      params.push(date);
    }
    if (course_id) {
      sql += ` AND sp.course_id = ?`;
      params.push(course_id);
    }
    if (status) {
      sql += ` AND sp.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY sp.scheduled_date ASC, sp.day_number ASC`;

    const plans = await db.query(sql, params);
    res.json(plans);
  } catch (err) {
    console.error('Fetch study plans error:', err);
    res.status(500).json({ error: 'Failed to retrieve study plans.' });
  }
});

// Update plan milestone status (e.g. pending -> completed)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes_snippet } = req.body;
    const planId = req.params.id;

    const plan = await db.get(`SELECT * FROM study_plans WHERE id = ? AND user_id = ?`, [planId, req.user.id]);
    if (!plan) {
      return res.status(404).json({ error: 'Study plan milestone not found.' });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await db.run(
      `UPDATE study_plans 
       SET status = ?, completed_at = ?, notes_snippet = COALESCE(?, notes_snippet)
       WHERE id = ?`,
      [status, completedAt, notes_snippet || null, planId]
    );

    // If marked completed, update daily progress record
    if (status === 'completed') {
      const todayStr = new Date().toISOString().split('T')[0];
      const existingProgress = await db.get(
        `SELECT id, completed_modules_count, minutes_studied, streak_count FROM student_progress 
         WHERE user_id = ? AND date = ?`,
        [req.user.id, todayStr]
      );

      if (existingProgress) {
        await db.run(
          `UPDATE student_progress 
           SET completed_modules_count = completed_modules_count + 1,
               minutes_studied = minutes_studied + ?
           WHERE id = ?`,
          [plan.estimated_minutes, existingProgress.id]
        );
      } else {
        await db.run(
          `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, completed_modules_count, streak_count)
           VALUES (?, ?, ?, ?, 1, 1)`,
          [req.user.id, plan.course_id, todayStr, plan.estimated_minutes]
        );
      }
    }

    res.json({ message: `Milestone updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Study Hub for a specific milestone (Notes + Interactive Practice Questions)
router.get('/:id/study-hub', authenticateToken, async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = await db.get(
      `SELECT sp.*, c.name AS course_name, c.color_code
       FROM study_plans sp
       JOIN courses c ON sp.course_id = c.id
       WHERE sp.id = ? AND sp.user_id = ?`,
      [planId, req.user.id]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Milestone not found.' });
    }

    const { generateTopicStudyHub } = require('../services/claudeService');
    const studyHub = await generateTopicStudyHub({
      topic: plan.topic_title,
      courseName: plan.course_name,
      description: plan.topic_description,
      difficulty: 'medium'
    });

    // Check if there are any user saved notes for this topic
    const savedNotes = await db.query(
      `SELECT * FROM notes 
       WHERE user_id = ? AND course_id = ? AND topic LIKE ?
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, plan.course_id, `%${plan.topic_title}%`]
    );

    res.json({
      plan,
      studyHub,
      savedNotes: savedNotes[0] ? {
        ...savedNotes[0],
        key_concepts: typeof savedNotes[0].key_concepts === 'string' ? JSON.parse(savedNotes[0].key_concepts || '[]') : savedNotes[0].key_concepts,
        flashcards: typeof savedNotes[0].flashcards === 'string' ? JSON.parse(savedNotes[0].flashcards || '[]') : savedNotes[0].flashcards
      } : null
    });
  } catch (err) {
    console.error('Study Hub error:', err);
    res.status(500).json({ error: err.message || 'Failed to load Topic Study Hub.' });
  }
});

module.exports = router;
