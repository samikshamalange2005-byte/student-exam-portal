const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/exams
// Students only see exams matching their own year and section (or "All")
// Admin sees all exams (optional filters supported)
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      // STRICT FILTER: Match student's year, and match section or "All"
      query.year = req.user.year;
      query.$or = [
        { section: req.user.section },
        { section: 'All' }
      ];
    } else if (req.user.role === 'admin') {
      // Optional query filters for admin
      if (req.query.year) query.year = req.query.year;
      if (req.query.section && req.query.section !== 'All') query.section = req.query.section;
      if (req.query.department) query.department = req.query.department;
    }

    const exams = await Exam.find(query).sort({ examDate: 1, startTime: 1 });
    return res.json({
      success: true,
      count: exams.length,
      exams
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return res.status(500).json({ message: 'Error retrieving exams.', error: error.message });
  }
});

// POST /api/exams (Admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      subjectName,
      subjectCode,
      examDate,
      startTime,
      endTime,
      department,
      year,
      section,
      room
    } = req.body;

    if (!subjectName || !subjectCode || !examDate || !startTime || !endTime || !year || !section) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: Subject Name, Subject Code, Date, Start Time, End Time, Year, and Section.' 
      });
    }

    const newExam = new Exam({
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim().toUpperCase(),
      examDate,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      department: (department || 'Computer Science').trim(),
      year: year.trim(),
      section: section.trim(),
      room: (room || 'Exam Hall 1').trim(),
      createdBy: req.user._id
    });

    await newExam.save();

    return res.status(201).json({
      success: true,
      message: 'Exam schedule created successfully.',
      exam: newExam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    return res.status(500).json({ message: 'Error creating exam schedule.', error: error.message });
  }
});

// DELETE /api/exams/:id (Admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam timetable record not found.' });
    }

    await Exam.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Exam schedule deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return res.status(500).json({ message: 'Error deleting exam schedule.', error: error.message });
  }
});

// GET /api/exams/stats (Admin only)
router.get('/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const distinctDepartments = await Exam.distinct('department');

    // Count exams for today or upcoming
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingExams = await Exam.countDocuments({ examDate: { $gte: todayStr } });

    return res.json({
      success: true,
      stats: {
        totalExams,
        totalStudents,
        totalDepartments: distinctDepartments.length || 1,
        upcomingExams
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({ message: 'Error getting exam statistics.', error: error.message });
  }
});

module.exports = router;
