// Automated verification script for Room Management, Capacity Checks, and Booking Clash Prevention
const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runRoomTests() {
  console.log('=== Starting Room & Clash Prevention Verification ===');
  const timestamp = Date.now();

  // 1. Login as Admin
  console.log('1. Logging in as Admin...');
  const adminLogin = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'admin@college.edu',
    password: 'admin123',
    expectedRole: 'admin'
  });
  if (adminLogin.status !== 200) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.token;
  console.log('✓ Admin authenticated successfully!\n');

  // 2. Create a test room with small capacity
  console.log('2. Creating Test Room with capacity 30...');
  const roomName = `Lab_Test_${timestamp}`;
  const roomRes = await request(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    name: roomName,
    capacity: 30
  });
  console.log('Create Room Response:', roomRes.status, roomRes.data.message);
  if (roomRes.status !== 201) throw new Error('Failed to create room');
  const testRoomId = roomRes.data.room._id;
  console.log(`✓ Room "${roomName}" created with capacity 30!\n`);

  // 3. Test Room Capacity Violation
  console.log('3. Testing Room Capacity Limit (assigning 45 students to a 30-capacity room)...');
  const overCapacityExam = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Over Capacity Subject',
    subjectCode: 'TEST101',
    examDate: '2026-11-20',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    year: '1st Year',
    section: 'A',
    department: 'Computer Science',
    roomId: testRoomId,
    studentCount: 45 // EXCEEDS 30
  });

  console.log('Over Capacity Status Code:', overCapacityExam.status);
  console.log('Over Capacity Message:', overCapacityExam.data.message);
  if (overCapacityExam.status !== 400 || !overCapacityExam.data.message.includes('capacity exceeded')) {
    throw new Error('Capacity validation failed: System allowed exam with student count exceeding room capacity!');
  }
  console.log('✓ Successfully blocked exam creation due to room capacity violation!\n');

  // 4. Test Valid Exam Schedule in Room
  console.log('4. Scheduling Exam 1 within valid room capacity (25 students in 30-capacity room)...');
  const examDate = '2026-11-20';
  const exam1 = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Morning Paper A',
    subjectCode: 'TEST102',
    examDate: examDate,
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    year: '2nd Year',
    section: 'A',
    department: 'Computer Science',
    roomId: testRoomId,
    studentCount: 25
  });
  console.log('Exam 1 Status Code:', exam1.status, exam1.data.message);
  if (exam1.status !== 201) throw new Error('Failed to schedule valid exam');
  const exam1Id = exam1.data.exam._id;
  console.log('✓ Exam 1 successfully scheduled!\n');

  // 5. Test Room Overlap / Time Clash Prevention
  console.log('5. Testing Overlapping Room Booking in same room at same time (11:30 AM - 02:30 PM)...');
  const clashingExam = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Clashing Midday Paper',
    subjectCode: 'TEST103',
    examDate: examDate,
    startTime: '11:30 AM',
    endTime: '02:30 PM', // Overlaps with 10:00 AM - 01:00 PM!
    year: '3rd Year',
    section: 'B',
    department: 'Computer Science',
    roomId: testRoomId,
    studentCount: 20
  });

  console.log('Clash Status Code:', clashingExam.status);
  console.log('Clash Message:', clashingExam.data.message);
  if (clashingExam.status !== 400 || !clashingExam.data.message.includes('Conflict')) {
    throw new Error('Overlap prevention failed: System allowed overlapping room booking!');
  }
  console.log('✓ Successfully detected and blocked overlapping room booking!\n');

  // 6. Test Non-Overlapping Slot on Same Date & Same Room
  console.log('6. Scheduling Exam 2 in same room on same date at non-overlapping time (02:00 PM - 05:00 PM)...');
  const nonClashingExam = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Afternoon Paper B',
    subjectCode: 'TEST104',
    examDate: examDate,
    startTime: '02:00 PM',
    endTime: '05:00 PM', // No overlap!
    year: '2nd Year',
    section: 'A',
    department: 'Computer Science',
    roomId: testRoomId,
    studentCount: 25
  });

  console.log('Non-clashing Exam Status Code:', nonClashingExam.status, nonClashingExam.data.message);
  if (nonClashingExam.status !== 201) throw new Error('Failed to schedule non-overlapping exam in same room');
  const exam2Id = nonClashingExam.data.exam._id;
  console.log('✓ Non-overlapping exam accepted and scheduled successfully!\n');

  // 7. Verify Student View Receives Room Number & Timings
  console.log('7. Verifying Student Portal reflects assigned room and timings...');
  const studentLogin = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'alice@college.edu',
    password: 'student123',
    expectedRole: 'student'
  });
  const studentToken = studentLogin.data.token;
  const studentExamsRes = await request(`${BASE_URL}/api/exams`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });

  const matchingExams = studentExamsRes.data.exams.filter(e => e.room === roomName);
  console.log(`Student Alice received ${matchingExams.length} test exams scheduled for her class in "${roomName}":`);
  matchingExams.forEach(e => {
    console.log(`  - ${e.subjectName} (${e.subjectCode}): ${e.startTime} - ${e.endTime} | Room: ${e.room} (Cap: ${e.roomCapacity})`);
  });
  if (matchingExams.length === 0) throw new Error('Student did not receive assigned room info');
  console.log('✓ Student dashboard accurately displays assigned room numbers, capacities, and timings!\n');

  // Clean up test records
  console.log('8. Cleaning up test records...');
  await request(`${BASE_URL}/api/exams/${exam1Id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });
  await request(`${BASE_URL}/api/exams/${exam2Id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });
  await request(`${BASE_URL}/api/rooms/${testRoomId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });
  console.log('✓ Test cleanup complete!\n');

  console.log('================================================================');
  console.log(' ALL ROOM MANAGEMENT & CLASH PREVENTION TESTS PASSED! (100%)');
  console.log('================================================================');
}

runRoomTests().catch(err => {
  console.error('❌ Room test failed:', err);
  process.exit(1);
});
