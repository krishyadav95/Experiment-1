/* ====================================================
   FITNESSIFY AI — Frontend Auth + API Client
   ==================================================== */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (error) {
    const isFileProtocol = window.location.protocol === 'file:';
    const message = isFileProtocol
      ? 'The app is being opened as a file. Please run it through the backend server, for example http://127.0.0.1:3000.'
      : 'Cannot reach the app server. Please make sure the backend is running and open the site from that server URL.';
    throw new Error(message);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

const AuthManager = (() => {
  let currentUser = null;

  async function signup(name, email, password) {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    currentUser = data.user;
    return currentUser;
  }

  async function login(email, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = data.user;
    return currentUser;
  }

  async function logout() {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({})
    });
    currentUser = null;
    window.location.href = 'index.html';
  }

  async function getCurrentUser(force = false) {
    if (currentUser && !force) return currentUser;
    const data = await apiRequest('/api/auth/session');
    currentUser = data.user || null;
    return currentUser;
  }

  async function isLoggedIn(force = false) {
    return !!(await getCurrentUser(force));
  }

  async function requireAuth(redirectTo = 'index.html') {
    const user = await getCurrentUser(true);
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  }

  async function updateProfile(profileData, onboardingComplete = false) {
    const data = await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: profileData, onboardingComplete })
    });
    currentUser = data.user;
    return currentUser;
  }

  async function setOnboardingComplete() {
    const profile = (await getCurrentUser())?.profile || {};
    return updateProfile(profile, true);
  }

  async function getLatestReport() {
    const data = await apiRequest('/api/reports/latest');
    return data.report || null;
  }

  async function getReports() {
    const data = await apiRequest('/api/reports');
    return data.reports || [];
  }

  async function setCheckInFrequency(freq) {
    const data = await apiRequest('/api/checkin/frequency', {
      method: 'PUT',
      body: JSON.stringify({ frequency: freq })
    });
    currentUser = data.user;
    return currentUser;
  }

  async function getAiStatus() {
    const data = await apiRequest('/api/ai/status');
    return data;
  }

  function trackEvent(event, metadata = {}) {
    return apiRequest('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event, metadata })
    }).catch(() => null);
  }

  async function hasCompletedOnboarding() {
    const user = await getCurrentUser();
    return !!(user?.onboardingComplete && user?.profile);
  }

  return {
    signup,
    login,
    logout,
    requireAuth,
    isLoggedIn,
    getCurrentUser,
    updateProfile,
    setOnboardingComplete,
    getLatestReport,
    getReports,
    setCheckInFrequency,
    getAiStatus,
    trackEvent,
    hasCompletedOnboarding
  };
})();

/* ====================================================
   Toast Notification Utility
   ==================================================== */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || 'ℹ️';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}
