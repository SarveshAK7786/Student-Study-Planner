const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get progress analytics for charts and dashboard cards
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const studentId = req.query.student_id && req.user.role === 'parent' ? req.query.student_id : req.user.id;

    // 1. Daily study minutes history
    const dailyStudy = await db.query(
      `SELECT date, SUM(minutes_studied) as minutes
       FROM student_progress
       WHERE user_id = ?
       GROUP BY date
       ORDER BY date ASC LIMIT 14`,
      [studentId]
    );

    // 2. Quiz scores over time
    const quizHistory = await db.query(
      `SELECT qs.id, qs.percentage, qs.passed, qs.submitted_at, t.title
       FROM quiz_submissions qs
       JOIN tests_and_quizzes t ON qs.quiz_id = t.id
       WHERE qs.user_id = ?
       ORDER BY qs.submitted_at ASC LIMIT 10`,
      [studentId]
    );

    // 3. Overall stats
    const totalMinutesRow = await db.get(
      `SELECT SUM(minutes_studied) as total_minutes, MAX(streak_count) as max_streak 
       FROM student_progress WHERE user_id = ?`,
      [studentId]
    );

    const completedTasksRow = await db.get(
      `SELECT COUNT(*) as count FROM assignments WHERE user_id = ? AND status = 'completed'`,
      [studentId]
    );

    const pendingTasksRow = await db.get(
      `SELECT COUNT(*) as count FROM assignments WHERE user_id = ? AND status != 'completed'`,
      [studentId]
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const todayProgress = await db.get(
      `SELECT minutes_studied FROM student_progress WHERE user_id = ? AND date = ?`,
      [studentId, todayStr]
    );

    const latestProgressRow = await db.get(
      `SELECT streak_count FROM student_progress WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
      [studentId]
    );

    // 4. Weak & Strong areas aggregated from past quizzes
    const recentSubmissions = await db.query(
      `SELECT weak_areas, strong_areas FROM quiz_submissions WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 5`,
      [studentId]
    );

    const weakSet = new Map();
    const strongSet = new Map();

    for (const sub of recentSubmissions) {
      const weaks = typeof sub.weak_areas === 'string' ? JSON.parse(sub.weak_areas || '[]') : (sub.weak_areas || []);
      const strongs = typeof sub.strong_areas === 'string' ? JSON.parse(sub.strong_areas || '[]') : (sub.strong_areas || []);

      weaks.forEach(w => weakSet.set(w.topic, w));
      strongs.forEach(s => strongSet.set(s.topic, s));
    }

    res.json({
      dailyStudyMinutes: dailyStudy,
      quizHistory,
      totalHoursStudied: Math.round(((totalMinutesRow?.total_minutes || 0) / 60) * 10) / 10,
      currentStreak: latestProgressRow?.streak_count || 1,
      todayMinutes: todayProgress?.minutes_studied || 0,
      tasksCompletedCount: completedTasksRow?.count || 0,
      tasksPendingCount: pendingTasksRow?.count || 0,
      weakAreas: Array.from(weakSet.values()),
      strongAreas: Array.from(strongSet.values())
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
});

// Log Pomodoro or Study Session Time
router.post('/log-session', authenticateToken, async (req, res) => {
  try {
    const { minutes = 25, course_id } = req.body;
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const existing = await db.get(
      `SELECT id, minutes_studied, streak_count FROM student_progress WHERE user_id = ? AND date = ?`,
      [userId, todayStr]
    );

    if (existing) {
      await db.run(
        `UPDATE student_progress SET minutes_studied = minutes_studied + ? WHERE id = ?`,
        [minutes, existing.id]
      );
    } else {
      // Calculate streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const yesterdayRow = await db.get(
        `SELECT streak_count FROM student_progress WHERE user_id = ? AND date = ?`,
        [userId, yesterday]
      );
      const newStreak = yesterdayRow ? (yesterdayRow.streak_count + 1) : 1;

      await db.run(
        `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, streak_count)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, course_id || null, todayStr, minutes, newStreak]
      );
    }

    res.json({ message: `Logged ${minutes} minutes of focused study! Keep up the momentum.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
