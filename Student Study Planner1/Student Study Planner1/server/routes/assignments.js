const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { extractText } = require('../utils/docExtractor');
const { evaluateAssignmentSubmission } = require('../services/claudeService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Get assignments for student (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.query.student_id && req.user.role === 'parent' ? req.query.student_id : req.user.id;
    const { status, date } = req.query;

    let sql = `
      SELECT a.*, COALESCE(c.name, 'General Course') AS course_name, COALESCE(c.color_code, '#4F46E5') AS color_code
      FROM assignments a
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.user_id = ?
    `;
    const params = [studentId];

    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (date) {
      sql += ` AND a.due_date = ?`;
      params.push(date);
    }

    sql += ` ORDER BY a.due_date ASC, a.due_time ASC`;

    const assignments = await db.query(sql, params);

    // Dynamic overdue status flag if past due_date and due_time
    const now = new Date();
    const enriched = assignments.map(a => {
      let isOverdue = false;
      if (a.status !== 'completed') {
        const dueDateTime = new Date(`${a.due_date}T${a.due_time || '23:59:00'}`);
        if (now > dueDateTime) {
          isOverdue = true;
        }
      }
      let aiEvaluation = null;
      let requiresRedo = false;
      if (a.submission_notes) {
        try {
          const parsed = JSON.parse(a.submission_notes);
          if (parsed && (parsed.evaluation || parsed.grade || parsed.feedback_markdown)) {
            aiEvaluation = parsed.evaluation || parsed;
            requiresRedo = Boolean(parsed.requires_redo || aiEvaluation?.requires_redo || aiEvaluation?.is_relevant === false);
          }
        } catch {
          // Plain text note
        }
      }
      return { ...a, isOverdue, aiEvaluation, requiresRedo };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Fetch assignments error:', err);
    res.status(500).json({ error: 'Failed to retrieve assignments.' });
  }
});

