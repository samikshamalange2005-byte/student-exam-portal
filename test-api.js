// Automated verification script for College Exam Timetable Portal
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

async function runTests() {
  console.log('--- Starting College Exam Timetable Verification ---');
  const timestamp = Date.now();

  // Test 1: Health check
  console.log('1. Checking Server Health...');
  const health = await request(`${BASE_URL}/api/health`);
  console.log('Health Response:', health.data);
  if (health.status !== 200 || health.data.database !== 'connected') {
    throw new Error('Database is not connected or server is unhealthy.');
  }
  console.log('✓ Server and MongoDB are healthy!\n');

  // Test 2: Register Admin
  console.log('2. Registering Admin user...');
  const adminEmail = `admin_${timestamp}@college.edu`;
  const adminRes = await request(`${BASE_URL}/api/auth/register`, { method: 'POST' }, {
    name: 'Dr. Exam Controller',
    email: adminEmail,
    password: 'adminPassword123',
    role: 'admin',
    adminSecret: 'ADMIN2026',
    department: 'Examination Cell'
  });
  console.log('Admin Register Status:', adminRes.status, adminRes.data.message);
  if (adminRes.status !== 201) throw new Error('Failed to register admin: ' + JSON.stringify(adminRes.data));
  const adminToken = adminRes.data.token;
  console.log('✓ Admin registered successfully!\n');

  // Test 3: Register Student A (2nd Year, Section A)
  console.log('3. Registering Student A (2nd Year, Section A)...');
  const studentAEmail = `studentA_${timestamp}@college.edu`;
  const studentARes = await request(`${BASE_URL}/api/auth/register`, { method: 'POST' }, {
    name: 'Alice Johnson',
    email: studentAEmail,
    password: 'studentPassword123',
    role: 'student',
    rollNo: '24CS001',
    department: 'Computer Science',
    year: '2nd Year',
    section: 'A'
  });
  console.log('Student A Status:', studentARes.status, studentARes.data.message);
  if (studentARes.status !== 201) throw new Error('Failed to register Student A');
  const studentAToken = studentARes.data.token;
  console.log('✓ Student A registered successfully!\n');

  // Test 4: Register Student B (3rd Year, Section B)
  console.log('4. Registering Student B (3rd Year, Section B)...');
  const studentBEmail = `studentB_${timestamp}@college.edu`;
  const studentBRes = await request(`${BASE_URL}/api/auth/register`, { method: 'POST' }, {
    name: 'Bob Smith',
    email: studentBEmail,
    password: 'studentPassword123',
    role: 'student',
    rollNo: '23CS042',
    department: 'Computer Science',
    year: '3rd Year',
    section: 'B'
  });
  console.log('Student B Status:', studentBRes.status, studentBRes.data.message);
  if (studentBRes.status !== 201) throw new Error('Failed to register Student B');
  const studentBToken = studentBRes.data.token;
  console.log('✓ Student B registered successfully!\n');

  // Test 5: Admin creates 3 exams
  console.log('5. Admin adding 3 exams with distinct year & section assignments...');
  // Exam 1: 2nd Year, Section A
  const exam1 = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Data Structures and Algorithms',
    subjectCode: 'CS201',
    examDate: '2026-10-15',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    year: '2nd Year',
    section: 'A',
    department: 'Computer Science',
    room: 'Hall 101'
  });
  console.log('Created Exam 1 (2nd Year, Sec A):', exam1.status);

  // Exam 2: 3rd Year, Section B
  const exam2 = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Operating Systems & Concurrency',
    subjectCode: 'CS301',
    examDate: '2026-10-16',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    year: '3rd Year',
    section: 'B',
    department: 'Computer Science',
    room: 'Hall 204'
  });
  console.log('Created Exam 2 (3rd Year, Sec B):', exam2.status);

  // Exam 3: 2nd Year, All Sections
  const exam3 = await request(`${BASE_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    subjectName: 'Engineering Mathematics II',
    subjectCode: 'MA201',
    examDate: '2026-10-18',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    year: '2nd Year',
    section: 'All',
    department: 'Computer Science',
    room: 'Auditorium'
  });
  console.log('Created Exam 3 (2nd Year, All Sections):', exam3.status);
  console.log('✓ All 3 exams scheduled by Admin!\n');

  // Test 6: Verify Student A class-specific timetable
  console.log('6. Verifying Student A (2nd Year, Sec A) timetable...');
  const examsForA = await request(`${BASE_URL}/api/exams`, {
    headers: { 'Authorization': `Bearer ${studentAToken}` }
  });
  const listA = examsForA.data.exams;
  console.log(`Student A received ${listA.length} exams:`, listA.map(e => `${e.subjectCode} (${e.year} Sec ${e.section})`));

  const hasExam1 = listA.some(e => e.subjectCode === 'CS201');
  const hasExam3 = listA.some(e => e.subjectCode === 'MA201');
  const hasExam2 = listA.some(e => e.subjectCode === 'CS301');

  if (!hasExam1 || !hasExam3 || hasExam2) {
    throw new Error('Filtering failed for Student A: Expected CS201 and MA201, did not expect CS301.');
  }
  console.log('✓ Student A correctly received ONLY their 2nd Year (Section A & All) exams!\n');

  // Test 7: Verify Student B class-specific timetable
  console.log('7. Verifying Student B (3rd Year, Sec B) timetable...');
  const examsForB = await request(`${BASE_URL}/api/exams`, {
    headers: { 'Authorization': `Bearer ${studentBToken}` }
  });
  const listB = examsForB.data.exams;
  console.log(`Student B received ${listB.length} exams:`, listB.map(e => `${e.subjectCode} (${e.year} Sec ${e.section})`));

  const bHasExam2 = listB.some(e => e.subjectCode === 'CS301');
  const bHasExam1 = listB.some(e => e.subjectCode === 'CS201');
  const bHasExam3 = listB.some(e => e.subjectCode === 'MA201');

  if (!bHasExam2 || bHasExam1 || bHasExam3) {
    throw new Error('Filtering failed for Student B: Expected CS301, did not expect CS201 or MA201.');
  }
  console.log('✓ Student B correctly received ONLY their 3rd Year (Section B) exam!\n');

  // Test 8: Admin master list & delete functionality
  console.log('8. Admin viewing all exams and deleting Exam 1...');
  const masterList = await request(`${BASE_URL}/api/exams`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Admin sees all exams: total count = ${masterList.data.exams.length}`);
  if (masterList.data.exams.length < 3) throw new Error('Admin should see all exams');

  const deleteRes = await request(`${BASE_URL}/api/exams/${exam1.data.exam._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Delete status:', deleteRes.status, deleteRes.data.message);
  if (deleteRes.status !== 200) throw new Error('Failed to delete exam');
  console.log('✓ Exam deletion verified!\n');

  console.log('========================================================');
  console.log(' ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('========================================================');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
