const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_timetable_db';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend folder
app.use(express.static(path.join(__dirname, 'public')));

const { addClient } = require('./utils/sse');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/rooms', roomRoutes);

// Real-time Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
  addClient(req, res);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Friendly route fallbacks for SPA / clean URLs
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Database connection & Server start
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[Database] Successfully connected to MongoDB at ${MONGODB_URI}`);
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` College Exam Timetable Portal Server is Running!`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(` Admin Portal: http://localhost:${PORT}/login.html?role=admin`);
      console.log(` Student Portal: http://localhost:${PORT}/login.html?role=student`);
      console.log(`=======================================================`);
    });
  })
  .catch((err) => {
    console.error('[Database] MongoDB connection error:', err.message);
    process.exit(1);
  });
