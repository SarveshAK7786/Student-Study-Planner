const cron = require('node-cron');
const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

/**
 * Gather performance statistics for a student and send dual alerts to Student & Linked Parent(s)
 */
async function processDailyAlertsForStudent(studentId) {
  const student = await db.get(`SELECT id, name, email, email_alerts_enabled FROM users WHERE id = ? AND role = 'student'`, [studentId]);
  if (!student) return null;

  // Find linked parents
  const linkedParents = await db.query(
    `SELECT u.id, u.name, u.email, u.email_alerts_enabled
     FROM parent_student_links psl
     JOIN users u ON psl.parent_id = u.id
     WHERE psl.student_id = ? AND psl.status = 'active'`,
    [studentId]
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Tasks completed vs missed today
  const todayAssignments = await db.query(
    `SELECT title, status, due_time, score, max_score FROM assignments 
     WHERE user_id = ? AND due_date = ?`,
    [studentId, todayStr]
  );

  const completedTasks = todayAssignments.filter(a => a.status === 'completed');
  const pendingOrMissedTasks = todayAssignments.filter(a => a.status !== 'completed');

  // 2. Recent test scores
  const recentSubmissions = await db.query(
    `SELECT qs.score, qs.total_marks, qs.percentage, qs.passed, t.title, qs.submitted_at
     FROM quiz_submissions qs
     JOIN tests_and_quizzes t ON qs.quiz_id = t.id
     WHERE qs.user_id = ?
     ORDER BY qs.submitted_at DESC LIMIT 3`,
    [studentId]
  );

  // 3. Overall course completion percentages
  const courses = await db.query(
    `SELECT c.id, c.name,
       (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id AND sp.status = 'completed') AS completed_plans,
       (SELECT COUNT(*) FROM study_plans sp WHERE sp.course_id = c.id) AS total_plans
     FROM courses c
     WHERE c.user_id = ?`,
    [studentId]
  );

  const courseStats = courses.map(c => {
    const total = c.total_plans || 1;
    const completed = c.completed_plans || 0;
    const pct = Math.min(100, Math.round((completed / total) * 100));
    return { name: c.name, completed, total, percentage: pct };
  });

  const overallAvgCompletion = courseStats.length > 0
    ? Math.round(courseStats.reduce((acc, curr) => acc + curr.percentage, 0) / courseStats.length)
    : 0;

  // 4. Progress streak
  const progressRow = await db.get(
    `SELECT streak_count, minutes_studied FROM student_progress WHERE user_id = ? AND date = ?`,
    [studentId, todayStr]
  );
  const streak = progressRow ? progressRow.streak_count : 1;
  const minutesToday = progressRow ? progressRow.minutes_studied : 0;

  // Build recipients list
  const results = [];
  const recipients = [];

  // Add student if alerts enabled
  if (student.email_alerts_enabled) {
    recipients.push({
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student'
    });
  }

  // Add linked parents if alerts enabled
  for (const parent of linkedParents) {
    if (parent.email_alerts_enabled) {
      recipients.push({
        id: parent.id,
        name: parent.name,
        email: parent.email,
        role: 'parent'
      });
    }
  }

  for (const recipient of recipients) {
    const isParent = recipient.role === 'parent';
    const subject = isParent
      ? `📈 Daily Progress Report: ${student.name}'s Academic Summary (${todayStr})`
      : `🔥 Your Daily Study Digest & Achievements for ${todayStr}`;

    const greeting = isParent
      ? `Dear ${recipient.name}, here is the daily academic progress summary for your child <strong>${student.name}</strong>.`
      : `Hi ${student.name}, great work on your studies today! Here is your daily performance breakdown.`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
          .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }
          .title { color: #6366f1; font-size: 24px; font-weight: bold; margin: 0; }
          .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .stat-card { background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #334155; }
          .stat-val { font-size: 22px; font-weight: bold; color: #38bdf8; }
          .stat-lbl { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
          .section-title { font-size: 16px; font-weight: 600; color: #e2e8f0; margin-top: 16px; margin-bottom: 8px; border-left: 4px solid #6366f1; padding-left: 8px; }
          .badge-done { color: #4ade80; font-weight: 600; }
          .badge-missed { color: #f87171; font-weight: 600; }
          .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">Smart Study Planner</h1>
            <p style="color: #94a3b8; margin-top: 4px;">Automated Daily Digest</p>
          </div>

          <p style="font-size: 15px; color: #cbd5e1;">${greeting}</p>

          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-val">${overallAvgCompletion}%</div>
              <div class="stat-lbl">Overall Completion</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${streak} Days 🔥</div>
              <div class="stat-lbl">Active Study Streak</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${completedTasks.length} / ${todayAssignments.length}</div>
              <div class="stat-lbl">Tasks Completed Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${minutesToday}m</div>
              <div class="stat-lbl">Focused Time Studied</div>
            </div>
          </div>

          <div class="section-title">Today's Assignments Status</div>
          ${todayAssignments.length === 0 ? '<p style="color: #94a3b8; font-size: 14px;">No assignments were scheduled for today.</p>' : `
            <ul style="padding-left: 20px; font-size: 14px; color: #cbd5e1;">
              ${todayAssignments.map(a => `
                <li style="margin-bottom: 6px;">
                  <strong>${a.title}</strong> — <span class="${a.status === 'completed' ? 'badge-done' : 'badge-missed'}">${a.status.toUpperCase()}</span> (Due: ${a.due_time})
                </li>
              `).join('')}
            </ul>
          `}

          <div class="section-title">Course Progress Breakdown</div>
          ${courseStats.map(c => `
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">
                <span>${c.name}</span>
                <span><strong>${c.percentage}%</strong> (${c.completed}/${c.total} topics)</span>
              </div>
              <div style="background: #334155; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: #6366f1; height: 100%; width: ${c.percentage}%;"></div>
              </div>
            </div>
          `).join('')}

          ${recentSubmissions.length > 0 ? `
            <div class="section-title">Recent Quiz Performance</div>
            <ul style="padding-left: 20px; font-size: 14px; color: #cbd5e1;">
              ${recentSubmissions.map(q => `
                <li><strong>${q.title}</strong>: ${q.percentage}% (${q.score}/${q.total_marks}) - ${q.passed ? '<span class="badge-done">PASSED</span>' : '<span class="badge-missed">NEEDS REVIEW</span>'}</li>
              `).join('')}
            </ul>
          ` : ''}

          <div class="footer">
            Sent automatically by Smart Study Planner at ${new Date().toLocaleTimeString()} • <a href="http://localhost:5173" style="color: #38bdf8;">Open Student Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const summaryText = `Completed ${completedTasks.length}/${todayAssignments.length} assignments. Course completion: ${overallAvgCompletion}%. Current study streak: ${streak} days.`;

    const sendRes = await sendEmail({
      to: recipient.email,
      subject,
      html: emailHtml,
      text: summaryText
    });

    // Audit log in database
    await db.run(
      `INSERT INTO daily_alerts (recipient_id, recipient_role, recipient_email, student_id, subject, summary_text, details_json, delivery_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipient.id,
        recipient.role,
        recipient.email,
        studentId,
        subject,
        summaryText,
        JSON.stringify({
          completedTasks: completedTasks.length,
          missedTasks: pendingOrMissedTasks.length,
          overallAvgCompletion,
          streak,
          previewUrl: sendRes.previewUrl
        }),
        sendRes.success ? 'sent' : 'failed'
      ]
    );

    results.push({
      recipient: recipient.email,
      role: recipient.role,
      status: sendRes.success ? 'delivered' : 'failed',
      previewUrl: sendRes.previewUrl
    });
  }

  return { studentId, alertsSent: results };
}

/**
 * Trigger daily alerts for ALL active students (called by cron at 8:00 PM or manual trigger)
 */
async function triggerDailyAlertsForAllStudents() {
  const students = await db.query(`SELECT id FROM users WHERE role = 'student' AND is_active = 1`);
  const report = [];

  for (const s of students) {
    const res = await processDailyAlertsForStudent(s.id);
    if (res) report.push(res);
  }

  console.log(`[AlertService] Processed daily digests for ${report.length} students at ${new Date().toLocaleTimeString()}`);
  return report;
}

/**
 * Initialize Scheduled Cron Job
 * Default: Daily at 8:00 PM (20:00)
 */
function initAlertScheduler() {
  const hour = process.env.DAILY_ALERT_HOUR || '20';
  const cronExpression = `0 ${hour} * * *`;

  cron.schedule(cronExpression, async () => {
    console.log(`[AlertService] Running scheduled daily 8:00 PM alert job...`);
    try {
      await triggerDailyAlertsForAllStudents();
    } catch (err) {
      console.error('[AlertService] Error during scheduled alert run:', err);
    }
  });

  console.log(`[AlertService] Scheduled automated daily alerts at ${hour}:00 every day.`);
}

module.exports = {
  processDailyAlertsForStudent,
  triggerDailyAlertsForAllStudents,
  initAlertScheduler
};
