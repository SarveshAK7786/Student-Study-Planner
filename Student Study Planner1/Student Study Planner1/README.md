# 🎓 Smart Study Planner Web Application

A full-stack, production-ready **Smart Study Planner Web Application** designed for modern academic management and Software Engineering project evaluation. The platform combines dynamic scheduling algorithms, Anthropic Claude AI study mentoring, automated dual-recipient parent/student daily digest emails, interactive testing with weak-area diagnosis, Pomodoro focus tools, and a fully normalized relational MySQL database.

---

## 🌟 Key Features

### 1. 🔐 Core Authentication & Role-Based Access Control (RBAC)
- **Three User Roles:** `Student`, `Parent`, and `Admin`.
- **Authentication Methods:**
  - **Standard Email + Password:** Secure password hashing using **Bcrypt**.
  - **OAuth 2.0 (Google Sign-In):** One-click Google sign-in integration and demo flow.
  - **Student Profile Linking:** Link Parent accounts to Students using a unique **Student Invite Code** (e.g. `STU-SARV-9821`) or student email.
  - **1-Click Quick Demo Logins:** Instant test profiles for Student, Parent, and Admin without manual typing.

### 2. 📊 Multi-Step Onboarding & Dynamic Study Plan Generator
- **Multi-Step Onboarding Wizard:**
  - **Step 1:** Course & Subject Info (Name, Code, description, custom accent colors).
  - **Step 2:** Syllabus & Modules (Break down chapters, estimated study hours, and subtopics).
  - **Step 3:** Target Exam Date, Difficulty, and Available Daily Study Hours.
  - **Step 4:** AI Schedule Feasibility Preview & Automated Generation.
- **Dynamic Study Plan Generator Algorithm:**
  - Calculates days remaining until the target examination date.
  - Automatically balances module topics against daily study capacity limits.
  - Generates daily milestones, micro-assignments with assigned due times, and checkpoint quizzes.

### 3. ⏱️ Study Tools & Micro-Assignments
- **Daily Assignments with Due Times:** Scheduled daily micro-assignments (e.g. Due 20:30) with submission notes and status tracking (`pending`, `completed`, `overdue`).
- **Interactive Pomodoro Study Timer:** 
  - 25m Focus, 5m Short Break, 15m Long Break.
  - Audio chimes, visual progress rings, and automated study session logger to keep track of daily focused minutes and streaks.

### 4. 📝 AI-Generated Study Notes & Flashcards
- **Anthropic Claude Integration (`claude-3-5-sonnet`):**
  - Generates comprehensive summaries, key concepts, formulas, and high-yield exam takeaways.
  - **Interactive Flip Flashcards:** Test memory recall with flip-cards directly on the dashboard.
  - Notes saved directly to the relational database.

### 5. 🎯 Regular Testing System & Weak-Area Diagnosis
- **Interactive Quiz Module:** Timed diagnostic tests supporting Multiple Choice Questions (MCQs) and conceptual prompts.
- **Automated Grading Engine:**
  - Instant scoring with celebratory confetti.
  - **Weak vs. Strong Areas Breakdown:** Pinpoints exact topics requiring further review and provides actionable Claude AI recommendations.
  - **On-Demand AI Quiz Generator:** Generate a diagnostic quiz for any custom topic with 1 click.

### 6. 🤖 Claude AI Study Chatbot ("Claude Tutor")
- Floating, dockable AI study mentor powered by Anthropic Claude API (`claude-3-5-sonnet`).
- **Context Awareness:** Injects enrolled course syllabus and active topics into prompts.
- Solves academic doubts, explains complex theories with analogies, generates practice questions, and retains session chat context.

### 7. 📬 Automated Daily Notification & Alert System
- **Dual Recipients:** Generates and dispatches daily academic digests to **both the student and their linked parent(s)**.
- **Configurable Schedule:** Automated daily cron trigger at **8:00 PM** (`0 20 * * *`) + **"Send Daily Digest Now"** instant button for live testing.
- **Digest Metrics:**
  - Tasks completed vs. missed today.
  - Active study streak and focused hours.
  - Overall course syllabus completion percentage.
  - Recent test and quiz scores.
