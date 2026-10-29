const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbDriver = null; // 'mysql' or 'sqlite'
let mysqlPool = null;
let sqliteDb = null;

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_study_planner',
};

async function initDatabase() {
  // 1. First attempt MySQL connection
  try {
    const mysql = require('mysql2/promise');
    
    // Attempt initial connection to host to check / create database
    const initialConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    await initialConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initialConn.end();

    // Create pool for smart_study_planner
    mysqlPool = mysql.createPool({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true
    });

    // Test connection
    const testConn = await mysqlPool.getConnection();
    await testConn.ping();
    testConn.release();

    dbDriver = 'mysql';
    console.log(`[Database] Successfully connected to MySQL 8.0 on ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

    // Create tables in MySQL if not exist
    await createMySQLTables();
    await seedInitialData();
    await ensureAdminUser();
    return;
  } catch (mysqlErr) {
    console.warn(`[Database] MySQL connection notice: ${mysqlErr.message}`);
    console.warn(`[Database] Gracefully activating local zero-config SQLite storage so application runs immediately!`);
  }

  // 2. Fallback to SQLite
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbDir = path.resolve(__dirname, '../../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'study_planner_local.db');

    sqliteDb = new sqlite3.Database(dbPath);
    dbDriver = 'sqlite';
    console.log(`[Database] Active database driver: SQLite (${dbPath})`);

    await createSQLiteTables();
    await seedInitialData();
    await ensureAdminUser();
  } catch (sqliteErr) {
    console.error(`[Database Critical Error] Failed to initialize both MySQL and SQLite:`, sqliteErr);
  }
}

// Unified query runner
async function query(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  } else if (dbDriver === 'sqlite') {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
  throw new Error('Database driver not initialized');
}

// Unified single-row getter
async function get(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [rows] = await mysqlPool.query(sql, params);
    return rows[0] || null;
  } else if (dbDriver === 'sqlite') {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }
  throw new Error('Database driver not initialized');
}

// Unified write/insert/update runner returning insertId and affectedRows
async function run(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [result] = await mysqlPool.query(sql, params);
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  } else if (dbDriver === 'sqlite') {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({
          insertId: this.lastID,
          affectedRows: this.changes
        });
      });
    });
  }
  throw new Error('Database driver not initialized');
}

// MySQL Table Creation
async function createMySQLTables() {
  const schemaFile = path.resolve(__dirname, '../../database/schema.sql');
  if (fs.existsSync(schemaFile)) {
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    // Split into individual statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

    for (const stmt of statements) {
      try {
        await mysqlPool.query(stmt);
      } catch (e) {
        // Ignore table exists or slight syntax differences
        if (!e.message.includes('already exists')) {
          // Log only unexpected errors
          // console.warn('Schema execute note:', e.message);
        }
      }
    }
  }
}

// SQLite Table Creation (compatible DDL)
async function createSQLiteTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      google_id TEXT NULL UNIQUE,
      avatar_url TEXT NULL,
      invite_code TEXT NULL UNIQUE,
      phone_number TEXT NULL,
      is_active INTEGER DEFAULT 1,
      daily_reminder_time TEXT DEFAULT '20:00',
      email_alerts_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS parent_student_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (parent_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT NULL,
      description TEXT NULL,
      target_completion_date DATE NOT NULL,
      target_hours_per_day REAL NOT NULL DEFAULT 2.00,
      syllabus_modules TEXT NULL,
      difficulty TEXT DEFAULT 'medium',
      color_code TEXT DEFAULT '#4F46E5',
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      module_name TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      topic_description TEXT NULL,
      estimated_minutes INTEGER NOT NULL DEFAULT 60,
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at DATETIME NULL,
      notes_snippet TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      study_plan_id INTEGER NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      due_date DATE NOT NULL,
      due_time TEXT NOT NULL DEFAULT '23:59:00',
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at DATETIME NULL,
      score INTEGER DEFAULT NULL,
      max_score INTEGER DEFAULT 100,
      submission_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tests_and_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      pass_criteria INTEGER NOT NULL DEFAULT 60,
      duration_minutes INTEGER NOT NULL DEFAULT 20,
      total_questions INTEGER NOT NULL DEFAULT 5,
      assigned_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'mcq',
      options TEXT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NULL,
      topic TEXT NULL,
      FOREIGN KEY (quiz_id) REFERENCES tests_and_quizzes(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS quiz_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      percentage REAL NOT NULL,
      passed INTEGER NOT NULL,
      weak_areas TEXT NULL,
      strong_areas TEXT NULL,
      student_answers TEXT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES tests_and_quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS student_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NULL,
      date DATE NOT NULL,
      minutes_studied INTEGER NOT NULL DEFAULT 0,
      completed_modules_count INTEGER NOT NULL DEFAULT 0,
      tests_taken_count INTEGER NOT NULL DEFAULT 0,
      average_test_score REAL DEFAULT NULL,
      streak_count INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_concepts TEXT NULL,
      takeaways TEXT NULL,
      flashcards TEXT NULL,
      model_used TEXT DEFAULT 'claude-3-5-sonnet',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS daily_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_id INTEGER NOT NULL,
      recipient_role TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      details_json TEXT NULL,
      delivery_status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const q of queries) {
    await run(q);
  }
}

// Seed Demo Data if tables are empty
async function seedInitialData() {
  const existingUsers = await query(`SELECT COUNT(*) as count FROM users`);
  const count = existingUsers[0].count || existingUsers[0]['COUNT(*)'] || 0;
  if (count > 0) return; // Already seeded

  console.log('[Database] Seeding realistic demo data (Student, Parent, Admin, Courses, Plans, Quizzes)...');

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Seed Student
  const studentResult = await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number)
     VALUES (?, ?, ?, 'student', 'STU-SARV-9821', '+1 (555) 234-5678')`,
    ['Sarvesh (Student)', 'student@study.edu', defaultPassword]
  );
  const studentId = studentResult.insertId;

  // 2. Seed Parent
  const parentResult = await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number)
     VALUES (?, ?, ?, 'parent', NULL, '+1 (555) 876-5432')`,
    ['Mrs. Ananya Sharma (Parent)', 'parent@family.com', defaultPassword]
  );
  const parentId = parentResult.insertId;

  // 3. Seed Admin
  await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, is_active)
     VALUES (?, ?, ?, 'admin', NULL, 1)`,
    ['Prof. Vikramaditya (Admin)', 'admin@studyplanner.io', defaultPassword]
  );

  // 4. Link Parent to Student
  await run(
    `INSERT INTO parent_student_links (parent_id, student_id, status) VALUES (?, ?, 'active')`,
    [parentId, studentId]
  );

  // 5. Seed Courses for Student
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const in20Days = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];

  const course1 = await run(
    `INSERT INTO courses (user_id, name, code, description, target_completion_date, target_hours_per_day, syllabus_modules, difficulty, color_code)
     VALUES (?, ?, ?, ?, ?, 2.5, ?, 'hard', '#4F46E5')`,
    [
      studentId,
      'Software Engineering & System Design',
      'CS-301',
      'Covers SDLC models, Agile Scrum, UML modeling, Microservices, and Testing.',
      in30Days,
      JSON.stringify([
        { moduleNumber: 1, title: 'Agile Methodologies & Requirements', hours: 6 },
        { moduleNumber: 2, title: 'Architectural Patterns & UML', hours: 8 },
        { moduleNumber: 3, title: 'Database Design & Normalization', hours: 10 },
        { moduleNumber: 4, title: 'CI/CD Pipelines & DevOps', hours: 6 },
        { moduleNumber: 5, title: 'Software Testing & QA', hours: 5 }
      ])
    ]
  );
  const course1Id = course1.insertId;

  const course2 = await run(
    `INSERT INTO courses (user_id, name, code, description, target_completion_date, target_hours_per_day, syllabus_modules, difficulty, color_code)
     VALUES (?, ?, ?, ?, ?, 1.5, ?, 'medium', '#06B6D4')`,
    [
      studentId,
      'Data Structures & Algorithms',
      'CS-202',
      'Graph algorithms, Dynamic Programming, Heap trees, and Complexity analysis.',
      in20Days,
      JSON.stringify([
        { moduleNumber: 1, title: 'Binary Trees & BST Operations', hours: 5 },
        { moduleNumber: 2, title: 'Graph Traversal (BFS & DFS)', hours: 7 },
        { moduleNumber: 3, title: 'Dynamic Programming Memoization', hours: 9 }
      ])
    ]
  );
  const course2Id = course2.insertId;

  // 6. Seed Study Plans
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const day3 = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const plan1 = await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 1, ?, 'Agile Methodologies', 'Scrum Sprints & Backlog Grooming', 'Deep dive into user stories, sprint planning ceremonies, and velocity burndown charts.', 75, 'completed')`,
    [course1Id, studentId, today]
  );

  const plan2 = await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 2, ?, 'Architectural Patterns', 'Client-Server vs Microservices Architecture', 'Comparing monolithic bottlenecks with decoupled API microservices and event brokers.', 90, 'pending')`,
    [course1Id, studentId, tomorrow]
  );

  await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 3, ?, 'Database Design', 'Third Normal Form (3NF) & Relational Integrity', 'Eliminating transitive dependencies and designing relational foreign key constraints.', 60, 'pending')`,
    [course1Id, studentId, day3]
  );

  // 7. Seed Daily Assignments with Specific Due Times
  await run(
    `INSERT INTO assignments (course_id, user_id, study_plan_id, title, description, due_date, due_time, status, score, max_score)
     VALUES (?, ?, ?, 'Scrum Sprint Case Study', 'Write a 2-page critique of the Waterfall vs Scrum transition for a FinTech app.', ?, '18:00:00', 'completed', 92, 100)`,
    [course1Id, studentId, plan1.insertId, today]
  );

  await run(
    `INSERT INTO assignments (course_id, user_id, study_plan_id, title, description, due_date, due_time, status)
     VALUES (?, ?, ?, 'Microservices Decoupling Exercise', 'Diagram the API gateway, auth service, and study planner database boundaries.', ?, '21:30:00', 'pending')`,
    [course1Id, studentId, plan2.insertId, today]
  );

  // 8. Seed Quiz and Questions
  const quizResult = await run(
    `INSERT INTO tests_and_quizzes (course_id, user_id, title, description, pass_criteria, duration_minutes, total_questions, assigned_date, due_date, status)
     VALUES (?, ?, 'Software Architecture & Agile Mastery Quiz', 'Evaluate your comprehension of Scrum artifacts, REST APIs, and Database Normalization.', 70, 15, 3, ?, ?, 'assigned')`,
    [course1Id, studentId, today, tomorrow]
  );
  const quizId = quizResult.insertId;

  // Quiz Questions
  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'C', 'Sprint Planning sets the sprint goal and backlog items, whereas daily standups are for short progress syncs.', 'Agile Scrum')`,
    [
      quizId,
      'Which Agile Scrum ceremony is exclusively focused on determining the sprint backlog items and sprint goal?',
      JSON.stringify(['A) Daily Scrum', 'B) Sprint Retrospective', 'C) Sprint Planning', 'D) Backlog Refinement'])
    ]
  );

  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'B', '3NF requires that every non-key attribute is non-transitively dependent on the primary key (no A -> B -> C transitive relationship).', 'Database Normalization')`,
    [
      quizId,
      'A database table is in Third Normal Form (3NF) if and only if it is in 2NF and:',
      JSON.stringify([
        'A) All attributes are atomic',
        'B) No non-prime attribute is transitively dependent on any candidate key',
        'C) It has no foreign keys',
        'D) All candidate keys consist of single columns'
      ])
    ]
  );

  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'A', 'An API Gateway acts as the single entry point, handling routing, rate limiting, and SSL termination.', 'System Architecture')`,
    [
      quizId,
      'In a microservices architecture, what is the primary role of an API Gateway?',
      JSON.stringify([
        'A) Single entry point for routing, authentication, and request aggregation',
        'B) Direct database storage for microservices',
        'C) Compiler for frontend assets',
        'D) Operating system kernel replacement'
      ])
    ]
  );

  // 9. Seed AI Notes
  await run(
    `INSERT INTO notes (user_id, course_id, topic, summary, key_concepts, takeaways, flashcards, model_used)
     VALUES (?, ?, 'Agile Scrum Framework & Sprint Cycles', ?, ?, ?, ?, 'claude-3-5-sonnet')`,
    [
      studentId,
      course1Id,
      'Agile Scrum is an iterative project management methodology designed for complex software projects with evolving requirements.',
      JSON.stringify([
        'Product Backlog: Prioritized list of all desired work',
        'Sprint: Time-boxed iteration (typically 1-4 weeks)',
        'Burn-down Chart: Graphical representation of work left versus time',
        'Scrum Master: Facilitator who removes impediments'
      ]),
      JSON.stringify([
        'Focus on working software over comprehensive documentation',
        'Continuous feedback loops prevent costly late-stage architectural pivots',
        'Maintain sustainable pace and velocity across sprints'
      ]),
      JSON.stringify([
        { q: 'What is the maximum recommended duration for Daily Standup?', a: '15 minutes' },
        { q: 'Who prioritizes the Product Backlog?', a: 'The Product Owner' }
      ])
    ]
  );

  // 10. Seed Student Progress
  await run(
    `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, completed_modules_count, tests_taken_count, average_test_score, streak_count)
     VALUES (?, ?, ?, 125, 2, 1, 88.5, 4)`,
    [studentId, course1Id, today]
  );

  console.log('[Database] Seed data successfully populated!');
}

