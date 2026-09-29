// Admin Dashboard Controller

let allExams = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = protectPage('admin');
  if (!user) return;

  setupNavUser();
  loadStats();
  loadExams();

  // Set default minimum date in form to today
  const todayStr = new Date().toISOString().split('T')[0];
  const examDateInput = document.getElementById('examDate');
  if (examDateInput) {
    examDateInput.min = todayStr;
    examDateInput.value = todayStr;
  }
});

function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('dashboardAlert');
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.innerText = message;
  alertBox.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 5000);
}

// Fetch overview stats
async function loadStats() {
  try {
    const token = getAuthToken();
    const res = await fetch('/api/exams/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load stats');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('statTotalExams').innerText = data.stats.totalExams;
      document.getElementById('statTotalStudents').innerText = data.stats.totalStudents;
      document.getElementById('statDepartments').innerText = data.stats.totalDepartments;
      document.getElementById('statUpcoming').innerText = data.stats.upcomingExams;
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// Fetch all scheduled exams
async function loadExams() {
  const tbody = document.getElementById('examsTableBody');
  try {
    const token = getAuthToken();
    const res = await fetch('/api/exams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to load exams');

    allExams = data.exams || [];
    applyFilters();
  } catch (err) {
    console.error('Error loading exams:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">
          Failed to load exam schedules: ${err.message}
        </td>
      </tr>
    `;
  }
}

// Filter and render exams
function applyFilters() {
  const filterYear = document.getElementById('filterYear').value;
  const filterSection = document.getElementById('filterSection').value;
  const searchQuery = document.getElementById('searchQuery').value.toLowerCase().trim();

  let filtered = allExams.filter(exam => {
    const matchYear = !filterYear || exam.year === filterYear;
    const matchSection = !filterSection || exam.section === filterSection;
    const matchQuery = !searchQuery || 
      exam.subjectName.toLowerCase().includes(searchQuery) ||
      exam.subjectCode.toLowerCase().includes(searchQuery) ||
      exam.room.toLowerCase().includes(searchQuery);

    return matchYear && matchSection && matchQuery;
  });

  renderExams(filtered);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(undefined, options);
}

// Render exams to master table
function renderExams(exams) {
  const tbody = document.getElementById('examsTableBody');

  if (!exams || exams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <h3>No Exam Schedules Found</h3>
            <p>No exams match your current filters. Add a new exam above to publish it to students.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = exams.map(exam => {
    return `
      <tr>
        <td>
          <strong>${formatDate(exam.examDate)}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${exam.examDate}</div>
        </td>
        <td>
          <span style="font-weight: 600;">${exam.startTime}</span> - ${exam.endTime}
        </td>
        <td>
          <strong>${exam.subjectName}</strong>
          <br>
          <span class="subject-code-badge">${exam.subjectCode}</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${exam.department || ''}</span>
        </td>
        <td>
          <span class="badge badge-purple">${exam.year}</span>
        </td>
        <td>
          <span class="badge ${exam.section === 'All' ? 'badge-blue' : 'badge-green'}">
            ${exam.section === 'All' ? 'All Sections' : 'Section ' + exam.section}
          </span>
        </td>
        <td>
          <span>📍 ${exam.room}</span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-danger btn-sm" onclick="deleteExam('${exam._id}', '${exam.subjectName}')">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Delete exam schedule
async function deleteExam(id, subjectName) {
  if (!confirm(`Are you sure you want to remove the exam schedule for "${subjectName}"?`)) {
    return;
  }

  try {
    const token = getAuthToken();
    const res = await fetch(`/api/exams/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete exam');

    showAlert(`Exam "${subjectName}" was deleted successfully.`, 'success');
    loadExams();
    loadStats();
  } catch (err) {
    showAlert(err.message, 'danger');
  }
}

// Add new exam form submission
document.getElementById('createExamForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('createExamBtn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Publishing...';

  const payload = {
    subjectName: document.getElementById('subjectName').value.trim(),
    subjectCode: document.getElementById('subjectCode').value.trim(),
    examDate: document.getElementById('examDate').value,
    startTime: document.getElementById('startTime').value.trim(),
    endTime: document.getElementById('endTime').value.trim(),
    year: document.getElementById('year').value,
    section: document.getElementById('section').value,
    department: document.getElementById('department').value,
    room: document.getElementById('room').value.trim()
  };

  try {
    const token = getAuthToken();
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create exam');

    showAlert(`Exam schedule for "${payload.subjectName}" (${payload.year} - Section ${payload.section}) published successfully!`, 'success');

    // Reset subject fields
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';

    loadExams();
    loadStats();
  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Publish Exam Schedule';
  }
});
