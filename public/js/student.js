// Student Dashboard Controller with Real-Time Live Sync & Toast Notifications

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = protectPage('student');
  if (!currentUser) return;

  setupNavUser();
  displayStudentProfile(currentUser);
  loadMyExams();
  setupLiveEventSource();
});

// Soft synthesized chime for real-time exam notifications
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Graceful fallback if audio is not allowed
  }
}

// Show animated floating toast notification
function showToast(title, message, icon = '🔔') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 20);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 7000);
}

// Connect to Server-Sent Events (SSE) for instant live updates
function setupLiveEventSource() {
  try {
    const evtSource = new EventSource('/api/events');

    evtSource.addEventListener('exam_created', (e) => {
      try {
        const exam = JSON.parse(e.data);
        if (!currentUser) return;

        // Check if the newly published exam matches this student's class
        const matchesYear = exam.year === currentUser.year;
        const matchesSection = exam.section === currentUser.section || exam.section === 'All';

        if (matchesYear && matchesSection) {
          playNotificationChime();
          showToast(
            'New Exam Published!',
            `${exam.subjectName} (${exam.subjectCode}) on ${exam.examDate} in ${exam.room}.`,
            '🎉'
          );
          // Reload timetable and highlight the new exam card
          loadMyExams(exam._id);
        }
      } catch (err) {
        console.error('Error handling exam_created event:', err);
      }
    });

    evtSource.addEventListener('exam_deleted', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!currentUser) return;

        const matchesYear = data.year === currentUser.year;
        const matchesSection = data.section === currentUser.section || data.section === 'All';

        if (matchesYear && matchesSection) {
          showToast(
            'Exam Schedule Updated',
            `"${data.subjectName}" was removed from your timetable.`,
            'ℹ️'
          );
          loadMyExams();
        }
      } catch (err) {
        console.error('Error handling exam_deleted event:', err);
      }
    });

    evtSource.onerror = () => {
      // Reconnects automatically by browser
    };
  } catch (err) {
    console.warn('Real-time events unavailable, falling back to periodic refresh:', err);
    setInterval(loadMyExams, 15000);
  }
}

function displayStudentProfile(user) {
  const greeting = document.getElementById('welcomeGreeting');
  const classBadgeText = document.getElementById('classBadgeText');
  const noticeDesc = document.getElementById('noticeDesc');

  greeting.innerText = `Welcome, ${user.name}!`;
  classBadgeText.innerText = `Enrolled in ${user.year} • Section ${user.section} • ${user.department || 'Computer Science'} • Roll No: ${user.rollNo || 'N/A'}`;
  
  document.getElementById('statStudentYear').innerText = user.year;
  document.getElementById('statStudentSection').innerText = `Section ${user.section}`;
  document.getElementById('statStudentDept').innerText = user.department || 'Computer Science';

  // Pre-select student's own branch, year, and section in the filter controls
  const deptSelect = document.getElementById('studentFilterDept');
  const yearSelect = document.getElementById('studentFilterYear');
  const secSelect = document.getElementById('studentFilterSection');

  if (deptSelect && user.department) deptSelect.value = user.department;
  if (yearSelect && user.year) yearSelect.value = user.year;
  if (secSelect && user.section) secSelect.value = user.section;

  updateNoticeBanner();

  // For print header
  const printInfo = document.getElementById('printStudentInfo');
  if (printInfo) {
    printInfo.innerText = `Candidate: ${user.name} | Roll No: ${user.rollNo || 'N/A'} | Class: ${user.year} - Section ${user.section} | Dept: ${user.department || 'CS'}`;
  }
}

function updateNoticeBanner() {
  const dept = document.getElementById('studentFilterDept') ? document.getElementById('studentFilterDept').value : '';
  const year = document.getElementById('studentFilterYear') ? document.getElementById('studentFilterYear').value : '';
  const section = document.getElementById('studentFilterSection') ? document.getElementById('studentFilterSection').value : '';
  const noticeDesc = document.getElementById('noticeDesc');

  if (noticeDesc && currentUser) {
    const isMyClass = (dept === currentUser.department || dept === 'All Departments') && year === currentUser.year && section === currentUser.section;
    if (isMyClass) {
      noticeDesc.innerHTML = `Showing official timetable for your enrolled class: <strong>${currentUser.department || 'Computer Science'} • ${currentUser.year} • Section ${currentUser.section}</strong>.`;
    } else {
      noticeDesc.innerHTML = `🔍 Custom View: Displaying timetable for <strong>${dept} • ${year} • ${section === 'All' ? 'All Sections' : 'Section ' + section}</strong>.`;
    }
  }
}

