// Admin Dashboard Controller with Room Management, Capacity Meter & Clash Prevention

let allExams = [];
let allRooms = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = protectPage('admin');
  if (!user) return;

  setupNavUser();
  loadStats();
  loadRooms();
  loadExams();
  setupAdminLiveEvents();

  // Set default minimum date in form to today
  const todayStr = new Date().toISOString().split('T')[0];
  const examDateInput = document.getElementById('examDate');
  if (examDateInput) {
    examDateInput.min = todayStr;
    examDateInput.value = todayStr;
  }
});

// Real-time EventSource for live admin synchronization
function setupAdminLiveEvents() {
  try {
    const evt = new EventSource('/api/events');
    const refreshAll = () => {
      loadStats();
      loadExams();
    };
    evt.addEventListener('exam_created', refreshAll);
    evt.addEventListener('exam_updated', refreshAll);
    evt.addEventListener('exam_deleted', refreshAll);
    evt.addEventListener('timetable_sync', refreshAll);
    evt.addEventListener('room_updated', () => {
      loadRooms();
      loadStats();
    });
  } catch (e) {
    // Ignore fallback
  }
}

// Switch between Section Views (Schedule Exam / Manage Rooms / Master Timetable)
function switchAdminSection(sectionName) {
  const secExam = document.getElementById('addExamSection');
  const secRooms = document.getElementById('roomManagementSection');
  const secTimetable = document.getElementById('masterTimetableSection');

  const btnExam = document.getElementById('tabBtnExam');
  const btnRooms = document.getElementById('tabBtnRooms');
  const btnTimetable = document.getElementById('tabBtnTimetable');

  // Reset all
  secExam.style.display = 'none';
  secRooms.style.display = 'none';
  secTimetable.style.display = 'none';

  btnExam.classList.remove('active');
  btnRooms.classList.remove('active');
  btnTimetable.classList.remove('active');

  if (sectionName === 'rooms') {
    secRooms.style.display = 'block';
    btnRooms.classList.add('active');
  } else if (sectionName === 'timetable') {
    secTimetable.style.display = 'block';
    btnTimetable.classList.add('active');
  } else {
    secExam.style.display = 'block';
    btnExam.classList.add('active');
  }
}

// Real-Time Capacity Meter Indicator
function checkCapacityMeter() {
  const roomSelect = document.getElementById('roomSelect');
  const studentCountInput = document.getElementById('studentCount');
  const feedbackEl = document.getElementById('capacityFeedback');

  if (!roomSelect || !studentCountInput || !feedbackEl) return;

  const selectedOpt = roomSelect.options[roomSelect.selectedIndex];
  if (!roomSelect.value || !selectedOpt) {
    feedbackEl.className = 'capacity-meter-pill meter-ok';
    feedbackEl.innerHTML = '<span>ℹ️</span> Select an examination room above to check seating limits.';
    return;
  }

  const capacity = parseInt(selectedOpt.getAttribute('data-capacity'), 10) || 0;
  const count = parseInt(studentCountInput.value, 10) || 0;

  if (count <= 0) {
    feedbackEl.className = 'capacity-meter-pill meter-warn';
    feedbackEl.innerHTML = '<span>⚠️</span> Please specify the number of students assigned.';
    return;
  }

  const percentage = Math.round((count / capacity) * 100);

  if (count > capacity) {
    feedbackEl.className = 'capacity-meter-pill meter-danger';
    feedbackEl.innerHTML = `<span>❌</span> <strong>Capacity Exceeded!</strong> ${count} students will not fit in this room (${capacity} max seats).`;
  } else if (count === capacity) {
    feedbackEl.className = 'capacity-meter-pill meter-warn';
    feedbackEl.innerHTML = `<span>⚠️</span> <strong>Room at 100% capacity:</strong> ${count} / ${capacity} seats assigned.`;
  } else {
    feedbackEl.className = 'capacity-meter-pill meter-ok';
    feedbackEl.innerHTML = `<span>✅</span> <strong>Capacity Valid:</strong> ${count} / ${capacity} seats assigned (${percentage}% full).`;
  }
}

