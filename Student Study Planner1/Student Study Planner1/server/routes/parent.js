const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Get all linked children with real-time academic summaries
router.get('/children', authenticateToken, requireRole(['parent', 'admin']), async (req, res) => {
  try {
    const parentId = req.user.id;

    const children = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.invite_code, psl.linked_at
       FROM parent_student_links psl
       JOIN users u ON psl.student_id = u.id
       WHERE psl.parent_id = ? AND psl.status = 'active'`,
      [parentId]
    );

    const enrichedChildren = [];

    for (const child of children) {
      // Course statistics
      const courses = await db.query(
        `SELECT c.id, c.name, c.color_code, c.target_completion_date,
           (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id AND sp.status = 'completed') AS completed_topics,
           (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id) AS total_topics
         FROM courses c
         WHERE c.user_id = ? AND c.is_archived = 0`,
        [child.id]
      );

      const parsedCourses = courses.map(c => {
        const total = c.total_topics || 1;
        const comp = c.completed_topics || 0;
        return {
          ...c,
          progress_percent: Math.min(100, Math.round((comp / total) * 100))
        };
      });

      // Today's assignments
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAssignments = await db.query(
        `SELECT a.*, c.name AS course_name FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.user_id = ? AND a.due_date = ?`,
        [child.id, todayStr]
      );

      // Recent quiz performance
      const recentQuizzes = await db.query(
        `SELECT qs.score, qs.total_marks, qs.percentage, qs.passed, t.title, qs.submitted_at
         FROM quiz_submissions qs
         JOIN tests_and_quizzes t ON qs.quiz_id = t.id
         WHERE qs.user_id = ?
         ORDER BY qs.submitted_at DESC LIMIT 3`,
        [child.id]
      );

      // Latest streak and study time
      const progress = await db.get(
        `SELECT streak_count, minutes_studied FROM student_progress WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
        [child.id]
      );

      enrichedChildren.push({
        ...child,
        streak: progress ? progress.streak_count : 1,
        minutes_today: progress ? progress.minutes_studied : 0,
        courses: parsedCourses,
        today_assignments: todayAssignments,
        recent_quizzes: recentQuizzes
      });
    }

    res.json(enrichedChildren);
  } catch (err) {
    console.error('Fetch parent children error:', err);
    res.status(500).json({ error: 'Failed to retrieve child progress summaries.' });
  }
});

module.exports = router;