function onStudentFilterChange() {
  updateNoticeBanner();
  loadMyExams();
}

function resetToMyClass() {
  if (!currentUser) return;
  const deptSelect = document.getElementById('studentFilterDept');
  const yearSelect = document.getElementById('studentFilterYear');
  const secSelect = document.getElementById('studentFilterSection');

  if (deptSelect) deptSelect.value = currentUser.department || 'Computer Science';
  if (yearSelect) yearSelect.value = currentUser.year || '1st Year';
  if (secSelect) secSelect.value = currentUser.section || 'A';

  updateNoticeBanner();
  loadMyExams();
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

// Render the Spotlight "Next Upcoming Exam" card
function renderSpotlightCard(upcomingExam) {
  const spotlightSection = document.getElementById('spotlightSection');
  if (!spotlightSection) return;

  if (!upcomingExam) {
    spotlightSection.style.display = 'none';
    return;
  }

  const diffDays = getDayDifference(upcomingExam.examDate);
  let countdownText = '';
  if (diffDays === 0) countdownText = 'TODAY';
  else if (diffDays === 1) countdownText = 'TOMORROW';
  else countdownText = `IN ${diffDays} DAYS`;

  spotlightSection.innerHTML = `
    <div class="spotlight-banner">
      <div>
        <div class="spotlight-tag">
          <span>⚡ Next Paper Countdown</span>
        </div>
        <div class="spotlight-title">${upcomingExam.subjectName} (${upcomingExam.subjectCode})</div>
        <div class="spotlight-meta">
          <span>📅 ${formatDate(upcomingExam.examDate)}</span>
          <span>⏰ ${upcomingExam.startTime} – ${upcomingExam.endTime}</span>
          <span>📍 Room: <strong>${upcomingExam.room}</strong> (${upcomingExam.roomCapacity || 60} seats)</span>
        </div>
      </div>
      <div class="spotlight-countdown">
        <div class="countdown-number">${countdownText}</div>
        <div class="countdown-label">Target Examination</div>
      </div>
    </div>
  `;
  spotlightSection.style.display = 'block';
}

async function loadMyExams(highlightId = null) {
  const container = document.getElementById('studentTimetableContainer');
  const totalCountEl = document.getElementById('statStudentTotal');
  const badgeCountEl = document.getElementById('timetableCountBadge');

  try {
    const token = getAuthToken();

    const deptEl = document.getElementById('studentFilterDept');
    const yearEl = document.getElementById('studentFilterYear');
    const secEl = document.getElementById('studentFilterSection');

    const params = new URLSearchParams();
    if (deptEl && deptEl.value && deptEl.value !== 'All Departments') {
      params.append('department', deptEl.value);
    }
    if (yearEl && yearEl.value) {
      params.append('year', yearEl.value);
    }
    if (secEl && secEl.value) {
      params.append('section', secEl.value);
    }

    const queryUrl = `/api/exams${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load exams.');

    const exams = data.exams || [];
    totalCountEl.innerText = exams.length;
    badgeCountEl.innerText = `${exams.length} ${exams.length === 1 ? 'Exam' : 'Exams'} Scheduled`;

    // Find next upcoming exam for spotlight
    const todayStr = new Date().toISOString().split('T')[0];
    const nextExam = exams.find(e => e.examDate >= todayStr);
    renderSpotlightCard(nextExam);

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

      const isNewHighlight = highlightId && exam._id === highlightId ? 'highlight-new' : '';

      return `
        <div class="exam-card ${isNewHighlight}" id="exam_${exam._id}">
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
            <span>Assigned Room: <strong>${exam.room || 'Main Hall'}</strong> ${exam.roomCapacity ? `<span style="font-size: 0.8rem; color: var(--text-muted);">(${exam.roomCapacity} seats)</span>` : ''}</span>
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

    // Smooth scroll to highlighted card if specified
    if (highlightId) {
      const card = document.getElementById(`exam_${highlightId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

  } catch (err) {
    console.error('Failed to load student exams:', err);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--danger); padding: 2rem;">
        Failed to load your timetable: ${err.message}
      </div>
    `;
  }
}