function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('dashboardAlert');
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.innerText = message;
  alertBox.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 6000);
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
      document.getElementById('statTotalRooms').innerText = data.stats.totalRooms;
      document.getElementById('statUpcoming').innerText = data.stats.upcomingExams;
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// Load and render all rooms
async function loadRooms() {
  const tbody = document.getElementById('roomsTableBody');
  const roomSelect = document.getElementById('roomSelect');

  try {
    const token = getAuthToken();
    const res = await fetch('/api/rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to load rooms');

    allRooms = data.rooms || [];

    // Populate rooms table
    if (allRooms.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No rooms added yet. Create one on the left.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = allRooms.map(room => `
        <tr>
          <td><strong>${room.name}</strong></td>
          <td><span class="badge badge-purple">${room.capacity} seats</span></td>
          <td style="text-align: right;">
            <button class="btn btn-danger btn-sm" onclick="deleteRoom('${room._id}', '${room.name}')">
              🗑️
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Populate room select dropdowns
    const roomOptionsHtml = '<option value="">-- Select an Exam Room --</option>' + 
      allRooms.map(r => `<option value="${r._id}" data-capacity="${r.capacity}" data-name="${r.name}">${r.name} (Max: ${r.capacity} seats)</option>`).join('');

    const previousSelection = roomSelect ? roomSelect.value : '';
    if (roomSelect) {
      roomSelect.innerHTML = roomOptionsHtml;
      if (previousSelection) {
        roomSelect.value = previousSelection;
      }
      checkCapacityMeter();
    }

    const editRoomSelect = document.getElementById('editRoomSelect');
    if (editRoomSelect) {
      const prevEdit = editRoomSelect.value;
      editRoomSelect.innerHTML = roomOptionsHtml;
      if (prevEdit) {
        editRoomSelect.value = prevEdit;
      }
    }

  } catch (err) {
    console.error('Error loading rooms:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--danger);">
          Failed to load rooms: ${err.message}
        </td>
      </tr>
    `;
  }
}

// Add new room
document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('newRoomName');
  const capInput = document.getElementById('newRoomCapacity');
  const btn = document.getElementById('createRoomBtn');

  btn.disabled = true;
  btn.innerText = 'Adding...';

  try {
    const token = getAuthToken();
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        capacity: parseInt(capInput.value, 10)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create room');

    showAlert(`Room "${data.room.name}" (Capacity: ${data.room.capacity}) added successfully!`, 'success');
    nameInput.value = '';
    capInput.value = '';
    loadRooms();
    loadStats();
  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerText = '➕ Add Room';
  }
});

