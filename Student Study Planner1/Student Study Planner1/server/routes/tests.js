const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get all tests/quizzes for student
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.query.student_id && req.user.role === 'parent' ? req.query.student_id : req.user.id;

    const quizzes = await db.query(
      `SELECT t.*, c.name AS course_name, c.color_code,
        (SELECT qs.percentage FROM quiz_submissions qs WHERE qs.quiz_id = t.id AND qs.user_id = ? ORDER BY qs.submitted_at DESC LIMIT 1) AS last_score,
        (SELECT qs.passed FROM quiz_submissions qs WHERE qs.quiz_id = t.id AND qs.user_id = ? ORDER BY qs.submitted_at DESC LIMIT 1) AS last_passed
       FROM tests_and_quizzes t
       JOIN courses c ON t.course_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.assigned_date DESC`,
      [studentId, studentId, studentId]
    );

    res.json(quizzes);
  } catch (err) {
    console.error('Fetch tests error:', err);
    res.status(500).json({ error: 'Failed to retrieve tests.' });
  }
});

// Get single test with its questions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await db.get(
      `SELECT t.*, c.name AS course_name
       FROM tests_and_quizzes t
       JOIN courses c ON t.course_id = c.id
       WHERE t.id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    const questions = await db.query(
      `SELECT id, question_text, question_type, options, topic FROM quiz_questions WHERE quiz_id = ?`,
      [quizId]
    );

    const parsedQuestions = questions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || [])
    }));

    // Check if previously submitted
    const priorSubmission = await db.get(
      `SELECT * FROM quiz_submissions WHERE quiz_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
      [quizId, req.user.id]
    );

    res.json({
      quiz,
      questions: parsedQuestions,
      priorSubmission: priorSubmission ? {
        ...priorSubmission,
        weak_areas: typeof priorSubmission.weak_areas === 'string' ? JSON.parse(priorSubmission.weak_areas) : priorSubmission.weak_areas,
        strong_areas: typeof priorSubmission.strong_areas === 'string' ? JSON.parse(priorSubmission.strong_areas) : priorSubmission.strong_areas
      } : null
    });
  } catch (err) {
    console.error('Fetch test details error:', err);
    res.status(500).json({ error: 'Failed to retrieve test details.' });
  }
});

