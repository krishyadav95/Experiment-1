/* ====================================================
   FITNESSIFY AI — Report Renderer
   ==================================================== */

const ReportManager = (() => {
  async function generate(containerId) {
    const user = await AuthManager.getCurrentUser();
    const container = document.getElementById(containerId);
    if (!user || !container) return null;

    container.innerHTML = renderLoading();

    const payload = await apiRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const report = payload.report || null;
    if (!report) {
      throw new Error('Unable to generate report.');
    }

    window._reportData = report.data;
    window._reportUser = user;
    container.innerHTML = renderReport(report.data, user);
    bindDownloadButtons(report.data, user);
    AuthManager.trackEvent('report.generated');

    return report;
  }

  function renderLoading() {
    return `
      <div class="report-loading">
        <div class="loading-orb"></div>
        <h3>Vita is analyzing your profile…</h3>
        <p>Crafting your personalized wellness plan.</p>
        <div class="loading-steps">
          <div class="loading-step active" id="ls1">⚡ Analyzing lifestyle patterns…</div>
          <div class="loading-step" id="ls2">🔗 Identifying habit stacking opportunities…</div>
          <div class="loading-step" id="ls3">💡 Generating personalized recommendations…</div>
          <div class="loading-step" id="ls4">📊 Compiling your wellness score…</div>
        </div>
      </div>`;
  }

  function renderReport(data, user) {
    const scores = data.score || {};

    return `
      <div class="report-wrapper animate-fade-up">
        <div class="report-header">
          <div class="report-header-left">
            <div class="report-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
            <div>
              <h2>${escapeHtml(user.name)}'s Wellness Report</h2>
              <p class="text-secondary text-sm">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div class="report-actions">
            <button id="downloadReportBtn" class="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PDF
            </button>
          </div>
        </div>

        <div class="report-summary-card">
          <div class="vita-avatar">🤖</div>
          <div>
            <p class="vita-label">Vita says</p>
            <p class="vita-message">"${escapeHtml(data.summary)}"</p>
          </div>
        </div>

        <div class="bmi-card">
          <span class="bmi-icon">⚕️</span>
          <div>
            <strong>Wellness guidance only</strong>
            <p class="text-secondary text-sm mt-1">This report is not medical advice. For symptoms, diagnoses, or treatment decisions, consult a qualified healthcare professional.</p>
          </div>
        </div>

        <div class="score-section">
          <div class="score-main">
            <div class="score-circle" style="--score: ${scores.overall || 70}">
              <div class="score-inner">
                <span class="score-number">${scores.overall || 70}</span>
                <span class="score-label">Wellness Score</span>
              </div>
            </div>
          </div>
          <div class="score-breakdown">
            ${renderScoreBar('Hydration', scores.hydration || 0, '💧')}
            ${renderScoreBar('Nutrition', scores.nutrition || 0, '🥗')}
            ${renderScoreBar('Movement', scores.movement || 0, '🏃')}
            ${renderScoreBar('Sleep', scores.sleep || 0, '😴')}
            ${renderScoreBar('Stress', scores.stress || 0, '🧘')}
          </div>
        </div>

        ${data.bmi_info && data.bmi_info.value !== 'N/A' ? `
        <div class="bmi-card">
          <span class="bmi-icon">📏</span>
          <div>
            <strong>BMI: ${escapeHtml(data.bmi_info.value)} — ${escapeHtml(data.bmi_info.category)}</strong>
            <p class="text-secondary text-sm mt-1">${escapeHtml(data.bmi_info.note)}</p>
          </div>
        </div>` : ''}

        <div class="report-sections">
          ${(data.sections || []).map((section) => renderSection(section)).join('')}
        </div>

        ${data.action_plan ? `
        <div class="action-plan-card">
          <h3>📅 Your 4-Week Action Plan</h3>
          <p class="text-secondary text-sm mb-4">One focus per week — small steps, lasting change.</p>
          <div class="action-weeks">
            ${data.action_plan.map((week, index) => `
              <div class="action-week">
                <div class="week-badge">Week ${Number(week.week) || index + 1}</div>
                <div class="week-content">
                  <strong>${escapeHtml(week.focus)}</strong>
                  <p>${escapeHtml(week.action)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        ${data.motivational_note ? `
        <div class="motivational-card">
          <div class="motivational-emoji">💪</div>
          <p>${escapeHtml(data.motivational_note)}</p>
        </div>` : ''}

        <div class="report-footer-actions">
          <button id="downloadReportBtn2" class="btn btn-primary">
            ⬇️ Download Full Report PDF
          </button>
          <button class="btn btn-outline" onclick="openTab('chat')">
            💬 Ask Vita a Question
          </button>
        </div>
      </div>`;
  }

  function renderScoreBar(label, score, icon) {
    const color = score >= 75 ? '#00D9A7' : score >= 50 ? '#6C63FF' : '#F59E0B';
    return `
      <div class="score-bar-item">
        <div class="score-bar-label">
          <span>${escapeHtml(icon)} ${escapeHtml(label)}</span>
          <span style="color: ${color}">${score}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${score}%; background: ${color}"></div>
        </div>
      </div>`;
  }

  function renderSection(section) {
    return `
      <div class="report-section">
        <div class="section-header">
          <div class="section-icon" style="background: ${escapeHtml(section.color)}22; color: ${escapeHtml(section.color)}">${escapeHtml(section.icon)}</div>
          <div>
            <h3 class="section-title">${escapeHtml(section.title)}</h3>
            <p class="section-summary">${escapeHtml(section.summary)}</p>
          </div>
          <div class="section-priority">
            <span class="priority-badge" style="background: ${escapeHtml(section.color)}22; color: ${escapeHtml(section.color)}">
              Priority ${Number(section.priority) || 0}/10
            </span>
          </div>
        </div>
        <div class="recommendations-grid">
          ${(section.recommendations || []).map((rec) => renderRecommendation(rec)).join('')}
        </div>
      </div>`;
  }

  function renderRecommendation(rec) {
    const effortColors = { Easy: '#00D9A7', Medium: '#F59E0B', Hard: '#EF4444' };
    const effortColor = effortColors[rec.effort] || '#6b7280';

    return `
      <div class="recommendation-card">
        <div class="rec-header">
          <h4 class="rec-title">${escapeHtml(rec.title)}</h4>
          <div class="rec-badges">
            <span class="rec-badge" style="background: ${effortColor}22; color: ${effortColor}">${escapeHtml(rec.effort || 'Easy')}</span>
            <span class="rec-badge impact-badge">⚡ ${escapeHtml(rec.impact || 'High')} Impact</span>
          </div>
        </div>
        <p class="rec-description">${escapeHtml(rec.description)}</p>
        ${rec.when ? `<div class="rec-when"><span>🕐</span> <span>${escapeHtml(rec.when)}</span></div>` : ''}
      </div>`;
  }

  function bindDownloadButtons(reportData, user) {
    ['downloadReportBtn', 'downloadReportBtn2'].forEach((id) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => {
          AuthManager.trackEvent('report.pdf_downloaded');
          PdfManager.download(reportData, user);
        });
      }
    });
  }

  async function renderFromSaved(containerId) {
    const user = await AuthManager.getCurrentUser();
    const container = document.getElementById(containerId);
    if (!user || !container) return;

    const latest = await AuthManager.getLatestReport();
    if (latest && latest.data) {
      window._reportData = latest.data;
      window._reportUser = user;
      container.innerHTML = renderReport(latest.data, user);
      bindDownloadButtons(latest.data, user);
      return;
    }

    container.innerHTML = `
      <div class="empty-report">
        <div class="empty-icon">📋</div>
        <h3>No report yet</h3>
        <p>Complete your wellness profile to generate your personalized report.</p>
        <a href="onboarding.html" class="btn btn-primary mt-4">Complete Profile →</a>
      </div>`;
  }

  return { generate, renderFromSaved, renderLoading };
})();