// Delete room
async function deleteRoom(id, name) {
  if (!confirm(`Are you sure you want to delete room "${name}"?`)) {
    return;
  }

  try {
    const token = getAuthToken();
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete room');

    showAlert(`Room "${name}" removed successfully.`, 'success');
    loadRooms();
    loadStats();
  } catch (err) {
    showAlert(err.message, 'danger');
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

// Render exams to master table with Capacity Progress Bars
function renderExams(exams) {
  const tbody = document.getElementById('examsTableBody');

  if (!exams || exams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <h3>No Exam Schedules Found</h3>
            <p>No exams match your current filters. Schedule an exam above to publish it to students.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = exams.map(exam => {
    const capacity = exam.roomCapacity || 60;
    const students = exam.studentCount || 30;
    const usagePercent = Math.min(Math.round((students / capacity) * 100), 100);
    const fillColor = usagePercent > 90 ? '#ef4444' : (usagePercent > 70 ? '#f59e0b' : '#10b981');

    return `
      <tr>
        <td>
          <strong>${formatDate(exam.examDate)}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${exam.examDate}</div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--primary);">${exam.startTime}</span> – ${exam.endTime}
        </td>
        <td>
          <strong>${exam.subjectName}</strong>
          <br>
          <span class="subject-code-badge">${exam.subjectCode}</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${exam.department || ''}</span>
        </td>
        <td>
          <span class="badge badge-purple">${exam.year}</span>
          <span class="badge ${exam.section === 'All' ? 'badge-blue' : 'badge-green'}">
            ${exam.section === 'All' ? 'All Sections' : 'Section ' + exam.section}
          </span>
        </td>
        <td>
          <strong>📍 ${exam.room}</strong>
        </td>
        <td>
          <div class="capacity-container">
            <div><strong>${students}</strong> / ${capacity} seats (${usagePercent}%)</div>
            <div class="capacity-progress-bg">
              <div class="capacity-progress-fill" style="width: ${usagePercent}%; background: ${fillColor};"></div>
            </div>
          </div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" style="margin-right: 0.35rem;" onclick="openEditModal('${exam._id}')">
            ✏️ Edit
          </button>
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

// Add new exam form submission with room validation & clash prevention
document.getElementById('createExamForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('createExamBtn');
  const roomSelect = document.getElementById('roomSelect');
  const selectedOption = roomSelect.options[roomSelect.selectedIndex];

  if (!roomSelect.value) {
    showAlert('Please select an Exam Room from the list.', 'danger');
    return;
  }

  const roomId = roomSelect.value;
  const roomName = selectedOption.getAttribute('data-name');
  const roomCapacity = parseInt(selectedOption.getAttribute('data-capacity'), 10);
  const studentCount = parseInt(document.getElementById('studentCount').value, 10);

  // Client-side quick check
  if (studentCount > roomCapacity) {
    showAlert(`Room capacity exceeded! Selected room "${roomName}" only has ${roomCapacity} seats, but you entered ${studentCount} students.`, 'danger');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Validating & Publishing...';

  const payload = {
    subjectName: document.getElementById('subjectName').value.trim(),
    subjectCode: document.getElementById('subjectCode').value.trim(),
    examDate: document.getElementById('examDate').value,
    startTime: document.getElementById('startTime').value.trim(),
    endTime: document.getElementById('endTime').value.trim(),
    year: document.getElementById('year').value,
    section: document.getElementById('section').value,
    department: document.getElementById('department').value,
    roomId: roomId,
    room: roomName,
    studentCount: studentCount
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
    if (!res.ok) throw new Error(data.message || 'Failed to schedule exam');

    showAlert(data.message || `Exam schedule published successfully in ${roomName}!`, 'success');

    // Reset fields
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';
    checkCapacityMeter();

    loadExams();
    loadStats();
    // Switch to timetable tab to show the published exam
    switchAdminSection('timetable');
  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '✨ Publish Exam Schedule';
  }
});

// Open Edit Modal with exam data pre-filled
function openEditModal(examId) {
  const exam = allExams.find(e => e._id === examId);
  if (!exam) {
    showAlert('Exam record not found.', 'danger');
    return;
  }

  document.getElementById('editExamId').value = exam._id;
  document.getElementById('editSubjectName').value = exam.subjectName || '';
  document.getElementById('editSubjectCode').value = exam.subjectCode || '';
  document.getElementById('editDepartment').value = exam.department || 'Computer Science';
  document.getElementById('editExamDate').value = exam.examDate || '';
  document.getElementById('editStartTime').value = exam.startTime || '';
  document.getElementById('editEndTime').value = exam.endTime || '';
  document.getElementById('editYear').value = exam.year || '1st Year';
  document.getElementById('editSection').value = exam.section || 'A';
  document.getElementById('editStudentCount').value = exam.studentCount || 30;

  // Set selected room
  const editRoomSelect = document.getElementById('editRoomSelect');
  if (editRoomSelect) {
    let found = false;
    for (let opt of editRoomSelect.options) {
      if (opt.value === exam.roomId || opt.getAttribute('data-name') === exam.room) {
        editRoomSelect.value = opt.value;
        found = true;
        break;
      }
    }
    if (!found && editRoomSelect.options.length > 1) {
      editRoomSelect.selectedIndex = 1;
    }
  }

  checkEditCapacityMeter();

  const modal = document.getElementById('editExamModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeEditModal() {
  const modal = document.getElementById('editExamModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Capacity meter in Edit Modal
function checkEditCapacityMeter() {
  const roomSelect = document.getElementById('editRoomSelect');
  const studentCountInput = document.getElementById('editStudentCount');
  const feedbackEl = document.getElementById('editCapacityFeedback');

  if (!roomSelect || !studentCountInput || !feedbackEl) return;

  const selectedOpt = roomSelect.options[roomSelect.selectedIndex];
  if (!roomSelect.value || !selectedOpt) {
    feedbackEl.className = 'capacity-meter-pill meter-ok';
    feedbackEl.innerHTML = '<span>ℹ️</span> Select an examination room above to check seating limits.';
    return;
  }

  const capacity = parseInt(selectedOpt.getAttribute('data-capacity'), 10) || 0;
  const count = parseInt(studentCountInput.value, 10) || 0;

  if (count <= 0) {
    feedbackEl.className = 'capacity-meter-pill meter-warn';
    feedbackEl.innerHTML = '<span>⚠️</span> Please specify the number of students assigned.';
    return;
  }

  const percentage = Math.round((count / capacity) * 100);

  if (count > capacity) {
    feedbackEl.className = 'capacity-meter-pill meter-danger';
    feedbackEl.innerHTML = `<span>❌</span> <strong>Capacity Exceeded!</strong> ${count} students will not fit in this room (${capacity} max seats).`;
  } else if (count === capacity) {
    feedbackEl.className = 'capacity-meter-pill meter-warn';
    feedbackEl.innerHTML = `<span>⚠️</span> <strong>Room at 100% capacity:</strong> ${count} / ${capacity} seats assigned.`;
  } else {
    feedbackEl.className = 'capacity-meter-pill meter-ok';
    feedbackEl.innerHTML = `<span>✅</span> <strong>Capacity Valid:</strong> ${count} / ${capacity} seats assigned (${percentage}% full).`;
  }
}

// Handle Edit Form Submission (PUT /api/exams/:id)
const editForm = document.getElementById('editExamForm');
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const examId = document.getElementById('editExamId').value;
    const submitBtn = document.getElementById('editExamSubmitBtn');
    const roomSelect = document.getElementById('editRoomSelect');
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];

    if (!roomSelect.value) {
      alert('Please select an Exam Room from the list.');
      return;
    }

    const roomId = roomSelect.value;
    const roomName = selectedOption.getAttribute('data-name');
    const roomCapacity = parseInt(selectedOption.getAttribute('data-capacity'), 10);
    const studentCount = parseInt(document.getElementById('editStudentCount').value, 10);

    if (studentCount > roomCapacity) {
      alert(`Room capacity exceeded! Selected room "${roomName}" only has ${roomCapacity} seats, but you entered ${studentCount} students.`);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving Changes...';

    const payload = {
      subjectName: document.getElementById('editSubjectName').value.trim(),
      subjectCode: document.getElementById('editSubjectCode').value.trim(),
      examDate: document.getElementById('editExamDate').value,
      startTime: document.getElementById('editStartTime').value.trim(),
      endTime: document.getElementById('editEndTime').value.trim(),
      year: document.getElementById('editYear').value,
      section: document.getElementById('editSection').value,
      department: document.getElementById('editDepartment').value,
      roomId: roomId,
      room: roomName,
      roomCapacity: roomCapacity,
      studentCount: studentCount
    };

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update exam');

      closeEditModal();
      showAlert(`Exam "${data.exam.subjectName}" updated and synchronized across student portal!`, 'success');
      loadExams();
      loadStats();
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = '💾 Save & Sync Changes';
    }
  });
}
