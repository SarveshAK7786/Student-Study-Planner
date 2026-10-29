const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { generateSchedule, saveGeneratedPlan } = require('../services/plannerService');

// Get all courses for student (or parent looking at student)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.query.student_id && req.user.role === 'parent' ? req.query.student_id : req.user.id;

    const courses = await db.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id) AS total_topics,
        (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id AND sp.status = 'completed') AS completed_topics,
        (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS total_assignments,
        (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id AND a.status = 'completed') AS completed_assignments
       FROM courses c
       WHERE c.user_id = ? AND c.is_archived = 0
       ORDER BY c.created_at DESC`,
      [studentId]
    );

    const enriched = courses.map(c => {
      const parsedSyllabus = typeof c.syllabus_modules === 'string' ? JSON.parse(c.syllabus_modules || '[]') : (c.syllabus_modules || []);
      const total = c.total_topics || 1;
      const completed = c.completed_topics || 0;
      const progressPercent = Math.min(100, Math.round((completed / total) * 100));

      return {
        ...c,
        syllabus_modules: parsedSyllabus,
        progress_percentage: progressPercent
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Fetch courses error:', err);
    res.status(500).json({ error: 'Failed to retrieve courses.' });
  }
});

// Create new course (Multi-step Onboarding Wizard destination)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      code,
      description,
      target_completion_date,
      target_hours_per_day = 2.0,
      syllabus_modules = [],
      difficulty = 'medium',
      color_code = '#4F46E5'
    } = req.body;

    if (!name || !target_completion_date) {
      return res.status(400).json({ error: 'Course name and target completion date are required.' });
    }

    const modulesJson = typeof syllabus_modules === 'string' ? syllabus_modules : JSON.stringify(syllabus_modules);

    const courseResult = await db.run(
      `INSERT INTO courses (user_id, name, code, description, target_completion_date, target_hours_per_day, syllabus_modules, difficulty, color_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, code || null, description || null, target_completion_date, target_hours_per_day, modulesJson, difficulty, color_code]
    );

    const courseId = courseResult.insertId;

    // Automatically generate dynamic study plan, micro-assignments, and quizzes!
    const { dailyPlans, assignments, tests } = generateSchedule({
      courseId,
      userId,
      modules: syllabus_modules,
      targetCompletionDate: target_completion_date,
      dailyStudyHours: parseFloat(target_hours_per_day)
    });

    const planStats = await saveGeneratedPlan({
      courseId,
      userId,
      dailyPlans,
      assignments,
      tests
    });

    res.status(201).json({
      message: 'Course and dynamic study plan generated successfully!',
      courseId,
      planStats
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Failed to create course.' });
  }
});

// Delete Course
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    await db.run(`DELETE FROM courses WHERE id = ? AND user_id = ?`, [courseId, req.user.id]);
    res.json({ message: 'Course deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
