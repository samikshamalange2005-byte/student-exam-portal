// Seed sample data for demonstration
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Exam = require('./models/Exam');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_timetable_db';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for seeding...');

  // Create demo Admin
  const adminEmail = 'admin@college.edu';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    admin = await User.create({
      name: 'Prof. Arthur Pendelton',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      department: 'Examination Cell',
      year: 'N/A',
      section: 'N/A'
    });
    console.log('✓ Created demo Admin: admin@college.edu (password: admin123)');
  }

  // Create demo Student 1: 2nd Year, Section A
  const student1Email = 'alice@college.edu';
  let student1 = await User.findOne({ email: student1Email });
  if (!student1) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    student1 = await User.create({
      name: 'Alice Johnson',
      email: student1Email,
      password: hashedPassword,
      role: 'student',
      rollNo: '24CS001',
      department: 'Computer Science',
      year: '2nd Year',
      section: 'A'
    });
    console.log('✓ Created demo Student 1: alice@college.edu (2nd Year, Sec A / password: student123)');
  }

  // Create demo Student 2: 3rd Year, Section B
  const student2Email = 'bob@college.edu';
  let student2 = await User.findOne({ email: student2Email });
  if (!student2) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    student2 = await User.create({
      name: 'Bob Smith',
      email: student2Email,
      password: hashedPassword,
      role: 'student',
      rollNo: '23CS042',
      department: 'Computer Science',
      year: '3rd Year',
      section: 'B'
    });
    console.log('✓ Created demo Student 2: bob@college.edu (3rd Year, Sec B / password: student123)');
  }

  // Check if exams already exist
  const examCount = await Exam.countDocuments();
  if (examCount === 0) {
    const today = new Date();
    
    const formatDate = (daysAhead) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString().split('T')[0];
    };

    const sampleExams = [
      {
        subjectName: 'Data Structures & Algorithms',
        subjectCode: 'CS201',
        examDate: formatDate(3),
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        year: '2nd Year',
        section: 'A',
        department: 'Computer Science',
        room: 'Block A - Hall 101',
        createdBy: admin._id
      },
      {
        subjectName: 'Database Management Systems',
        subjectCode: 'CS202',
        examDate: formatDate(5),
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        year: '2nd Year',
        section: 'A',
        department: 'Computer Science',
        room: 'Block A - Hall 102',
        createdBy: admin._id
      },
      {
        subjectName: 'Engineering Mathematics II',
        subjectCode: 'MA201',
        examDate: formatDate(8),
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        year: '2nd Year',
        section: 'All',
        department: 'Computer Science',
        room: 'Main Auditorium',
        createdBy: admin._id
      },
      {
        subjectName: 'Computer Networks',
        subjectCode: 'CS301',
        examDate: formatDate(4),
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        year: '3rd Year',
        section: 'B',
        department: 'Computer Science',
        room: 'Block B - Hall 204',
        createdBy: admin._id
      },
      {
        subjectName: 'Compiler Design',
        subjectCode: 'CS302',
        examDate: formatDate(7),
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        year: '3rd Year',
        section: 'B',
        department: 'Computer Science',
        room: 'Block B - Hall 205',
        createdBy: admin._id
      }
    ];

    await Exam.insertMany(sampleExams);
    console.log('✓ Inserted 5 sample exam schedules across 2nd & 3rd Years!');
  }

  console.log('Seeding completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
