const db = require('../config/db');

/**
 * Dynamic Study Plan Generator Algorithm
 * Breaks down course modules into daily study targets and milestones based on target dates and daily hour limits.
 */
function generateSchedule({ courseId, userId, modules, targetCompletionDate, dailyStudyHours = 2.0 }) {
  const startDate = new Date();
  const endDate = new Date(targetCompletionDate);
  
  // Calculate total days between tomorrow and target date (minimum 1 day)
  const diffTime = Math.max(endDate.getTime() - startDate.getTime(), 86400000);
  const totalDaysAvailable = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Flatten modules and subtopics
  const parsedModules = typeof modules === 'string' ? JSON.parse(modules) : (modules || []);
  let allTopics = [];

  parsedModules.forEach((mod, modIdx) => {
    const modTitle = mod.title || `Module ${modIdx + 1}`;
    const subtopics = mod.subtopics || [
      `${modTitle} - Fundamentals & Core Concepts`,
      `${modTitle} - Deep Dive & Mechanics`,
      `${modTitle} - Applied Problem Solving & Examples`
    ];

    subtopics.forEach((sub, subIdx) => {
      allTopics.push({
        moduleName: modTitle,
        topicTitle: typeof sub === 'string' ? sub : (sub.title || `Topic ${subIdx + 1}`),
        estimatedMinutes: Math.round((dailyStudyHours * 60) * 0.75), // typical focused session
      });
    });
  });

  if (allTopics.length === 0) {
    allTopics = [
      { moduleName: 'Foundation', topicTitle: 'Core Concepts & Principles', estimatedMinutes: 60 },
      { moduleName: 'Advanced', topicTitle: 'Practical Implementations & Case Studies', estimatedMinutes: 90 },
      { moduleName: 'Synthesis', topicTitle: 'Review, Integration & Problem Solving', estimatedMinutes: 60 },
    ];
  }

  // Allocate all topics into days (Day 1 starts Today)
  const dailyPlans = [];
  const assignments = [];
  const tests = [];

  const numTopics = allTopics.length;

  for (let i = 0; i < numTopics; i++) {
    // Map topic to dayOffset (Day 1 is offset 0 = Today)
    const dayOffset = totalDaysAvailable > 1
      ? Math.min(totalDaysAvailable - 1, Math.floor((i / numTopics) * totalDaysAvailable))
      : 0;

    const scheduledDate = new Date(startDate.getTime() + dayOffset * 86400000);
    const dateStr = scheduledDate.toISOString().split('T')[0];
    const currentTopic = allTopics[i];

    dailyPlans.push({
      course_id: courseId,
      user_id: userId,
      day_number: dayOffset + 1,
      scheduled_date: dateStr,
      module_name: currentTopic.moduleName,
      topic_title: currentTopic.topicTitle,
      topic_description: `Focus on mastering ${currentTopic.topicTitle}. Dedicate at least ${currentTopic.estimatedMinutes} minutes to deep reading, flashcards, and hands-on exercises.`,
      estimated_minutes: currentTopic.estimatedMinutes,
      status: 'pending'
    });

    // Create a micro-assignment for this topic
    assignments.push({
      course_id: courseId,
      user_id: userId,
      title: `${currentTopic.topicTitle} Practice & Summary`,
      description: `Complete review exercises, document key formulas/theorems, and prepare 3 self-test questions for ${currentTopic.topicTitle}.`,
      due_date: dateStr,
      due_time: '20:30:00',
      status: 'pending',
      max_score: 100
    });

    // Schedule checkpoint quiz every 3 topics or on final topic
    if ((i + 1) % 3 === 0 || i === numTopics - 1) {
      tests.push({
        course_id: courseId,
        user_id: userId,
        title: `Checkpoint Quiz: ${currentTopic.moduleName}`,
        description: `Comprehensive diagnostic quiz evaluating mastery of ${currentTopic.moduleName}.`,
        pass_criteria: 70,
        duration_minutes: 20,
        total_questions: 5,
        assigned_date: dateStr,
        due_date: new Date(scheduledDate.getTime() + 86400000).toISOString().split('T')[0],
        status: 'assigned',
        topic: currentTopic.moduleName
      });
    }
  }

  return { dailyPlans, assignments, tests };
}

async function saveGeneratedPlan({ courseId, userId, dailyPlans, assignments, tests }) {
  // Clear any existing future pending plans for this course
  await db.run(`DELETE FROM study_plans WHERE course_id = ? AND status = 'pending'`, [courseId]);
  await db.run(`DELETE FROM assignments WHERE course_id = ? AND status = 'pending'`, [courseId]);

  const insertedPlanIds = [];

  for (const plan of dailyPlans) {
    const res = await db.run(
      `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan.course_id, plan.user_id, plan.day_number, plan.scheduled_date, plan.module_name, plan.topic_title, plan.topic_description, plan.estimated_minutes, plan.status]
    );
    insertedPlanIds.push(res.insertId);
  }

  for (let i = 0; i < assignments.length; i++) {
    const assign = assignments[i];
    const planId = insertedPlanIds[i] || null;
    await db.run(
      `INSERT INTO assignments (course_id, user_id, study_plan_id, title, description, due_date, due_time, status, max_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assign.course_id, assign.user_id, planId, assign.title, assign.description, assign.due_date, assign.due_time, assign.status, assign.max_score]
    );
  }

  for (const test of tests) {
    const quizRes = await db.run(
      `INSERT INTO tests_and_quizzes (course_id, user_id, title, description, pass_criteria, duration_minutes, total_questions, assigned_date, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [test.course_id, test.user_id, test.title, test.description, test.pass_criteria, test.duration_minutes, test.total_questions, test.assigned_date, test.due_date, test.status]
    );

    // Seed realistic questions for the generated quiz
    const quizId = quizRes.insertId;
    await seedDefaultQuizQuestions(quizId, test.topic || 'General Concepts');
  }

  return { plansCreated: dailyPlans.length, assignmentsCreated: assignments.length, testsCreated: tests.length };
}

async function seedDefaultQuizQuestions(quizId, topic) {
  const sampleQuestions = [
    {
      q: `What is the primary objective of studying ${topic}?`,
      type: 'mcq',
      opts: ['To build foundational intuition and practical problem-solving capability', 'To memorize arbitrary terms without context', 'To replace algorithmic complexity with hardware speed', 'None of the above'],
      ans: 'A',
      exp: `${topic} builds systematic engineering intuition and verifiable knowledge structures.`
    },
    {
      q: `Which metric is most critical when verifying correctness in ${topic}?`,
      type: 'mcq',
      opts: ['Execution time only', 'Boundary condition validation and deterministic state transitions', 'Source file length in bytes', 'Color scheme of the editor'],
      ans: 'B',
      exp: 'Boundary conditions and state invariants guarantee formal correctness under all inputs.'
    },
    {
      q: `How can one optimize study retention for ${topic}?`,
      type: 'mcq',
      opts: ['Cramming 12 hours the night before', 'Active recall, spaced repetition, and practical coding exercises', 'Passive re-reading of slides', 'Skipping quizzes'],
      ans: 'B',
      exp: 'Active recall and spaced intervals have the highest empirical retention rates.'
    }
  ];

  for (const sq of sampleQuestions) {
    await db.run(
      `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [quizId, sq.q, sq.type, JSON.stringify(sq.opts), sq.ans, sq.exp, topic]
    );
  }
}

module.exports = {
  generateSchedule,
  saveGeneratedPlan,
  seedDefaultQuizQuestions
};
