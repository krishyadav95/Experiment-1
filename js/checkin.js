/* ====================================================
   FITNESSIFY AI — Check-In & Nudge System
   ==================================================== */

const CheckInManager = (() => {
  const KEY = 'fitnessify_checkin_ui';
  const CHECKIN_QUESTIONS = [
    {
      field: 'checkInEnergy',
      title: 'How is your energy today?',
      subtitle: 'One tap is enough.',
      type: 'options',
      options: [
        { label: 'Drained', value: 'drained', icon: '😮‍💨' },
        { label: 'Steady', value: 'steady', icon: '🙂' },
        { label: 'Good', value: 'good', icon: '⚡' },
        { label: 'Pumped', value: 'pumped', icon: '🔥' }
      ]
    },
    {
      field: 'sleepQuality',
      title: 'How did you sleep lately?',
      subtitle: 'Quick score from 1 to 10.',
      type: 'range',
      min: 1,
      max: 10,
      value: 6,
      lowLabel: 'Rough',
      highLabel: 'Great'
    },
    {
      field: 'activityLevel',
      title: 'How much movement fits your week right now?',
      subtitle: 'This updates your plan without asking for your full routine again.',
      type: 'options',
      options: [
        { label: 'Mostly sitting', value: 'sedentary', icon: '🛋️' },
        { label: 'Light walks', value: 'light', icon: '🚶' },
        { label: 'A few workouts', value: 'moderate', icon: '🏃' },
        { label: 'Very active', value: 'very-active', icon: '🏋️' }
      ]
    },
    {
      field: 'checkInFocus',
      title: 'What should Vita tune first?',
      subtitle: 'Pick the area that needs attention now.',
      type: 'options',
      options: [
        { label: 'Water', value: 'hydration', icon: '💧' },
        { label: 'Food', value: 'nutrition', icon: '🥗' },
        { label: 'Movement', value: 'movement', icon: '🏃' },
        { label: 'Sleep', value: 'sleep', icon: '😴' },
        { label: 'Stress', value: 'stress', icon: '🧘' }
      ]
    },
    {
      field: 'checkInNote',
      title: 'Anything changed?',
      subtitle: 'Optional. Add a short note, or skip.',
      type: 'text',
      placeholder: 'e.g. late nights this week, more office days, cravings after dinner...'
    }
  ];

  let checkInState = {
    active: false,
    step: 0,
    data: {}
  };

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  function getDaysSinceLastCheckIn() {
    const user = window._reportUser;
    if (!user || !user.lastCheckIn) return null;
    const diff = Date.now() - user.lastCheckIn;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function getFrequencyDays() {
    const user = window._reportUser;
    const freq = user?.checkInFrequency || 'weekly';
    return freq === 'daily' ? 1 : freq === 'biweekly' ? 14 : freq === 'monthly' ? 30 : 7;
  }

  function shouldNudge() {
    const days = getDaysSinceLastCheckIn();
    const settings = getSettings();
    if (days === null) return false;
    if (settings.lastDismissed && Date.now() - settings.lastDismissed < 1000 * 60 * 60 * 12) {
      return false;
    }
    return days >= getFrequencyDays();
  }

  function showNudgeBanner() {
    const existing = document.getElementById('nudgeBanner');
    if (existing || !shouldNudge()) return;

    const days = getDaysSinceLastCheckIn();
    const banner = document.createElement('div');
    banner.id = 'nudgeBanner';
    banner.className = 'nudge-banner animate-fade-down';
    banner.innerHTML = `
      <div class="nudge-content">
        <span class="nudge-icon">🔔</span>
        <div>
          <strong>Time for your wellness check-in!</strong>
          <p>It's been ${days} day${days !== 1 ? 's' : ''} since your last check-in. Refresh your report to keep recommendations current.</p>
        </div>
        <div class="nudge-actions">
          <button class="btn btn-primary btn-sm" onclick="CheckInManager.startQuickCheckIn()">Start Check-In</button>
          <button class="btn btn-ghost btn-sm" onclick="CheckInManager.dismissNudge()">Later</button>
        </div>
      </div>`;

    document.body.prepend(banner);
  }

  function dismissNudge() {
    const banner = document.getElementById('nudgeBanner');
    if (banner) banner.remove();
    const settings = getSettings();
    settings.lastDismissed = Date.now();
    saveSettings(settings);
  }

  function renderHistoryTab(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const reports = window._reportHistory || [];
    const user = window._reportUser;
    const days = getDaysSinceLastCheckIn();
    const freq = user?.checkInFrequency || 'weekly';
    const notificationPermission =
      'Notification' in window ? Notification.permission : 'unsupported';

    container.innerHTML = `
      <div class="checkin-wrapper">
        <div class="checkin-header">
          <h2>📅 Check-In Center</h2>
          <p class="text-secondary">Quick check-ins keep your wellness plan fresh without repeating onboarding.</p>
        </div>

        <div class="checkin-status-card">
          <div class="checkin-status-icon">${days === null ? '🆕' : days < getFrequencyDays() ? '✅' : '⚠️'}</div>
          <div class="checkin-status-info">
            <h3>${days === null ? 'No check-in yet' : days < getFrequencyDays() ? 'You are on track!' : 'Check-in overdue'}</h3>
            <p>${days === null ? 'Complete your first quick check-in to tune your personalized wellness report.' :
              days < getFrequencyDays() ? `Last check-in: ${days} day${days !== 1 ? 's' : ''} ago. Next one in ${getFrequencyDays() - days} day${getFrequencyDays() - days !== 1 ? 's' : ''}.` :
              `It's been ${days} days. Time for updated recommendations.`}
            </p>
          </div>
          <button class="btn btn-primary" onclick="CheckInManager.startQuickCheckIn()">${days === null ? 'Start Quick Check-In' : 'New Quick Check-In'}</button>
        </div>

        <div class="checkin-flow card" id="quickCheckinCard">
          ${renderQuickCheckInIntro()}
        </div>

        <div class="checkin-settings card">
          <h3>⚙️ Check-In Frequency</h3>
          <p class="text-secondary text-sm mb-4">How often should Vita remind you to re-assess?</p>
          <div class="freq-options">
            ${['daily', 'weekly', 'biweekly', 'monthly'].map((item) => `
              <button class="freq-btn ${freq === item ? 'active' : ''}" data-freq="${item}" onclick="CheckInManager.setFrequency('${item}')">
                ${item === 'daily' ? '📅 Daily' : item === 'weekly' ? '📆 Weekly' : item === 'biweekly' ? '🗓️ Bi-Weekly' : '📅 Monthly'}
              </button>`).join('')}
          </div>
        </div>

        <div class="checkin-notify card">
          <h3>🔔 Browser Reminders</h3>
          <p class="text-secondary text-sm">Get a browser reminder when it's time for your next check-in.</p>
          <button class="btn btn-outline mt-4" id="enableNotifBtn" onclick="CheckInManager.requestNotifications()">
            Enable Notifications
          </button>
          <p class="text-muted text-xs mt-2" id="notifStatus">Notification permission: ${notificationPermission}</p>
        </div>

        <div class="report-history">
          <h3>📊 Check-In History</h3>
          ${reports.length === 0 ? `
            <div class="empty-history">
              <p class="text-muted">No check-ins yet. Start with a quick pulse to track progress.</p>
            </div>` : `
            <div class="history-list">
              ${reports.map((report, index) => `
                <div class="history-item">
                  <div class="history-rank">#${index + 1}</div>
                  <div class="history-info">
                    <strong>${new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                    <p class="text-secondary text-sm">Overall score: <span style="color: var(--accent)">${report.data?.score?.overall || 'N/A'}/100</span></p>
                  </div>
                  <div class="history-score-mini">
                    <div class="score-ring-sm" style="--s:${report.data?.score?.overall || 0}">${report.data?.score?.overall || 'N/A'}</div>
                  </div>
                </div>`).join('')}
            </div>`}
        </div>

        <div class="consistency-tips card">
          <h3>💡 Why Regular Check-Ins Matter</h3>
          <ul class="tips-list">
            <li>✅ Your lifestyle changes, so your plan should too.</li>
            <li>✅ Updated reports keep recommendations relevant and personalized.</li>
            <li>✅ Tracking progress helps with accountability and consistency.</li>
            <li>✅ Small recurring reviews keep habits from drifting.</li>
          </ul>
        </div>
      </div>`;
  }

  function renderQuickCheckInIntro() {
    return `
      <div class="quick-checkin-intro">
        <div>
          <p class="mini-label">2-minute pulse</p>
          <h3>Update only what changed</h3>
          <p class="text-secondary text-sm">No age, height, full routine, or onboarding questions. Vita just needs a few current signals.</p>
        </div>
        <button class="btn btn-primary" onclick="CheckInManager.startQuickCheckIn()">Start quick check-in</button>
      </div>
      <div class="quick-checkin-chips" aria-label="Quick check-in topics">
        <span>Energy</span>
        <span>Sleep</span>
        <span>Movement</span>
        <span>Focus</span>
        <span>Optional note</span>
      </div>`;
  }

  function startQuickCheckIn() {
    dismissNudge();

    if (typeof openTab === 'function') {
      openTab('checkin');
    }

    const container = document.getElementById('checkinContent');
    if (container && !container.innerHTML.trim()) {
      renderHistoryTab('checkinContent');
    }

    checkInState = {
      active: true,
      step: 0,
      data: {}
    };
    renderQuickCheckInStep();
  }

  function renderQuickCheckInStep() {
    const card = document.getElementById('quickCheckinCard');
    if (!card) return;

    const question = CHECKIN_QUESTIONS[checkInState.step];
    const progress = Math.round((checkInState.step / CHECKIN_QUESTIONS.length) * 100);
    const savedValue = checkInState.data[question.field] ?? question.value ?? '';

    card.innerHTML = `
      <div class="quick-checkin-top">
        <div>
          <p class="mini-label">Question ${checkInState.step + 1} of ${CHECKIN_QUESTIONS.length}</p>
          <h3>${escapeHtml(question.title)}</h3>
          <p class="text-secondary text-sm">${escapeHtml(question.subtitle)}</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="CheckInManager.cancelQuickCheckIn()">Cancel</button>
      </div>
      <div class="quick-progress" aria-hidden="true">
        <span style="width:${progress}%"></span>
      </div>
      ${renderQuestionControl(question, savedValue)}
      <div class="quick-checkin-actions">
        <button class="btn btn-outline btn-sm" ${checkInState.step === 0 ? 'disabled' : ''} onclick="CheckInManager.previousQuickQuestion()">Back</button>
        ${question.type === 'options' ? '' : `<button class="btn btn-primary btn-sm" onclick="CheckInManager.saveCurrentQuestion()">${checkInState.step === CHECKIN_QUESTIONS.length - 1 ? 'Finish' : 'Next'}</button>`}
      </div>`;
  }

  function renderQuestionControl(question, savedValue) {
    if (question.type === 'options') {
      return `
        <div class="quick-options" role="group" aria-label="${escapeHtml(question.title)}">
          ${question.options.map((option) => `
            <button class="quick-option ${savedValue === option.value ? 'selected' : ''}" onclick="CheckInManager.answerQuickQuestion('${question.field}', '${option.value}')">
              <span>${escapeHtml(option.icon)}</span>
              <strong>${escapeHtml(option.label)}</strong>
            </button>`).join('')}
        </div>`;
    }

    if (question.type === 'range') {
      const value = Number(savedValue || question.value || question.min);
      const pct = ((value - question.min) / (question.max - question.min)) * 100;
      return `
        <div class="quick-range">
          <input type="range" id="quickField" min="${question.min}" max="${question.max}" value="${value}" style="--pct:${pct}%" oninput="CheckInManager.updateQuickRange(this)" />
          <div class="range-labels">
            <span>${escapeHtml(question.lowLabel)}</span>
            <span>${escapeHtml(question.highLabel)}</span>
          </div>
          <div class="range-value" id="quickRangeValue">${value} / ${question.max}</div>
        </div>`;
    }

    return `
      <textarea class="input quick-note" id="quickField" rows="3" placeholder="${escapeHtml(question.placeholder)}">${escapeHtml(savedValue)}</textarea>`;
  }

  function answerQuickQuestion(field, value) {
    checkInState.data[field] = value;
    advanceQuickQuestion();
  }

  function saveCurrentQuestion() {
    const question = CHECKIN_QUESTIONS[checkInState.step];
    const input = document.getElementById('quickField');
    if (input) {
      checkInState.data[question.field] = input.value.trim ? input.value.trim() : input.value;
    }
    advanceQuickQuestion();
  }

  function advanceQuickQuestion() {
    if (checkInState.step >= CHECKIN_QUESTIONS.length - 1) {
      finishQuickCheckIn();
      return;
    }

    checkInState.step += 1;
    renderQuickCheckInStep();
  }

  function previousQuickQuestion() {
    if (checkInState.step === 0) return;
    checkInState.step -= 1;
    renderQuickCheckInStep();
  }

  function cancelQuickCheckIn() {
    checkInState = { active: false, step: 0, data: {} };
    const card = document.getElementById('quickCheckinCard');
    if (card) card.innerHTML = renderQuickCheckInIntro();
  }

  function updateQuickRange(input) {
    const question = CHECKIN_QUESTIONS[checkInState.step];
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--pct', `${pct}%`);
    const value = document.getElementById('quickRangeValue');
    if (value) value.textContent = `${input.value} / ${question.max}`;
  }

  async function finishQuickCheckIn() {
    const card = document.getElementById('quickCheckinCard');
    if (!card) return;

    const now = new Date().toISOString();
    const profilePatch = {
      ...checkInState.data,
      lastCheckInSummary: {
        ...checkInState.data,
        checkedAt: now
      }
    };

    card.innerHTML = `
      <div class="quick-checkin-complete">
        <div class="loading-orb compact"></div>
        <h3>Tuning your plan...</h3>
        <p class="text-secondary text-sm">Vita is refreshing your report from this quick check-in.</p>
      </div>`;

    try {
      await AuthManager.updateProfile(profilePatch, false);
      const report = await ReportManager.generate('reportContent');
      window._reportData = report?.data || null;
      window._reportUser = await AuthManager.getCurrentUser(true);
      window._reportHistory = await AuthManager.getReports();
      checkInState = { active: false, step: 0, data: {} };
      renderHistoryTab('checkinContent');
      AuthManager.trackEvent('checkin.completed');
      showToast('Check-in saved. Your updated report is ready.', 'success');
    } catch (error) {
      card.innerHTML = `
        <div class="quick-checkin-complete">
          <h3>Could not save this check-in</h3>
          <p class="text-secondary text-sm">${escapeHtml(error.message || 'Please try again.')}</p>
          <button class="btn btn-primary mt-4" onclick="CheckInManager.startQuickCheckIn()">Try again</button>
        </div>`;
      showToast(error.message || 'Could not save check-in.', 'error');
    }
  }

  async function setFrequency(freq) {
    const user = await AuthManager.setCheckInFrequency(freq);
    window._reportUser = user;
    document.querySelectorAll('.freq-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.freq === freq);
    });
    showToast(`Check-in frequency set to ${freq}.`, 'success');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported here.', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    const status = document.getElementById('notifStatus');
    if (status) status.textContent = `Notification permission: ${permission}`;

    if (permission === 'granted') {
      showToast('Notifications enabled.', 'success');
      setTimeout(() => {
        new Notification('Fitnessify AI — Vita', {
          body: "You're set. Vita can now remind you about check-ins."
        });
      }, 800);
    } else {
      showToast('Notifications are blocked. You can enable them in browser settings.', 'warning');
    }
  }

  function init() {
    setTimeout(showNudgeBanner, 1000);
  }

  return {
    init,
    showNudgeBanner,
    dismissNudge,
    renderHistoryTab,
    setFrequency,
    requestNotifications,
    shouldNudge,
    startQuickCheckIn,
    answerQuickQuestion,
    saveCurrentQuestion,
    previousQuickQuestion,
    cancelQuickCheckIn,
    updateQuickRange
  };
})();