async function ensureAdminUser() {
  try {
    const adminEmail = 'adminse2007@gmail.com';
    const adminPassword = 'Adminse@2026';
    const hash = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await get(`SELECT id, email, role FROM users WHERE email = ?`, [adminEmail]);
    if (existingAdmin) {
      await run(
        `UPDATE users SET password_hash = ?, role = 'admin', is_active = 1 WHERE email = ?`,
        [hash, adminEmail]
      );
    } else {
      await run(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, 'admin', 1)`,
        ['System Administrator', adminEmail, hash]
      );
    }

    // Demote any other accounts with role = 'admin' so only adminse2007@gmail.com is admin
    await run(
      `UPDATE users SET role = 'student' WHERE role = 'admin' AND email != ?`,
      [adminEmail]
    );

    console.log(`[Database] Verified authorized admin account: ${adminEmail}`);
  } catch (err) {
    console.warn(`[Database] ensureAdminUser note:`, err.message);
  }
}

async function resetPlatformData() {
  console.log('[Database] Resetting platform data to clean initial state...');

  const tables = [
    'daily_alerts',
    'notes',
    'student_progress',
    'quiz_submissions',
    'quiz_questions',
    'tests_and_quizzes',
    'assignments',
    'study_plans',
    'courses',
    'parent_student_links',
    'users'
  ];

  for (const table of tables) {
    try {
      await run(`DELETE FROM ${table}`);
      if (dbDriver === 'sqlite') {
        await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]).catch(() => {});
      }
    } catch (e) {
      console.warn(`Error clearing ${table}:`, e.message);
    }
  }

  const defaultPassword = await bcrypt.hash('Password123!', 10);
  const sarveshPassword = await bcrypt.hash('SarveshAK@123', 10);
  const adminPassword = await bcrypt.hash('Adminse@2026', 10);

  // 1. Admin
  await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, is_active)
     VALUES (?, ?, ?, 'admin', NULL, 1)`,
    ['System Administrator', 'adminse2007@gmail.com', adminPassword]
  );

  // 2. Main Student (Sarvesh)
  const sarveshRes = await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number, is_active)
     VALUES (?, ?, ?, 'student', 'STU-SARV-9821', '+91 98765 43210', 1)`,
    ['Sarvesh', 'sarvesha195@gmail.com', sarveshPassword]
  );
  const sarveshId = sarveshRes.insertId;

  // 3. Demo Student
  const studentResult = await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number, is_active)
     VALUES (?, ?, ?, 'student', 'STU-DEMO-1001', '+1 (555) 234-5678', 1)`,
    ['Sarvesh (Student)', 'student@study.edu', defaultPassword]
  );
  const studentId = studentResult.insertId;

  // 4. Demo Parent
  const parentResult = await run(
    `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number, is_active)
     VALUES (?, ?, ?, 'parent', NULL, '+1 (555) 876-5432', 1)`,
    ['Mrs. Ananya Sharma (Parent)', 'parent@family.com', defaultPassword]
  );
  const parentId = parentResult.insertId;

  // 5. Link Parent to Students
  await run(
    `INSERT INTO parent_student_links (parent_id, student_id, status) VALUES (?, ?, 'active')`,
    [parentId, sarveshId]
  );
  await run(
    `INSERT INTO parent_student_links (parent_id, student_id, status) VALUES (?, ?, 'active')`,
    [parentId, studentId]
  );

  // 6. Seed Courses for Sarvesh
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const in20Days = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];

  const course1 = await run(
    `INSERT INTO courses (user_id, name, code, description, target_completion_date, target_hours_per_day, syllabus_modules, difficulty, color_code)
     VALUES (?, ?, ?, ?, ?, 2.5, ?, 'hard', '#4F46E5')`,
    [
      sarveshId,
      'Software Engineering & System Design',
      'CS-301',
      'Covers SDLC models, Agile Scrum, UML modeling, Microservices, and Testing.',
      in30Days,
      JSON.stringify([
        { moduleNumber: 1, title: 'Agile Methodologies & Requirements', hours: 6 },
        { moduleNumber: 2, title: 'Architectural Patterns & UML', hours: 8 },
        { moduleNumber: 3, title: 'Database Design & Normalization', hours: 10 },
        { moduleNumber: 4, title: 'CI/CD Pipelines & DevOps', hours: 6 },
        { moduleNumber: 5, title: 'Software Testing & QA', hours: 5 }
      ])
    ]
  );
  const course1Id = course1.insertId;

  const course2 = await run(
    `INSERT INTO courses (user_id, name, code, description, target_completion_date, target_hours_per_day, syllabus_modules, difficulty, color_code)
     VALUES (?, ?, ?, ?, ?, 1.5, ?, 'medium', '#06B6D4')`,
    [
      sarveshId,
      'Data Structures & Algorithms',
      'CS-202',
      'Graph algorithms, Dynamic Programming, Heap trees, and Complexity analysis.',
      in20Days,
      JSON.stringify([
        { moduleNumber: 1, title: 'Binary Trees & BST Operations', hours: 5 },
        { moduleNumber: 2, title: 'Graph Traversal (BFS & DFS)', hours: 7 },
        { moduleNumber: 3, title: 'Dynamic Programming Memoization', hours: 9 }
      ])
    ]
  );
  const course2Id = course2.insertId;

  // 7. Seed Study Plans
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const day3 = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const plan1 = await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 1, ?, 'Agile Methodologies', 'Scrum Sprints & Backlog Grooming', 'Deep dive into user stories, sprint planning ceremonies, and velocity burndown charts.', 75, 'completed')`,
    [course1Id, sarveshId, today]
  );

  const plan2 = await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 2, ?, 'Architectural Patterns', 'Client-Server vs Microservices Architecture', 'Comparing monolithic bottlenecks with decoupled API microservices and event brokers.', 90, 'pending')`,
    [course1Id, sarveshId, tomorrow]
  );

  await run(
    `INSERT INTO study_plans (course_id, user_id, day_number, scheduled_date, module_name, topic_title, topic_description, estimated_minutes, status)
     VALUES (?, ?, 3, ?, 'Database Design', 'Third Normal Form (3NF) & Relational Integrity', 'Eliminating transitive dependencies and designing relational foreign key constraints.', 60, 'pending')`,
    [course1Id, sarveshId, day3]
  );

  // 8. Seed Assignments
  await run(
    `INSERT INTO assignments (course_id, user_id, study_plan_id, title, description, due_date, due_time, status, score, max_score)
     VALUES (?, ?, ?, 'Scrum Sprint Case Study', 'Write a 2-page critique of the Waterfall vs Scrum transition for a FinTech app.', ?, '18:00:00', 'completed', 92, 100)`,
    [course1Id, sarveshId, plan1.insertId, today]
  );

  await run(
    `INSERT INTO assignments (course_id, user_id, study_plan_id, title, description, due_date, due_time, status)
     VALUES (?, ?, ?, 'Microservices Decoupling Exercise', 'Diagram the API gateway, auth service, and study planner database boundaries.', ?, '21:30:00', 'pending')`,
    [course1Id, sarveshId, plan2.insertId, today]
  );

  // 9. Seed Quiz and Questions
  const quizResult = await run(
    `INSERT INTO tests_and_quizzes (course_id, user_id, title, description, pass_criteria, duration_minutes, total_questions, assigned_date, due_date, status)
     VALUES (?, ?, 'Software Architecture & Agile Mastery Quiz', 'Evaluate your comprehension of Scrum artifacts, REST APIs, and Database Normalization.', 70, 15, 3, ?, ?, 'assigned')`,
    [course1Id, sarveshId, today, tomorrow]
  );
  const quizId = quizResult.insertId;

  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'C', 'Sprint Planning sets the sprint goal and backlog items, whereas daily standups are for short progress syncs.', 'Agile Scrum')`,
    [
      quizId,
      'Which Agile Scrum ceremony is exclusively focused on determining the sprint backlog items and sprint goal?',
      JSON.stringify(['A) Daily Scrum', 'B) Sprint Retrospective', 'C) Sprint Planning', 'D) Backlog Refinement'])
    ]
  );

  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'B', '3NF requires that every non-key attribute is non-transitively dependent on the primary key.', 'Database Normalization')`,
    [
      quizId,
      'A database table is in Third Normal Form (3NF) if and only if it is in 2NF and:',
      JSON.stringify([
        'A) All attributes are atomic',
        'B) No non-prime attribute is transitively dependent on any candidate key',
        'C) It has no foreign keys',
        'D) All candidate keys consist of single columns'
      ])
    ]
  );

  await run(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, explanation, topic)
     VALUES (?, ?, 'mcq', ?, 'A', 'An API Gateway acts as the single entry point, handling routing, rate limiting, and SSL termination.', 'System Architecture')`,
    [
      quizId,
      'In a microservices architecture, what is the primary role of an API Gateway?',
      JSON.stringify([
        'A) Single entry point for routing, authentication, and request aggregation',
        'B) Direct database storage for microservices',
        'C) Compiler for frontend assets',
        'D) Operating system kernel replacement'
      ])
    ]
  );

  // 10. Seed AI Notes
  await run(
    `INSERT INTO notes (user_id, course_id, topic, summary, key_concepts, takeaways, flashcards, model_used)
     VALUES (?, ?, 'Agile Scrum Framework & Sprint Cycles', ?, ?, ?, ?, 'claude-3-5-sonnet')`,
    [
      sarveshId,
      course1Id,
      'Agile Scrum is an iterative project management methodology designed for complex software projects with evolving requirements.',
      JSON.stringify([
        'Product Backlog: Prioritized list of all desired work',
        'Sprint: Time-boxed iteration (typically 1-4 weeks)',
        'Burn-down Chart: Graphical representation of work left versus time',
        'Scrum Master: Facilitator who removes impediments'
      ]),
      JSON.stringify([
        'Focus on working software over comprehensive documentation',
        'Continuous feedback loops prevent costly late-stage architectural pivots',
        'Maintain sustainable pace and velocity across sprints'
      ]),
      JSON.stringify([
        { q: 'What is the maximum recommended duration for Daily Standup?', a: '15 minutes' },
        { q: 'Who prioritizes the Product Backlog?', a: 'The Product Owner' }
      ])
    ]
  );

  // 11. Seed Student Progress
  await run(
    `INSERT INTO student_progress (user_id, course_id, date, minutes_studied, completed_modules_count, tests_taken_count, average_test_score, streak_count)
     VALUES (?, ?, ?, 125, 2, 1, 88.5, 4)`,
    [sarveshId, course1Id, today]
  );

  console.log('[Database] Platform data reset successfully completed!');
}

function getDbStatus() {
  return {
    driver: dbDriver,
    connected: !!dbDriver,
    databaseName: dbDriver === 'mysql' ? DB_CONFIG.database : 'study_planner_local.db',
    host: dbDriver === 'mysql' ? `${DB_CONFIG.host}:${DB_CONFIG.port}` : 'Local SQLite Storage'
  };
}

module.exports = {
  initDatabase,
  query,
  get,
  run,
  getDbStatus,
  resetPlatformData
};
