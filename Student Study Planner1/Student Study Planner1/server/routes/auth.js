const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/authMiddleware');

function generateInviteCode(name) {
  const prefix = (name.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'STU').toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STU-${prefix}-${rand}`;
}

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const validRoles = ['student', 'parent', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (role === 'admin' && cleanEmail !== 'adminse2007@gmail.com') {
      return res.status(403).json({ error: 'Admin registration is restricted. Only adminse2007@gmail.com is authorized.' });
    }

    const existing = await db.get(`SELECT id FROM users WHERE email = ?`, [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inviteCode = role === 'student' ? generateInviteCode(name) : null;

    const result = await db.run(
      `INSERT INTO users (name, email, password_hash, role, invite_code, phone_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), cleanEmail, passwordHash, role, inviteCode, phone_number || null]
    );

    const userId = result.insertId;
    const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        role,
        invite_code: inviteCode,
        phone_number
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login with Email & Password
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Strict security rule: Admin login is ONLY allowed for adminse2007@gmail.com
    if (role === 'admin' && cleanEmail !== 'adminse2007@gmail.com') {
      return res.status(403).json({ error: 'Admin login is only allowed for email: adminse2007@gmail.com' });
    }

    const user = await db.get(`SELECT * FROM users WHERE email = ?`, [cleanEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role === 'admin' && cleanEmail !== 'adminse2007@gmail.com') {
      return res.status(403).json({ error: 'Admin login is only allowed for email: adminse2007@gmail.com' });
    }

    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account was registered using Google Sign-In. Please sign in using Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Ensure adminse2007@gmail.com always has admin role in response and JWT token
    const userRole = cleanEmail === 'adminse2007@gmail.com' ? 'admin' : user.role;

    const token = jwt.sign({ userId: user.id, email: user.email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        invite_code: user.invite_code,
        avatar_url: user.avatar_url,
        phone_number: user.phone_number
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// OAuth 2.0 (Google Sign-In integration)
router.post('/google', async (req, res) => {
  try {
    const { email, name, google_id, avatar_url, role = 'student' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google authentication requires email.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Prevent non-adminse2007 accounts from acquiring admin role via Google sign-in
    if (role === 'admin' && cleanEmail !== 'adminse2007@gmail.com') {
      return res.status(403).json({ error: 'Admin access is restricted to adminse2007@gmail.com only.' });
    }

    const effectiveRole = cleanEmail === 'adminse2007@gmail.com' ? 'admin' : (role === 'admin' ? 'student' : role);
    let user = await db.get(`SELECT * FROM users WHERE email = ?`, [cleanEmail]);

    if (!user) {
      const inviteCode = effectiveRole === 'student' ? generateInviteCode(name || 'GoogleUser') : null;
      const result = await db.run(
        `INSERT INTO users (name, email, role, google_id, avatar_url, invite_code, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [name || 'Google User', cleanEmail, effectiveRole, google_id || `g_${Date.now()}`, avatar_url || null, inviteCode]
      );
      user = await db.get(`SELECT * FROM users WHERE id = ?`, [result.insertId]);
    } else {
      if (user.is_active === 0 || user.is_active === false) {
        return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
      }

      // Update role if user chose a different role (e.g. Student vs Parent)
      const updates = [];
      const params = [];
      const targetRole = cleanEmail === 'adminse2007@gmail.com' ? 'admin' : (user.role === 'admin' ? 'student' : effectiveRole);
      if (targetRole && user.role !== targetRole) {
        updates.push('role = ?');
        params.push(targetRole);
        user.role = targetRole;
        if (targetRole === 'student' && !user.invite_code) {
          const newCode = generateInviteCode(user.name);
          updates.push('invite_code = ?');
          params.push(newCode);
          user.invite_code = newCode;
        }
      }
      if (name && name.trim() && name !== 'Google User' && name !== user.name) {
        updates.push('name = ?');
        params.push(name.trim());
        user.name = name.trim();
      }
      if (google_id && !user.google_id) {
        updates.push('google_id = ?');
        params.push(google_id);
      }
      if (avatar_url && !user.avatar_url) {
        updates.push('avatar_url = ?');
        params.push(avatar_url);
      }
      if (updates.length > 0) {
        params.push(user.id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Google authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        invite_code: user.invite_code,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google: ' + err.message });
  }
});

// Get Current User Profile & Connections
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let linkedData = {};

    if (req.user.role === 'parent') {
      const children = await db.query(
        `SELECT u.id, u.name, u.email, u.invite_code, psl.linked_at
         FROM parent_student_links psl
         JOIN users u ON psl.student_id = u.id
         WHERE psl.parent_id = ? AND psl.status = 'active'`,
        [req.user.id]
      );
      linkedData.children = children;
    } else if (req.user.role === 'student') {
      const parents = await db.query(
        `SELECT u.id, u.name, u.email, psl.linked_at
         FROM parent_student_links psl
         JOIN users u ON psl.parent_id = u.id
         WHERE psl.student_id = ? AND psl.status = 'active'`,
        [req.user.id]
      );
      linkedData.linked_parents = parents;
    }

    res.json({
      user: req.user,
      ...linkedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Link Parent Account to Student via unique Invite Code or student email
router.post('/link-parent', authenticateToken, async (req, res) => {
  try {
    const { invite_code, student_email } = req.body;
    const parentId = (req.user.role === 'parent' || req.user.role === 'admin') ? req.user.id : null;

    if (!parentId) {
      return res.status(403).json({ error: 'Only parent or admin accounts can link to students via this endpoint.' });
    }

    let student = null;
    if (invite_code) {
      const cleanCode = invite_code.trim().toUpperCase();
      student = await db.get(
        `SELECT id, name, email FROM users WHERE (invite_code = ? OR invite_code LIKE ?) AND role = 'student'`,
        [cleanCode, `%${cleanCode}%`]
      );
    } else if (student_email) {
      student = await db.get(`SELECT id, name, email FROM users WHERE email = ? AND role = 'student'`, [student_email.trim().toLowerCase()]);
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found with provided invite code or email.' });
    }

    const existingLink = await db.get(
      `SELECT id FROM parent_student_links WHERE parent_id = ? AND student_id = ?`,
      [parentId, student.id]
    );

    if (existingLink) {
      return res.status(400).json({ error: `Already linked to student ${student.name}.` });
    }

    await db.run(
      `INSERT INTO parent_student_links (parent_id, student_id, status) VALUES (?, ?, 'active')`,
      [parentId, student.id]
    );

    res.json({
      message: `Successfully linked to student ${student.name}!`,
      student: { id: student.id, name: student.name, email: student.email }
    });
  } catch (err) {
    console.error('Link student error:', err);
    res.status(500).json({ error: 'Failed to link student.' });
  }
});

module.exports = router;