// Submit Quiz and Auto-Grade with Weak vs Strong Areas Breakdown
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body; // Map of { [questionId]: "A" / "User answer" }
    const userId = req.user.id;

    const quiz = await db.get(`SELECT * FROM tests_and_quizzes WHERE id = ?`, [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    const questions = await db.query(`SELECT * FROM quiz_questions WHERE quiz_id = ?`, [quizId]);

    let correctCount = 0;
    const topicStats = {}; // { topicName: { total: 0, correct: 0 } }
    const gradedBreakdown = [];

    for (const q of questions) {
      const studentAns = (answers && answers[q.id] ? String(answers[q.id]).trim().toUpperCase() : '');
      const correctAns = String(q.correct_answer).trim().toUpperCase();
      const topicName = q.topic || 'Core Material';

      if (!topicStats[topicName]) {
        topicStats[topicName] = { total: 0, correct: 0 };
      }
      topicStats[topicName].total += 1;

      // Robust MCQ match (exact match, prefix match in either direction e.g. "A" vs "A) Daily Scrum")
      let isCorrect = false;
      if (q.question_type === 'mcq') {
        isCorrect = (
          studentAns === correctAns ||
          correctAns.startsWith(studentAns) ||
          studentAns.startsWith(correctAns) ||
          (studentAns.length === 1 && correctAns.includes(studentAns + ')'))
        );
      } else {
        isCorrect = (studentAns.length > 3 && (correctAns.includes(studentAns) || studentAns.includes(correctAns)));
      }

      if (isCorrect) {
        correctCount++;
        topicStats[topicName].correct += 1;
      }

      gradedBreakdown.push({
        questionId: q.id,
        questionText: q.question_text,
        studentAnswer: studentAns,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
        topic: topicName
      });
    }

    const totalQuestions = questions.length || 1;
    const score = correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= quiz.pass_criteria;

    // Identify weak and strong topics
    const weakAreas = [];
    const strongAreas = [];

    Object.keys(topicStats).forEach(top => {
      const stat = topicStats[top];
      const topicPct = (stat.correct / stat.total) * 100;
      if (topicPct >= 70) {
        strongAreas.push({ topic: top, accuracy: Math.round(topicPct) });
      } else {
        weakAreas.push({
          topic: top,
          accuracy: Math.round(topicPct),
          recommendation: `Dedicate 30 mins to review AI Study Notes and flashcards for ${top}.`
        });
      }
    });

    // Save submission
    await db.run(
      `INSERT INTO quiz_submissions (quiz_id, user_id, score, total_marks, percentage, passed, weak_areas, strong_areas, student_answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quizId,
        userId,
        score,
        totalQuestions,
        percentage,
        passed ? 1 : 0,
        JSON.stringify(weakAreas),
        JSON.stringify(strongAreas),
        JSON.stringify(answers || {})
      ]
    );

    // Update quiz status to completed
    await db.run(`UPDATE tests_and_quizzes SET status = 'completed' WHERE id = ?`, [quizId]);

    // Update student progress record
    const todayStr = new Date().toISOString().split('T')[0];
    const existingProgress = await db.get(
      `SELECT id, tests_taken_count, average_test_score, streak_count FROM student_progress WHERE user_id = ? AND date = ?`,
      [userId, todayStr]
    );

    if (existingProgress) {
      const newTestsCount = (existingProgress.tests_taken_count || 0) + 1;
      const newAvg = existingProgress.average_test_score
        ? Math.round(((existingProgress.average_test_score * (newTestsCount - 1)) + percentage) / newTestsCount)
        : percentage;

      await db.run(
        `UPDATE student_progress SET tests_taken_count = ?, average_test_score = ? WHERE id = ?`,
        [newTestsCount, newAvg, existingProgress.id]
      );
    } else {
      const latestProgress = await db.get(
        `SELECT streak_count FROM student_progress WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
        [userId]
      );
      const streak = latestProgress?.streak_count || 1;

      await db.run(
        `INSERT INTO student_progress (user_id, course_id, date, tests_taken_count, average_test_score, streak_count)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [userId, quiz.course_id, todayStr, percentage, streak]
      );
    }

    res.json({
      message: passed ? 'Congratulations! You passed the quiz!' : 'Quiz evaluated. Review your weak areas below.',
      score,
      totalQuestions,
      percentage,
      passed,
      weakAreas,
      strongAreas,
      gradedBreakdown
    });
  } catch (err) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ error: 'Failed to submit and grade quiz.' });
  }
});

// Create AI Diagnostic Quiz on demand
router.post('/generate-ai', authenticateToken, async (req, res) => {
  try {
    const { course_id, topic_title } = req.body;
    const userId = req.user.id;

    const course = await db.get(`SELECT id, name FROM courses WHERE id = ?`, [course_id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const quizResult = await db.run(
      `INSERT INTO tests_and_quizzes (course_id, user_id, title, description, pass_criteria, duration_minutes, total_questions, assigned_date, due_date, status)
       VALUES (?, ?, ?, ?, 70, 15, 3, ?, ?, 'assigned')`,
      [
        course.id,
        userId,
        `AI Diagnostic: ${topic_title}`,
        `Auto-generated test assessing core understanding of ${topic_title} in ${course.name}.`,
        todayStr,
        tomorrowStr
      ]
    );

    const quizId = quizResult.insertId;

    // Seed questions for the quiz
    const generatedQuestions = [
      {
        q: `In the context of ${topic_title}, what is the fundamental principle that prevents runtime failures?`,
        options: ['Invariant enforcement and boundary checks', 'Removing error logging', 'Increasing execution frequency', 'Single-threaded execution only'],
        ans: 'A',
        exp: 'Enforcing system invariants and validating input boundaries prevents invalid states.',
        topic: topic_title
      },
      {
        q: `Which trade-off is typically encountered when optimizing ${topic_title}?`,
        options: ['Time complexity vs Space/Memory complexity', 'Color styling vs Screen refresh rate', 'Network cables vs Wireless frequency', 'No trade-offs ever exist'],
        ans: 'A',
        exp: 'Most computational optimizations trade spatial overhead (caching, precomputation) for execution speed.',
        topic: topic_title
      },
      {
        q: `What is the most effective testing strategy for verifying ${topic_title}?`,
        options: ['Automated unit tests covering boundary values and error exceptions', 'Manual inspection once a year', 'Relying solely on user complaints', 'Deleting assertions before release'],
        ans: 'A',
        exp: 'Automated boundary and property-based tests guarantee mathematical and logical correctness.',
        topic: topic_title
      }
    ];

    for (const g of generatedQuestions) {
      await db.run(
        `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
         VALUES (?, ?, 'mcq', ?, ?, ?, ?)`,
        [quizId, g.q, JSON.stringify(g.options), g.ans, g.exp, g.topic]
      );
    }

    res.status(201).json({
      message: `AI Quiz on "${topic_title}" created successfully!`,
      quizId
    });
  } catch (err) {
    console.error('Generate AI quiz error:', err);
    res.status(500).json({ error: 'Failed to generate AI quiz.' });
  }
});

module.exports = router;