// Create single assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { course_id, title, description, due_date, due_time = '23:59:00', max_score = 100 } = req.body;

    if (!course_id || !title || !due_date) {
      return res.status(400).json({ error: 'Course, title, and due date are required.' });
    }

    const result = await db.run(
      `INSERT INTO assignments (course_id, user_id, title, description, due_date, due_time, max_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [course_id, req.user.id, title, description || null, due_date, due_time, max_score]
    );

    res.status(201).json({ message: 'Assignment created.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark assignment completed
router.patch('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { submission_notes, score } = req.body;

    const assignment = await db.get(`SELECT * FROM assignments WHERE id = ? AND user_id = ?`, [assignmentId, req.user.id]);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const assignedScore = score !== undefined ? score : 95;
    const completedAt = new Date().toISOString();

    await db.run(
      `UPDATE assignments 
       SET status = 'completed', completed_at = ?, score = ?, submission_notes = ?
       WHERE id = ?`,
      [completedAt, assignedScore, submission_notes || 'Submitted via Student Portal', assignmentId]
    );

    // Update daily activity log
    const todayStr = new Date().toISOString().split('T')[0];
    const existingProgress = await db.get(
      `SELECT id, completed_modules_count FROM student_progress WHERE user_id = ? AND date = ?`,
      [req.user.id, todayStr]
    );

    if (existingProgress) {
      await db.run(
        `UPDATE student_progress SET completed_modules_count = completed_modules_count + 1 WHERE id = ?`,
        [existingProgress.id]
      );
    } else {
      const latestProgress = await db.get(
        `SELECT streak_count FROM student_progress WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
        [req.user.id]
      );
      const streak = latestProgress?.streak_count || 1;
      await db.run(
        `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, completed_modules_count, streak_count)
         VALUES (?, ?, ?, 30, 1, ?)`,
        [req.user.id, assignment.course_id, todayStr, streak]
      );
    }

    res.json({ message: 'Assignment marked as completed!', score: assignedScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Practice Questions for an Assignment
router.get('/:id/practice-questions', authenticateToken, async (req, res) => {
  try {
    const assignment = await db.get(
      `SELECT a.*, COALESCE(c.name, 'General Course') AS course_name
       FROM assignments a
       LEFT JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const { generateTopicStudyHub } = require('../services/claudeService');
    const pack = await generateTopicStudyHub({
      topic: assignment.title,
      courseName: assignment.course_name,
      description: assignment.description,
      difficulty: 'medium'
    });

    res.json({
      assignmentId: assignment.id,
      title: assignment.title,
      courseName: assignment.course_name,
      questions: pack.practice_questions || []
    });
  } catch (err) {
    console.error('Assignment practice questions error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch practice questions.' });
  }
});

// Upload Document or Submit Text for AI Evaluation & Progress Tracking
router.post('/:id/evaluate', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await db.get(
      `SELECT a.*, COALESCE(c.name, 'General Course') AS course_name
       FROM assignments a
       LEFT JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND a.user_id = ?`,
      [assignmentId, req.user.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    let submissionText = (req.body.submission_text || req.body.submission_notes || '').trim();
    let fileName = null;

    if (req.file) {
      fileName = req.file.originalname;
      try {
        const extracted = await extractText(req.file.buffer, req.file.originalname);
        submissionText = extracted.text ? (submissionText ? `${submissionText}\n\n---\nDocument Content:\n${extracted.text}` : extracted.text) : submissionText;
      } catch (extractErr) {
        return res.status(422).json({ error: `Could not parse document: ${extractErr.message}` });
      }
    }

    if (!submissionText || submissionText.length < 15) {
      return res.status(400).json({
        error: 'Please upload a document (PDF, DOCX, PPTX, TXT) or type your assignment answer (minimum 15 characters).'
      });
    }

    // Call AI Evaluator
    const evaluation = await evaluateAssignmentSubmission({
      assignmentTitle: assignment.title,
      assignmentDescription: assignment.description,
      studentSubmissionText: submissionText,
      maxScore: assignment.max_score || 100
    });

    const submittedAt = new Date().toISOString();
    const requiresRedo = Boolean(evaluation.requires_redo || evaluation.is_relevant === false);
    const finalScore = requiresRedo ? 0 : (evaluation.score || 85);
    const notesJson = JSON.stringify({
      fileName,
      submittedAt,
      snippet: submissionText.slice(0, 300),
      requires_redo: requiresRedo,
      evaluation
    });

    if (requiresRedo) {
      // Do not mark as completed, keep as pending with score 0 and redo flag
      await db.run(
        `UPDATE assignments 
         SET status = 'pending', completed_at = NULL, score = 0, submission_notes = ?
         WHERE id = ?`,
        [notesJson, assignmentId]
      );

      return res.json({
        success: true,
        requires_redo: true,
        message: 'Irrelevant document detected. Please redo and upload the correct assignment file.',
        score: 0,
        max_score: assignment.max_score || 100,
        grade: 'F (Redo Required)',
        evaluation,
        fileName
      });
    }

    // Relevant submission: Update assignment as completed
    await db.run(
      `UPDATE assignments 
       SET status = 'completed', completed_at = ?, score = ?, submission_notes = ?
       WHERE id = ?`,
      [submittedAt, finalScore, notesJson, assignmentId]
    );

    // Update student daily progress record
    const todayStr = submittedAt.split('T')[0];
    const existingProgress = await db.get(
      `SELECT id, completed_modules_count, minutes_studied, tests_taken_count, average_test_score FROM student_progress 
       WHERE user_id = ? AND date = ?`,
      [req.user.id, todayStr]
    );

    if (existingProgress) {
      await db.run(
        `UPDATE student_progress 
         SET completed_modules_count = completed_modules_count + 1,
             minutes_studied = minutes_studied + 45
         WHERE id = ?`,
        [existingProgress.id]
      );
    } else {
      const latestProgress = await db.get(
        `SELECT streak_count FROM student_progress WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
        [req.user.id]
      );
      const streak = latestProgress?.streak_count || 1;
      await db.run(
        `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, completed_modules_count, streak_count)
         VALUES (?, ?, ?, 45, 1, ?)`,
        [req.user.id, assignment.course_id, todayStr, streak]
      );
    }

    res.json({
      success: true,
      requires_redo: false,
      message: 'Assignment evaluated and marked as completed!',
      score: finalScore,
      max_score: assignment.max_score || 100,
      grade: evaluation.grade,
      evaluation,
      fileName
    });
  } catch (err) {
    console.error('AI Assignment Evaluation error:', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate assignment.' });
  }
});

module.exports = router;
