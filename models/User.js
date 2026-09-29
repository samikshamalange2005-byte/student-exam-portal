const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student',
    required: true
  },
  rollNo: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: 'General'
  },
  year: {
    type: String,
    trim: true,
    default: '1st Year' // e.g., '1st Year', '2nd Year', '3rd Year', '4th Year'
  },
  section: {
    type: String,
    trim: true,
    default: 'A' // e.g., 'A', 'B', 'C'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