- **Email Delivery:** Nodemailer integration supporting live SMTP or automated Ethereal test inbox with preview links.

### 8. 👨‍👩‍👧 Parent Oversight Dashboard
- Dedicated parent view focused on supervision and progress tracking.
- Switch between linked children with 1 click.
- Monitor active study streaks, assignment watchlists, test grades, and past email digest audit logs.

### 9. 🛡️ Admin Management Console
- Platform-wide statistics (Users, Courses, Milestones, Assignments, Quizzes, Sent Alerts).
- Live database connection status.
- User management table with role updates and account activation toggles.
- Bulk notification trigger to dispatch daily progress digests to all registered students.

---

## 🗄️ Relational MySQL Database Architecture

The schema is defined in [`database/schema.sql`](file:///c:/Users/SARVESH/Documents/KITS/Third%20Sem/Software%20Engineering/Student%20Study%20Planner1/database/schema.sql) and includes 9 normalized tables:

1. **`users`**: User identity, roles (`student`, `parent`, `admin`), email, password hashes, Google OAuth ID, invite code, phone, and reminder settings.
2. **`parent_student_links`**: Relational mapping table connecting `parent_id` to `student_id` with link timestamps and status.
3. **`courses`**: Course metadata, user owner ID, target completion dates, daily hour limits, JSON syllabus modules, and colors.
4. **`study_plans`**: Algorithm-generated daily study milestones, topics, scheduled dates, estimated minutes, and completion states.
5. **`assignments`**: Micro-tasks, course ID, specific due dates & due times (`20:30:00`), status (`pending`, `completed`, `overdue`), and scores.
6. **`tests_and_quizzes`**: Quiz metadata, duration, pass criteria percentage, and assigned dates.
   - **`quiz_questions`**: Questions, options JSON, correct answers, explanations, and topic categorization.
   - **`quiz_submissions`**: Student scores, percentage, pass/fail status, weak areas JSON, and strong areas JSON.
7. **`student_progress`**: Daily activity audit, minutes studied, modules completed, test score averages, and active streak counts.
8. **`notes`**: AI-generated notes categorized by course and topic (summary, key concepts, takeaways, flashcards).
9. **`daily_alerts`**: Audit log of sent daily progress alerts, recipient roles, delivered content, and preview links.

> **Zero-Config Resilient Dual Driver:** The server automatically connects to MySQL 8.0 on `localhost:3306`. If MySQL password credentials are not yet configured in `.env`, the system gracefully activates the built-in SQLite engine (`database/study_planner_local.db`), ensuring **100% immediate out-of-the-box functionality** for evaluators!

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **MySQL Server 8.0+** (optional for live MySQL mode, service already running on your Windows system)

### Installation
Clone or navigate to the workspace directory:
```bash
cd "Student Study Planner1"
```

1. **Install Server Dependencies:**
```bash
cd server
npm install
```

2. **Install Client Dependencies:**
```bash
cd ../client
npm install
```

3. **Configure Environment Variables (Optional):**
Inspect `server/.env`:
```env
PORT=5000
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=smart_study_planner

# Optional: Add your Claude API key for live Claude 3.5 Sonnet queries
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

4. **Run the Full Stack Application:**
From the workspace root directory:
```bash
# Terminal 1: Run Backend
cd server
npm run dev

# Terminal 2: Run Frontend
cd client
npm run dev
```

Or run both concurrently from root:
```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health & DB Status:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Invite Code |
| :--- | :--- | :--- | :--- |
| **Student** | `student@study.edu` | `Password123!` | `STU-SARV-9821` |
| **Parent** | `parent@family.com` | `Password123!` | Linked to Sarvesh |
| **Admin** | `admin@studyplanner.io` | `Password123!` | Full Permissions |

*(Note: You can switch between these profiles instantly using the 1-Click Demo buttons in the Navbar and Login modal)*
