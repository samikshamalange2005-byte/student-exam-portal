// Test script to verify real-time SSE event broadcasting
const http = require('http');

async function testRealtimeEvents() {
  console.log('Testing Real-Time Server-Sent Events (SSE)...');

  // 1. Login as Admin
  const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@college.edu', password: 'admin123', expectedRole: 'admin' })
  });
  const adminData = await adminLoginRes.json();
  const token = adminData.token;

  let eventReceived = false;

  // 2. Open SSE stream
  const req = http.request('http://localhost:5000/api/events', (res) => {
    res.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('exam_created')) {
        console.log('✓ SUCCESS: Client received real-time "exam_created" event:');
        console.log(text.trim());
        eventReceived = true;
      }
    });
  });
  req.end();

  // Wait 1 second for SSE connection to establish
  await new Promise(r => setTimeout(r, 1000));

  // 3. Post a new exam as Admin
  const uniqueDate = `2027-12-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
  const createRes = await fetch('http://localhost:5000/api/exams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subjectName: 'Realtime Distributed Systems',
      subjectCode: 'CS499',
      examDate: uniqueDate,
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      year: '2nd Year',
      section: 'A',
      department: 'Computer Science',
      room: 'Hall 101',
      studentCount: 20
    })
  });
  const createData = await createRes.json();
  console.log('Created test exam:', createData.message);

  // Wait 2 seconds to receive event
  await new Promise(r => setTimeout(r, 2000));

  // 4. Clean up
  if (createData.exam && createData.exam._id) {
    await fetch(`http://localhost:5000/api/exams/${createData.exam._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  req.destroy();

  if (eventReceived) {
    console.log('====================================================');
    console.log(' ALL REAL-TIME BROADCAST TESTS PASSED! (100%)');
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error('Failed to receive real-time event.');
    process.exit(1);
  }
}

testRealtimeEvents().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
