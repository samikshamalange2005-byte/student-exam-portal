// Student Dashboard Controller

document.addEventListener('DOMContentLoaded', () => {
  const user = protectPage('student');
  if (!user) return;

  setupNavUser();
  displayStudentProfile(user);
  loadMyExams();
});

function displayStudentProfile(user) {
  const greeting = document.getElementById('welcomeGreeting');
  const classBadgeText = document.getElementById('classBadgeText');
  const noticeDesc = document.getElementById('noticeDesc');

  greeting.innerText = `Welcome, ${user.name}!`;
  classBadgeText.innerText = `Enrolled in ${user.year} • Section ${user.section} • Roll No: ${user.rollNo || 'N/A'}`;
  noticeDesc.innerText = `You are only seeing exams scheduled specifically for ${user.year}, Section ${user.section} (or college-wide All Sections).`;

  document.getElementById('statStudentYear').innerText = user.year;
  document.getElementById('statStudentSection').innerText = `Section ${user.section}`;
  document.getElementById('statStudentDept').innerText = user.department || 'Computer Science';

  // For print header
  const printInfo = document.getElementById('printStudentInfo');
  if (printInfo) {
    printInfo.innerText = `Candidate: ${user.name} | Roll No: ${user.rollNo || 'N/A'} | Class: ${user.year} - Section ${user.section} | Dept: ${user.department || 'CS'}`;
  }
}

function getDayDifference(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const examDate = new Date(dateStr + 'T00:00:00');
  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString(undefined, options);
}

async function loadMyExams() {
  const container = document.getElementById('studentTimetableContainer');
  const totalCountEl = document.getElementById('statStudentTotal');
  const badgeCountEl = document.getElementById('timetableCountBadge');

  try {
    const token = getAuthToken();
    const res = await fetch('/api/exams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load exams.');

    const exams = data.exams || [];
    totalCountEl.innerText = exams.length;
    badgeCountEl.innerText = `${exams.length} ${exams.length === 1 ? 'Exam' : 'Exams'} Scheduled`;

    if (exams.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">🎉</div>
            <h3>No Scheduled Exams Found</h3>
            <p>There are no exams currently scheduled for your class (Year and Section). Enjoy your study break or check back later!</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = exams.map(exam => {
      const diffDays = getDayDifference(exam.examDate);
      let statusBadge = '';

      if (diffDays < 0) {
        statusBadge = '<span class="badge badge-gray">Finished</span>';
      } else if (diffDays === 0) {
        statusBadge = '<span class="badge badge-amber">⚠️ Today</span>';
      } else if (diffDays === 1) {
        statusBadge = '<span class="badge badge-amber">Tomorrow</span>';
      } else {
        statusBadge = `<span class="badge badge-blue">In ${diffDays} days</span>`;
      }

      return `
        <div class="exam-card">
          <div class="exam-card-header">
            <span class="subject-code-badge">${exam.subjectCode}</span>
            ${statusBadge}
          </div>

          <div class="exam-subject-name">
            ${exam.subjectName}
          </div>

          <div class="exam-info-row">
            <span class="exam-info-icon">📅</span>
            <span><strong>${formatDate(exam.examDate)}</strong></span>
          </div>

          <div class="exam-info-row">
            <span class="exam-info-icon">⏰</span>
            <span>${exam.startTime} – ${exam.endTime}</span>
          </div>

          <div class="exam-info-row">
            <span class="exam-info-icon">📍</span>
            <span>Room: <strong>${exam.room || 'Main Hall'}</strong></span>
          </div>

          <div class="exam-card-footer">
            <span class="badge badge-purple">${exam.year}</span>
            <span class="badge ${exam.section === 'All' ? 'badge-blue' : 'badge-green'}">
              ${exam.section === 'All' ? 'All Sections' : 'Section ' + exam.section}
            </span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load student exams:', err);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--danger); padding: 2rem;">
        Failed to load your timetable: ${err.message}
      </div>
    `;
  }
}
