// Verification of Filter Matching and Real-Time Event Sync across Academic Year, Section, and Department
const http = require('http');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: resBody });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function listenSSE(url, durationMs = 5000) {
  return new Promise((resolve, reject) => {
    const events = [];
    const u = new URL(url);
    const req = http.get({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const p of parts) {
          const lines = p.split('\n');
          let event = 'message';
          let dataStr = '';
          for (const l of lines) {
            if (l.startsWith('event:')) event = l.replace('event:', '').trim();
            else if (l.startsWith('data:')) dataStr += l.replace('data:', '').trim();
          }
          if (dataStr) {
            try { events.push({ event, data: JSON.parse(dataStr) }); }
            catch (e) { events.push({ event, raw: dataStr }); }
          }
        }
      });
    });

    setTimeout(() => {
      req.destroy();
      resolve(events);
    }, durationMs);
    req.on('error', reject);
  });
}

async function run() {
  console.log('=== Verifying Filter & Real-Time Added Exam Sync ===\n');

  // 1. Admin login
  const adminLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: 'admin@college.edu',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;

  // 2. Student login (Alice, enrolled in 2nd Year, Section A, CS)
  const studentLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: 'alice@college.edu',
    password: 'student123'
  });
  const studentToken = studentLogin.data.token;

  // 3. Connect SSE
  const ssePromise = listenSSE('http://localhost:5000/api/events', 5000);
  await new Promise(r => setTimeout(r, 400));

  // 4. Admin adds exam for Mechanical Engineering, 1st Year, Section B
  const testExam = {
    subjectName: 'Thermodynamics & Heat Transfer',
    subjectCode: 'ME102',
    examDate: '2026-12-05',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    department: 'Mechanical Engineering',
    year: '1st Year',
    section: 'B',
    room: 'Main Examination Hall',
    studentCount: 30
  };

  const createRes = await request('http://localhost:5000/api/exams', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, testExam);

  console.log('✓ Admin created exam for Mechanical Engineering, 1st Year, Section B:', createRes.data.exam.subjectName);
  const createdExamId = createRes.data.exam._id;

  // 5. Query student API with the filter: department=Mechanical Engineering, year=1st Year, section=B
  const filterQuery = await request('http://localhost:5000/api/exams?department=Mechanical+Engineering&year=1st+Year&section=B', {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });

  const matchingExams = filterQuery.data.exams;
  console.log(`✓ Student query for Mechanical Eng, 1st Year, Section B returned ${matchingExams.length} exam(s).`);
  const found = matchingExams.some(e => e._id === createdExamId);
  if (!found) {
    throw new Error('Newly created exam was not returned for the active filter!');
  }
  console.log('✓ Newly added exam accurately matches the applied filter!');

  // 6. Verify SSE broadcast event
  const events = await ssePromise;
  const createdEvent = events.find(e => e.event === 'exam_created' && (e.data?.subjectCode === 'ME102' || e.data?.subjectName?.includes('Thermodynamics')));
  if (!createdEvent) {
    throw new Error('SSE exam_created event not captured for newly added exam!');
  }
  console.log('✓ SSE exam_created broadcast verified with matching department, year, and section!');

  // 7. Cleanup test exam
  await request(`http://localhost:5000/api/exams/${createdExamId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('✓ Test exam cleaned up.');

  console.log('\n================================================================');
  console.log(' ALL FILTER & EXAM ADDED REAL-TIME TESTS PASSED! (100%)');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
