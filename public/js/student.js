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

// Helper to check whether an exam event is relevant to the student's enrolled profile or active view
function isExamRelevant(exam) {
  if (!exam || !currentUser) return { enrolledMatch: false, filterMatch: false };

  const norm = (str) => (str || '').trim().toLowerCase();

  // 1. Matches student's enrolled academic profile
  const enrolledYear = norm(exam.year) === norm(currentUser.year);
  const enrolledSec = norm(exam.section) === norm(currentUser.section) || norm(exam.section) === 'all';
  const enrolledDept = !exam.department || !currentUser.department || 
    norm(exam.department).includes(norm(currentUser.department)) || 
    norm(currentUser.department).includes(norm(exam.department));
  const enrolledMatch = enrolledYear && enrolledSec && enrolledDept;

  // 2. Matches current dropdown filter selections on screen
  const curDept = document.getElementById('studentFilterDept') ? document.getElementById('studentFilterDept').value : '';
  const curYear = document.getElementById('studentFilterYear') ? document.getElementById('studentFilterYear').value : '';
  const curSec = document.getElementById('studentFilterSection') ? document.getElementById('studentFilterSection').value : '';

  const filterYearMatch = !curYear || curYear === 'All' || norm(curYear) === norm(exam.year);
  const filterSecMatch = !curSec || curSec === 'All' || norm(curSec) === norm(exam.section) || norm(exam.section) === 'all';
  const filterDeptMatch = !curDept || curDept === 'All' || curDept === 'All Departments' || 
    norm(curDept).includes(norm(exam.department)) || 
    norm(exam.department).includes(norm(curDept));
  const filterMatch = filterYearMatch && filterSecMatch && filterDeptMatch;

  return { enrolledMatch, filterMatch };
}

// Connect to Server-Sent Events (SSE) for instant live updates
function setupLiveEventSource() {
  try {
    const evtSource = new EventSource('/api/events');

    evtSource.onopen = () => {
      const statusEl = document.getElementById('liveSyncStatus');
      if (statusEl) {
        statusEl.innerHTML = '<span class="pulse-dot"></span> Live Sync Active';
        statusEl.style.color = '#10b981';
      }
      loadMyExams();
    };

    // When an Admin schedules a new exam
    evtSource.addEventListener('exam_created', (e) => {
      try {
        const exam = JSON.parse(e.data);
        if (!currentUser) return;

        const { enrolledMatch, filterMatch } = isExamRelevant(exam);

        if (enrolledMatch || filterMatch) {
          playNotificationChime();
          const title = enrolledMatch ? '🎉 New Exam for Your Class!' : 'ℹ️ Timetable Updated';
          showToast(
            title,
            `${exam.subjectName} (${exam.subjectCode}) on ${formatDate(exam.examDate)} in ${exam.room} (${exam.startTime} – ${exam.endTime}).`,
            '🔔'
          );
          loadMyExams(exam._id, 'new');
        } else {
          loadMyExams();
        }
      } catch (err) {
        console.error('Error handling exam_created event:', err);
      }
    });

    // When an Admin modifies or reschedules an exam (Room / Time / Date)
    evtSource.addEventListener('exam_updated', (e) => {
      try {
        const exam = JSON.parse(e.data);
        if (!currentUser) return;

        const { enrolledMatch, filterMatch } = isExamRelevant(exam);

        if (enrolledMatch || filterMatch) {
          playNotificationChime();
          const title = enrolledMatch ? '✏️ Exam Rescheduled / Updated!' : '🔄 Exam Details Updated';
          showToast(
            title,
            `"${exam.subjectName}" updated: ${formatDate(exam.examDate)} (${exam.startTime} – ${exam.endTime}) in Room ${exam.room}.`,
            '✏️'
          );
          loadMyExams(exam._id, 'updated');
        } else {
          loadMyExams();
        }
      } catch (err) {
        console.error('Error handling exam_updated event:', err);
      }
    });

    // When an Admin deletes an exam
    evtSource.addEventListener('exam_deleted', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!currentUser) return;

        const { enrolledMatch, filterMatch } = isExamRelevant(data);

        if (enrolledMatch || filterMatch) {
          showToast(
            'Exam Removed from Schedule',
            `"${data.subjectName}" was removed from the examination timetable.`,
            '🗑️'
          );
          loadMyExams();
        } else {
          loadMyExams();
        }
      } catch (err) {
        console.error('Error handling exam_deleted event:', err);
      }
    });

    // General sync broadcast
    evtSource.addEventListener('timetable_sync', () => {
      loadMyExams();
    });

    evtSource.addEventListener('room_updated', () => {
      loadMyExams();
    });

    evtSource.onerror = () => {
      const statusEl = document.getElementById('liveSyncStatus');
      if (statusEl) {
        statusEl.innerHTML = '<span class="pulse-dot" style="background:#f59e0b; box-shadow:0 0 0 rgba(245,158,11,0.4);"></span> Connecting...';
        statusEl.style.color = '#f59e0b';
      }
    };

    // Fail-safe periodic refresh every 30 seconds
    setInterval(loadMyExams, 30000);
  } catch (err) {
    console.warn('Real-time events unavailable, falling back to periodic refresh:', err);
    setInterval(loadMyExams, 15000);
  }
}

