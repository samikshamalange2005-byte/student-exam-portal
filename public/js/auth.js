// Common Authentication & Session Helpers

const TOKEN_KEY = 'exam_portal_token';
const USER_KEY = 'exam_portal_user';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthUser() {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

// Protect a page based on role ('admin' or 'student')
function protectPage(requiredRole) {
  const token = getAuthToken();
  const user = getAuthUser();

  if (!token || !user) {
    window.location.href = `/login.html${requiredRole ? '?role=' + requiredRole : ''}`;
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to correct dashboard
    if (user.role === 'admin') {
      window.location.href = '/admin-dashboard.html';
    } else {
      window.location.href = '/student-dashboard.html';
    }
    return null;
  }

  return user;
}

// Redirect if already logged in (used on login / register pages)
function redirectIfLoggedIn() {
  const token = getAuthToken();
  const user = getAuthUser();

  if (token && user) {
    if (user.role === 'admin') {
      window.location.href = '/admin-dashboard.html';
    } else {
      window.location.href = '/student-dashboard.html';
    }
  }
}

// Setup common user display in navigation
function setupNavUser() {
  const user = getAuthUser();
  const navContainer = document.getElementById('navUserArea');
  if (!navContainer) return;

  if (user) {
    const initials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'U';

    navContainer.innerHTML = `
      <div class="user-info-badge">
        <div class="user-avatar">${initials}</div>
        <div>
          <strong>${user.name}</strong> 
          <span style="color: var(--text-muted); font-size: 0.8rem;">(${user.role.toUpperCase()})</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="logout()">
        <span>🚪</span> Logout
      </button>
    `;
  } else {
    navContainer.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Login</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}
