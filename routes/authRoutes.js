const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminSecret, rollNo, department, year, section } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'student';

    // Verify admin secret if registering as admin
    if (assignedRole === 'admin') {
      const validAdminKey = process.env.ADMIN_SECRET_KEY || 'ADMIN2026';
      if (!adminSecret || adminSecret.trim() !== validAdminKey) {
        return res.status(403).json({ 
          message: 'Invalid Admin Secret Key. Please provide the authorized admin key.' 
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      rollNo: assignedRole === 'student' ? (rollNo || '').trim() : '',
      department: (department || 'Computer Science').trim(),
      year: assignedRole === 'student' ? (year || '1st Year').trim() : 'N/A',
      section: assignedRole === 'student' ? (section || 'A').trim().toUpperCase() : 'N/A'
    });

    await newUser.save();

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: `${assignedRole === 'admin' ? 'Admin' : 'Student'} registered successfully.`,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        rollNo: newUser.rollNo,
        department: newUser.department,
        year: newUser.year,
        section: newUser.section
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // If expectedRole is provided by login form, check matching role
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ 
        message: `Account is registered as ${user.role.toUpperCase()}, not ${expectedRole.toUpperCase()}. Please use the ${user.role} login option.` 
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        department: user.department,
        year: user.year,
        section: user.section
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      rollNo: req.user.rollNo,
      department: req.user.department,
      year: req.user.year,
      section: req.user.section
    }
  });
});

module.exports = router;
