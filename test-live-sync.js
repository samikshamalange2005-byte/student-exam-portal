// Verification Script for Live Sync between Admin and Student Portals
const http = require('http');

async function postJSON(url, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function putJSON(url, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function deleteJSON(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'DELETE',
      headers: {}
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function listenToSSE(url, timeoutMs = 8000) {
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
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep last incomplete chunk

        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.replace('data:', '').trim();
            }
          }
          if (dataStr) {
            try {
              events.push({ event: eventName, data: JSON.parse(dataStr) });
            } catch (e) {
              events.push({ event: eventName, raw: dataStr });
            }
          }
        }
      });
    });

    const timer = setTimeout(() => {
      req.destroy();
      resolve(events);
    }, timeoutMs);

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function run() {
  console.log('=== Starting Admin-Student Live Sync Test ===\n');

  // 1. Admin login
  const adminLogin = await postJSON('http://localhost:5000/api/auth/login', {
    email: 'admin@college.edu',
    password: 'admin123'
  });
  if (adminLogin.status !== 200) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin));
  const adminToken = adminLogin.data.token;
  console.log('✓ Admin authenticated');

  // 2. Start SSE listener representing Student browser
  const ssePromise = listenToSSE('http://localhost:5000/api/events', 6000);
  console.log('✓ Student SSE client connected to http://localhost:5000/api/events');

  // Wait 400ms for connection
  await new Promise(r => setTimeout(r, 400));

  // 3. Admin creates exam
  const examPayload = {
    subjectName: 'Live Sync Test Architecture',
    subjectCode: 'SYNC401',
    examDate: '2026-11-20',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    year: '2nd Year',
    section: 'A',
    department: 'Computer Science',
    room: 'Main Examination Hall',
    studentCount: 30
  };

  const createRes = await postJSON('http://localhost:5000/api/exams', examPayload, adminToken);
  console.log('✓ Admin created exam:', createRes.data.exam.subjectName);
  const examId = createRes.data.exam._id;

  // Wait 300ms
  await new Promise(r => setTimeout(r, 300));

  // 4. Admin edits exam (reschedules room & time)
  const updatePayload = {
    ...examPayload,
    room: 'Hall 101',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    subjectName: 'Live Sync Test Architecture (Updated)'
  };
  const updateRes = await putJSON(`http://localhost:5000/api/exams/${examId}`, updatePayload, adminToken);
  console.log('✓ Admin edited exam via PUT:', updateRes.data.exam.subjectName, 'New Room:', updateRes.data.exam.room);

  // Wait 300ms
  await new Promise(r => setTimeout(r, 300));

  // 5. Admin deletes exam
  const deleteRes = await deleteJSON(`http://localhost:5000/api/exams/${examId}`, adminToken);
  console.log('✓ Admin deleted exam via DELETE:', deleteRes.data.message);

  // Wait for SSE listener to collect all events
  const events = await ssePromise;
  console.log('\n--- Received Events on Student SSE Stream ---');
  events.forEach(e => {
    console.log(`Event: ${e.event} | Payload Action: ${e.data?.action || 'N/A'} | Subject: ${e.data?.subjectName || e.data?.exam?.subjectName || 'N/A'}`);
  });

  const hasCreated = events.some(e => e.event === 'exam_created' && (e.data?.subjectName?.includes('Live Sync') || e.data?.exam?.subjectName?.includes('Live Sync')));
  const hasUpdated = events.some(e => e.event === 'exam_updated' && e.data?.subjectName?.includes('Live Sync') && e.data?.room === 'Hall 101');
  const hasDeleted = events.some(e => e.event === 'exam_deleted' && e.data?.subjectName?.includes('Live Sync'));

  console.log('\n--- Verification Checks ---');
  console.log('Exam Created event captured:', hasCreated ? 'PASS ✓' : 'FAIL ✗');
  console.log('Exam Updated event captured (Room updated to Hall 101):', hasUpdated ? 'PASS ✓' : 'FAIL ✗');
  console.log('Exam Deleted event captured:', hasDeleted ? 'PASS ✓' : 'FAIL ✗');

  if (hasCreated && hasUpdated && hasDeleted) {
    console.log('\n================================================================');
    console.log(' ALL ADMIN -> STUDENT LIVE SYNC TESTS PASSED! (100%)');
    console.log('================================================================\n');
  } else {
    throw new Error('Some live sync events were not captured.');
  }
}

run().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
