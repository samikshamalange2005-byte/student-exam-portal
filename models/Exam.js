const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  examDate: {
    type: String, // Stored as YYYY-MM-DD for straightforward comparison and display
    required: true
  },
  startTime: {
    type: String,
    required: true,
    trim: true
  },
  endTime: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: 'Computer Science'
  },
  year: {
    type: String,
    required: true,
    trim: true // e.g. '1st Year', '2nd Year', '3rd Year', '4th Year'
  },
  section: {
    type: String,
    required: true,
    trim: true // e.g. 'A', 'B', 'C', or 'All'
  },
  room: {
    type: String,
    trim: true,
    default: 'Examination Hall'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Exam', examSchema);
