// Test student custom branch, year, and section filtering
async function testStudentFilters() {
  console.log('Testing Student Custom Branch/Year/Section Filtering...');

  // 1. Login as Student
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@college.edu', password: 'student123', expectedRole: 'student' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // 2. Default fetch (no query params -> should return 2nd Year Section A / All)
  const defaultRes = await fetch('http://localhost:5000/api/exams', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const defaultData = await defaultRes.json();
  console.log(`Default view for Alice (2nd Year, Sec A): ${defaultData.exams.length} exams.`);
  const allMatchDefault = defaultData.exams.every(e => e.year === '2nd Year' && (e.section === 'A' || e.section === 'All'));
  if (!allMatchDefault) throw new Error('Default filtering failed');
  console.log('✓ Default filtering works correctly!');

  // 3. Custom filter: 3rd Year, Section B
  const filterRes1 = await fetch('http://localhost:5000/api/exams?year=3rd%20Year&section=B', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const filterData1 = await filterRes1.json();
  console.log(`Filtered view (3rd Year, Sec B): ${filterData1.exams.length} exams.`);
  const allMatchFilter1 = filterData1.exams.every(e => e.year === '3rd Year' && (e.section === 'B' || e.section === 'All'));
  if (!allMatchFilter1) throw new Error('Custom year/section filtering failed');
  console.log('✓ Custom 3rd Year, Section B filtering works correctly!');

  // 4. Custom filter: All Years, All Sections
  const filterResAll = await fetch('http://localhost:5000/api/exams?year=All&section=All', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const filterDataAll = await filterResAll.json();
  console.log(`Filtered view (All Years, All Sections): ${filterDataAll.exams.length} exams.`);
  if (filterDataAll.exams.length < defaultData.exams.length) throw new Error('All filter returned fewer exams');
  console.log('✓ "All Years & All Sections" view works correctly!');

  console.log('====================================================');
  console.log(' ALL STUDENT FILTER TESTS PASSED! (100%)');
  console.log('====================================================');
}

testStudentFilters().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
