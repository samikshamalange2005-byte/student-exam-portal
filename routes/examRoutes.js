const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const User = require('../models/User');
const Room = require('../models/Room');
const { verifyToken, requireRole } = require('../middleware/auth');

// Convert "10:00 AM" or "14:30" string to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');
  const parts = cleaned.replace(/AM|PM/g, '').trim().split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Check if two time intervals [s1, e1] and [s2, e2] overlap
function doTimesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// GET /api/exams
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
// Enforces room capacity and prevents overlapping room bookings
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
      room,
      roomId,
      studentCount
    } = req.body;

    if (!subjectName || !subjectCode || !examDate || !startTime || !endTime || !year || !section) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: Subject Name, Subject Code, Date, Start Time, End Time, Year, and Section.' 
      });
    }

    // 1. Resolve Room
    let targetRoom = null;
    if (roomId) {
      targetRoom = await Room.findById(roomId);
    }
    if (!targetRoom && room) {
      targetRoom = await Room.findOne({ name: { $regex: new RegExp(`^${room.trim()}$`, 'i') } });
    }
    if (!targetRoom) {
      // Fallback: create or use default room
      const roomName = (room || 'Main Examination Hall').trim();
      targetRoom = await Room.findOne({ name: roomName });
      if (!targetRoom) {
        targetRoom = await Room.create({ name: roomName, capacity: 60 });
      }
    }

    // 2. Resolve & Validate Student Count vs Room Capacity
    let assignedStudents = parseInt(studentCount, 10);
    if (isNaN(assignedStudents) || assignedStudents <= 0) {
      // Calculate enrolled students in target class
      const studentQuery = { role: 'student', year: year.trim() };
      if (section.trim() !== 'All') {
        studentQuery.section = section.trim();
      }
      const actualCount = await User.countDocuments(studentQuery);
      assignedStudents = actualCount > 0 ? actualCount : 30; // fallback standard class size
    }

    if (assignedStudents > targetRoom.capacity) {
      return res.status(400).json({
        message: `Room capacity exceeded! Room "${targetRoom.name}" has a seating capacity of ${targetRoom.capacity}, but ${assignedStudents} students are assigned for ${year} - Section ${section}.`
      });
    }

    // 3. Validate Room Booking Overlaps (Prevent scheduling conflict)
    const clashingExams = await Exam.find({
      examDate: examDate,
      $or: [
        { roomId: targetRoom._id },
        { room: targetRoom.name }
      ]
    });

    for (const existing of clashingExams) {
      if (doTimesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
        return res.status(400).json({
          message: `Booking Conflict! Room "${targetRoom.name}" is already assigned to "${existing.subjectName}" (${existing.year} - Section ${existing.section}) on ${examDate} from ${existing.startTime} to ${existing.endTime}. Please select another room or time.`
        });
      }
    }

    // 4. Create and save the Exam
    const newExam = new Exam({
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim().toUpperCase(),
      examDate,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      department: (department || 'Computer Science').trim(),
      year: year.trim(),
      section: section.trim(),
      room: targetRoom.name,
      roomId: targetRoom._id,
      roomCapacity: targetRoom.capacity,
      studentCount: assignedStudents,
      createdBy: req.user._id
    });

    await newExam.save();

    return res.status(201).json({
      success: true,
      message: `Exam scheduled successfully in ${targetRoom.name} (Capacity: ${targetRoom.capacity}, Students: ${assignedStudents}).`,
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
    const totalRooms = await Room.countDocuments();
    const distinctDepartments = await Exam.distinct('department');

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingExams = await Exam.countDocuments({ examDate: { $gte: todayStr } });

    return res.json({
      success: true,
      stats: {
        totalExams,
        totalStudents,
        totalRooms,
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