function displayStudentProfile(user) {
  const greeting = document.getElementById('welcomeGreeting');
  const classBadgeText = document.getElementById('classBadgeText');

  greeting.innerText = `Welcome, ${user.name}!`;
  classBadgeText.innerText = `Enrolled in ${user.year} • Section ${user.section} • ${user.department || 'Computer Science'} • Roll No: ${user.rollNo || 'N/A'}`;

  // Pre-select student's own branch, year, and section in the filter controls
  const deptSelect = document.getElementById('studentFilterDept');
  const yearSelect = document.getElementById('studentFilterYear');
  const secSelect = document.getElementById('studentFilterSection');

  if (deptSelect && user.department) deptSelect.value = user.department;
  if (yearSelect && user.year) yearSelect.value = user.year;
  if (secSelect && user.section) secSelect.value = user.section;

  updateFilterStats();
}

// Dynamically updates Academic Year, Class Section, and Department stat cards and banner based on active filter
function updateFilterStats() {
  if (!currentUser) return;

  const deptEl = document.getElementById('studentFilterDept');
  const yearEl = document.getElementById('studentFilterYear');
  const secEl = document.getElementById('studentFilterSection');

  const curDept = deptEl ? deptEl.value : (currentUser.department || 'Computer Science');
  const curYear = yearEl ? yearEl.value : (currentUser.year || '1st Year');
  const curSec = secEl ? secEl.value : (currentUser.section || 'A');

  const norm = (str) => (str || '').trim().toLowerCase();

  // Check if current filter matches student's enrolled class
  const isEnrolledYear = norm(curYear) === norm(currentUser.year);
  const isEnrolledSec = norm(curSec) === norm(currentUser.section);
  const isEnrolledDept = norm(curDept) === norm(currentUser.department) || (curDept === 'All Departments' && norm(currentUser.department) === 'computer science');

  // Update Year card
  const statYear = document.getElementById('statStudentYear');
  const statYearSub = document.getElementById('statYearSubtext');
  if (statYear) {
    statYear.innerText = curYear === 'All' ? 'All Years' : curYear;
  }
  if (statYearSub) {
    statYearSub.innerHTML = isEnrolledYear 
      ? '<span style="color: var(--success); font-weight: 600;">✓ Enrolled Year</span>' 
      : '<span style="color: var(--primary); font-weight: 600;">🔍 Filtered View</span>';
  }

  // Update Section card
  const statSec = document.getElementById('statStudentSection');
  const statSecSub = document.getElementById('statSectionSubtext');
  if (statSec) {
    statSec.innerText = curSec === 'All' ? 'All Sections' : `Section ${curSec}`;
  }
  if (statSecSub) {
    statSecSub.innerHTML = isEnrolledSec 
      ? '<span style="color: var(--success); font-weight: 600;">✓ Enrolled Section</span>' 
      : '<span style="color: var(--primary); font-weight: 600;">🔍 Filtered View</span>';
  }

  // Update Department card
  const statDept = document.getElementById('statStudentDept');
  const statDeptSub = document.getElementById('statDeptSubtext');
  if (statDept) {
    statDept.innerText = curDept === 'All Departments' ? 'All Branches' : curDept;
  }
  if (statDeptSub) {
    statDeptSub.innerHTML = (norm(curDept) === norm(currentUser.department)) 
      ? '<span style="color: var(--success); font-weight: 600;">✓ Enrolled Branch</span>' 
      : '<span style="color: var(--primary); font-weight: 600;">🔍 Filtered View</span>';
  }

  // Update Notice Banner
  updateNoticeBanner();

  // Update Print Header
  const printInfo = document.getElementById('printStudentInfo');
  if (printInfo) {
    printInfo.innerText = `Candidate: ${currentUser.name} | Roll No: ${currentUser.rollNo || 'N/A'} | Filter: ${curDept} • ${curYear} • Section ${curSec}`;
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
  updateFilterStats();
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

  updateFilterStats();
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

async function loadMyExams(highlightId = null, highlightType = 'new') {
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

    updateFilterStats();

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

      const isHighlight = highlightId && exam._id === highlightId 
        ? (highlightType === 'updated' ? 'highlight-updated' : 'highlight-new') 
        : '';

      return `
        <div class="exam-card ${isHighlight}" id="exam_${exam._id}">
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
