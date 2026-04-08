/* ====================================================
   FITNESSIFY AI — 8-Step Onboarding Wizard
   ==================================================== */

const OnboardingManager = (() => {
  let currentStep = 1;
  const TOTAL_STEPS = 8;
  let formData = {};

  const stepConfig = [
    { id: 1, title: "Let's start with you", subtitle: 'Basic information to personalize your experience', emoji: '👤' },
    { id: 2, title: 'What are your goals?', subtitle: 'Select all that apply to you', emoji: '🎯' },
    { id: 3, title: 'Your activity & work', subtitle: 'Tell us about your current lifestyle', emoji: '💼' },
    { id: 4, title: 'Sleep patterns', subtitle: 'Good sleep is the foundation of health', emoji: '😴' },
    { id: 5, title: 'Your eating habits', subtitle: "We'll work with what you already do", emoji: '🥗' },
    { id: 6, title: 'Daily routine', subtitle: 'Tell us about a typical day', emoji: '📅' },
    { id: 7, title: 'Stress & wellness', subtitle: 'Mental health is physical health', emoji: '🧘' },
    { id: 8, title: 'Hydration & water', subtitle: 'Your current relationship with water', emoji: '💧' }
  ];

  function init() {
    renderDots();
    showStep(1);
    updateProgress();
    setupMultiSelect();
    setupOptionCards();
    setupRanges();
    setupNavButtons();
  }

  function renderDots() {
    const dotsEl = document.getElementById('stepDots');
    if (!dotsEl) return;
    dotsEl.innerHTML = stepConfig
      .map((step, index) => `<button class="step-dot ${index === 0 ? 'active' : ''}" data-dot="${index + 1}" onclick="OnboardingManager.goToStep(${index + 1})" title="Step ${index + 1}: ${escapeHtml(step.title)}"></button>`)
      .join('');
  }

  function showStep(step) {
    document.querySelectorAll('.step-pane').forEach((pane) => pane.classList.remove('active'));
    const target = document.querySelector(`.step-pane[data-step="${step}"]`);
    if (target) target.classList.add('active');

    const config = stepConfig[step - 1];
    document.getElementById('stepTitle').textContent = config.title;
    document.getElementById('stepSubtitle').textContent = config.subtitle;
    document.getElementById('stepEmoji').textContent = config.emoji;
    document.getElementById('stepCounter').textContent = `Step ${step} of ${TOTAL_STEPS}`;

    document.querySelectorAll('.step-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index < step);
      dot.classList.toggle('completed', index < step - 1);
    });

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const genBtn = document.getElementById('generateBtn');
    if (prevBtn) prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.classList.toggle('hidden', step === TOTAL_STEPS);
    if (genBtn) genBtn.classList.toggle('hidden', step !== TOTAL_STEPS);
  }

  function updateProgress() {
    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${pct}%`;
  }

  function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > currentStep && !validateCurrentStep()) return;

    collectCurrentStepData();
    currentStep = step;
    showStep(currentStep);
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function next() {
    goToStep(currentStep + 1);
  }

  function prev() {
    goToStep(currentStep - 1);
  }

  function validateCurrentStep() {
    const pane = document.querySelector(`.step-pane[data-step="${currentStep}"]`);
    if (!pane) return true;

    let valid = true;
    pane.querySelectorAll('[required]').forEach((field) => {
      field.classList.remove('input-error');
      if (!field.value.trim()) {
        field.classList.add('input-error');
        valid = false;
      }
    });

    if (currentStep === 2 && pane.querySelectorAll('.multi-chip.selected').length === 0) {
      showToast('Please select at least one goal.', 'warning');
      return false;
    }

    if (!valid) {
      showToast('Please fill in all required fields.', 'warning');
    }

    return valid;
  }

  function collectCurrentStepData() {
    const pane = document.querySelector(`.step-pane[data-step="${currentStep}"]`);
    if (!pane) return;

    pane.querySelectorAll('[data-field]').forEach((element) => {
      formData[element.dataset.field] = element.value;
    });

    pane.querySelectorAll('.multi-chip.selected').forEach((chip) => {
      const group = chip.dataset.group;
      if (!formData[group]) formData[group] = [];
      if (!formData[group].includes(chip.dataset.value)) {
        formData[group].push(chip.dataset.value);
      }
    });

    pane.querySelectorAll('.option-card.selected').forEach((card) => {
      formData[card.dataset.fieldCard] = card.dataset.value;
    });
  }

  function setupMultiSelect() {
    document.querySelectorAll('.multi-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const group = chip.dataset.group;
        const isExclusive = chip.dataset.exclusive === 'true';

        if (isExclusive) {
          document.querySelectorAll(`.multi-chip[data-group="${group}"]`).forEach((item) => item.classList.remove('selected'));
          chip.classList.add('selected');
          return;
        }

        document.querySelectorAll(`.multi-chip[data-group="${group}"][data-exclusive="true"]`).forEach((item) => item.classList.remove('selected'));
        chip.classList.toggle('selected');
      });
    });
  }

  function setupOptionCards() {
    window.selectOptionCard = function(element, field) {
      document.querySelectorAll(`.option-card[data-field-card="${field}"]`).forEach((card) => {
        card.classList.remove('selected');
        card.setAttribute('aria-checked', 'false');
      });
      element.classList.add('selected');
      element.setAttribute('aria-checked', 'true');
      formData[field] = element.dataset.value;
    };
  }

  function setupRanges() {
    window.updateRange = function(element, outputId) {
      const pct = ((element.value - element.min) / (element.max - element.min)) * 100;
      element.style.setProperty('--pct', `${pct}%`);
      const output = document.getElementById(outputId);
      if (output) output.textContent = `${element.value} / ${element.max}`;
    };

    document.querySelectorAll('input[type="range"]').forEach((range) => {
      const outputId = range.id === 'f_sleepQuality' ? 'sleepQualityVal' : 'stressLevelVal';
      window.updateRange(range, outputId);
    });
  }

  function setupNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const genBtn = document.getElementById('generateBtn');

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (genBtn) genBtn.addEventListener('click', generateReport);
  }

  async function generateReport() {
    if (!validateCurrentStep()) return;
    collectCurrentStepData();
    await AuthManager.updateProfile(formData, true);
    AuthManager.trackEvent('onboarding.completed');
    window.location.href = 'dashboard.html?new=1';
  }

  function getData() {
    return formData;
  }

  return { init, next, prev, goToStep, getData };
})();

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AuthManager === 'undefined') return;
  const user = await AuthManager.requireAuth();
  if (!user) return;
  OnboardingManager.init();
});
