const STORAGE_KEYS = {
  theme: 'reaction-lab-theme',
  settings: 'reaction-lab-settings',
  stats: 'reaction-lab-stats',
};

const MODE_LABELS = {
  classic: 'Classic Reaction',
  five: '5 Round Challenge',
  ten: '10 Round Challenge',
  aim: 'Aim Challenge',
  color: 'Color Reaction',
};

const COLOR_PALETTE = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#8b5cf6',
  yellow: '#f59e0b',
};

const DIFFICULTY_PRESETS = {
  easy: { minWait: 1400, maxWait: 2600 },
  normal: { minWait: 1000, maxWait: 2200 },
  hard: { minWait: 700, maxWait: 1700 },
  extreme: { minWait: 420, maxWait: 1200 },
  custom: { minWait: 900, maxWait: 2000 },
};

const DEFAULT_SETTINGS = {
  difficulty: 'normal',
  shape: 'circle',
  size: 'medium',
  customSize: 92,
  colorMode: 'random',
  customColor: '#f59e0b',
  animation: 'pop',
  positionMode: 'random',
  sound: true,
  theme: 'dark',
  reduceMotion: false,
  gameMode: 'classic',
};

const DEFAULT_STATS = {
  attempts: 0,
  completedGames: 0,
  bestReaction: null,
  averageReaction: 0,
  fastestReaction: null,
  slowestReaction: null,
  reactions: [],
  personalBests: {
    overall: null,
    classic: null,
    five: null,
    ten: null,
    aim: null,
    color: null,
    difficulty: {},
  },
  modeHistory: {
    classic: [],
    five: [],
    ten: [],
    aim: [],
    color: [],
  },
};

const state = {
  settings: loadSettings(),
  stats: loadStats(),
  mode: 'classic',
  totalRounds: 1,
  currentRound: 0,
  roundResults: [],
  timer: null,
  isPlaying: false,
  targetVisible: false,
  startTime: 0,
  requiredColor: '#f59e0b',
  audioContext: null,
};

const elements = {
  modeCards: document.querySelectorAll('.mode-card'),
  startBtn: document.getElementById('startBtn'),
  retryBtn: document.getElementById('retryBtn'),
  target: document.getElementById('target'),
  statusBadge: document.getElementById('statusBadge'),
  arenaMessage: document.getElementById('arenaMessage'),
  resultCard: document.getElementById('resultCard'),
  gameArena: document.getElementById('gameArena'),
  statsDashboard: document.getElementById('statsDashboard'),
  settingsModal: document.getElementById('settingsModal'),
  statsModal: document.getElementById('statsModal'),
  helpModal: document.getElementById('helpModal'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  statsBtn: document.getElementById('statsBtn'),
  helpBtn: document.getElementById('helpBtn'),
  settingsForm: document.getElementById('settingsForm'),
  difficultySelect: document.getElementById('difficultySelect'),
  shapeSelect: document.getElementById('shapeSelect'),
  sizeSelect: document.getElementById('sizeSelect'),
  customSizeRange: document.getElementById('customSizeRange'),
  colorSelect: document.getElementById('colorSelect'),
  customColorInput: document.getElementById('customColorInput'),
  animationSelect: document.getElementById('animationSelect'),
  positionSelect: document.getElementById('positionSelect'),
  themeSelect: document.getElementById('themeSelect'),
  soundToggle: document.getElementById('soundToggle'),
  reduceMotionToggle: document.getElementById('reduceMotionToggle'),
  resetStatsBtn: document.getElementById('resetStatsBtn'),
  resetAppBtn: document.getElementById('resetAppBtn'),
  statsModalContent: document.getElementById('statsModalContent'),
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || 'null');
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  } catch (error) {
    // ignored to keep the game usable even when storage is unavailable
  }
}

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || 'null');
    return { ...DEFAULT_STATS, ...(saved || {}) };
  } catch (error) {
    return { ...DEFAULT_STATS };
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(state.stats));
  } catch (error) {
    // ignored to keep the game usable even when storage is unavailable
  }
}

function updateTheme() {
  const theme = state.settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? '☾' : '☀';
  const label = theme === 'dark' ? 'Dark' : 'Light';
  elements.themeToggleBtn.querySelector('.icon').textContent = icon;
  elements.themeToggleBtn.querySelector('.label').textContent = label;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (error) {
    // ignored
  }
}

function applyMotionPreference() {
  document.body.classList.toggle('reduced-motion', Boolean(state.settings.reduceMotion));
}

function getDifficultyPreset() {
  return DIFFICULTY_PRESETS[state.settings.difficulty] || DIFFICULTY_PRESETS.normal;
}

function getTargetSize() {
  const customSize = Number(state.settings.customSize) || 92;
  switch (state.settings.size) {
    case 'small':
      return 68;
    case 'large':
      return 124;
    case 'custom':
      return customSize;
    case 'medium':
    default:
      return 96;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getResolvedTargetColor() {
  const mode = state.settings.colorMode;
  if (mode === 'custom') {
    return state.settings.customColor || '#f59e0b';
  }
  if (mode === 'random') {
    const keys = Object.keys(COLOR_PALETTE);
    return COLOR_PALETTE[keys[Math.floor(Math.random() * keys.length)]];
  }
  return COLOR_PALETTE[mode] || COLOR_PALETTE.blue;
}

function getRandomTargetColor() {
  const keys = Object.keys(COLOR_PALETTE);
  return COLOR_PALETTE[keys[Math.floor(Math.random() * keys.length)]];
}

function getColorLabel(hex) {
  const match = Object.entries(COLOR_PALETTE).find(([, value]) => value.toLowerCase() === hex.toLowerCase());
  return match ? match[0] : 'color';
}

function getTargetPosition(size) {
  const arenaRect = elements.gameArena.getBoundingClientRect();
  const maxX = Math.max(0, arenaRect.width - size);
  const maxY = Math.max(0, arenaRect.height - size);

  switch (state.settings.positionMode) {
    case 'center':
      return {
        left: (arenaRect.width - size) / 2,
        top: (arenaRect.height - size) / 2,
      };
    case 'avoid-edges':
      return {
        left: clamp(Math.random() * maxX, 22, Math.max(22, maxX - 22)),
        top: clamp(Math.random() * maxY, 22, Math.max(22, maxY - 22)),
      };
    case 'anywhere':
      return {
        left: Math.random() * maxX,
        top: Math.random() * maxY,
      };
    case 'random':
    default:
      return {
        left: Math.random() * maxX,
        top: Math.random() * maxY,
      };
  }
}

function setStatus(text, tone) {
  elements.statusBadge.textContent = text;
  const palettes = {
    ready: { bg: 'rgba(112, 213, 155, 0.12)', color: 'var(--success)', border: 'rgba(112, 213, 155, 0.35)' },
    waiting: { bg: 'rgba(247, 198, 109, 0.12)', color: 'var(--warning)', border: 'rgba(247, 198, 109, 0.35)' },
    active: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--primary)', border: 'rgba(245, 158, 11, 0.35)' },
    danger: { bg: 'rgba(239, 122, 122, 0.12)', color: 'var(--danger)', border: 'rgba(239, 122, 122, 0.35)' },
  };
  const style = palettes[tone] || palettes.ready;
  elements.statusBadge.style.background = style.bg;
  elements.statusBadge.style.color = style.color;
  elements.statusBadge.style.border = `1px solid ${style.border}`;
}

function displayMessage(message) {
  elements.arenaMessage.textContent = message;
}

function showModal(name) {
  const map = {
    settings: elements.settingsModal,
    stats: elements.statsModal,
    help: elements.helpModal,
  };
  const modal = map[name];
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(name) {
  const map = {
    settings: elements.settingsModal,
    stats: elements.statsModal,
    help: elements.helpModal,
  };
  const modal = map[name];
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function closeAllModals() {
  closeModal('settings');
  closeModal('stats');
  closeModal('help');
}

function selectMode(modeName) {
  state.mode = modeName;
  state.settings.gameMode = modeName;
  elements.modeCards.forEach((card) => {
    const active = card.dataset.mode === modeName;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  saveSettings();
}

function maybePlayTone(type) {
  if (!state.settings.sound) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }

  const tones = {
    countdown: { frequency: 180, duration: 0.08, type: 'sine', volume: 0.04 },
    appear: { frequency: 440, duration: 0.09, type: 'triangle', volume: 0.05 },
    success: { frequency: 620, duration: 0.12, type: 'sine', volume: 0.07 },
    early: { frequency: 160, duration: 0.16, type: 'sawtooth', volume: 0.06 },
    record: { frequency: 740, duration: 0.18, type: 'triangle', volume: 0.08 },
  };

  const tone = tones[type] || tones.countdown;
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.value = tone.frequency;
  gain.gain.value = tone.volume;
  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start();
  setTimeout(() => oscillator.stop(), tone.duration * 1000);
}

function clearTimer() {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function buildTarget() {
  const size = getTargetSize();
  const color = state.mode === 'color' ? state.requiredColor : getResolvedTargetColor();
  const shape = state.settings.shape || 'circle';
  const animation = state.settings.animation || 'pop';

  elements.target.style.width = `${size}px`;
  elements.target.style.height = `${size}px`;
  elements.target.style.background = color;
  elements.target.className = `target shown ${shape} ${animation}`;
  elements.target.setAttribute('aria-label', `Reaction target, ${shape} shape in ${getColorLabel(color)} color`);
}

function placeTarget() {
  const size = getTargetSize();
  const pos = getTargetPosition(size);
  elements.target.style.left = `${pos.left}px`;
  elements.target.style.top = `${pos.top}px`;
}

function scheduleTarget() {
  clearTimer();
  const preset = getDifficultyPreset();
  const minWait = state.settings.difficulty === 'custom' ? 800 : preset.minWait;
  const maxWait = state.settings.difficulty === 'custom' ? 1800 : preset.maxWait;
  const delay = Math.floor(Math.random() * (maxWait - minWait + 1)) + minWait;

  state.isPlaying = true;
  state.targetVisible = false;
  elements.target.classList.remove('shown');
  elements.target.style.display = 'none';
  setStatus('WAITING', 'waiting');
  displayMessage(state.mode === 'color' ? 'Watch closely for the cue.' : 'Wait for the target...');
  maybePlayTone('countdown');

  state.timer = setTimeout(() => {
    if (!state.isPlaying) return;
    showTarget();
  }, delay);
}

function showTarget() {
  if (state.mode === 'color') {
    state.requiredColor = getRandomTargetColor();
  }

  buildTarget();
  placeTarget();
  elements.target.style.display = 'block';
  state.targetVisible = true;
  state.startTime = performance.now();
  setStatus('ACTIVE', 'active');
  displayMessage(state.mode === 'color' ? `Click the ${getColorLabel(state.requiredColor)} target.` : 'Target is live — click now!');
  maybePlayTone('appear');
}

function startSelectedMode(modeName = state.mode) {
  clearTimer();
  closeAllModals();
  state.mode = modeName;
  state.currentRound = 0;
  state.roundResults = [];
  state.isPlaying = true;
  state.targetVisible = false;
  elements.resultCard.classList.add('hidden');
  elements.resultCard.innerHTML = '';

  if (modeName === 'five') {
    state.totalRounds = 5;
  } else if (modeName === 'ten') {
    state.totalRounds = 10;
  } else {
    state.totalRounds = 1;
  }

  selectMode(modeName);
  beginRound();
}

function beginRound() {
  state.currentRound += 1;
  if (state.mode !== 'classic' && state.currentRound > state.totalRounds) {
    finishChallenge();
    return;
  }
  scheduleTarget();
}

function getPerformanceRating(ms) {
  if (ms < 150) return 'Insanely Fast';
  if (ms <= 200) return 'Excellent';
  if (ms <= 250) return 'Very Good';
  if (ms <= 300) return 'Good';
  if (ms <= 400) return 'Average';
  if (ms <= 500) return 'Slow';
  return 'Keep Practicing';
}

function calculateAverage(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function updatePersonalBests(elapsed) {
  const { personalBests } = state.stats;

  if (personalBests.overall === null || elapsed < personalBests.overall) {
    personalBests.overall = elapsed;
    maybePlayTone('record');
  }

  if (personalBests[state.mode] === null || elapsed < personalBests[state.mode]) {
    personalBests[state.mode] = elapsed;
  }

  const difficultyName = state.settings.difficulty;
  if (!personalBests.difficulty[difficultyName] || elapsed < personalBests.difficulty[difficultyName]) {
    personalBests.difficulty[difficultyName] = elapsed;
  }
}

function recordReaction(elapsed) {
  state.stats.attempts += 1;
  state.stats.reactions.push(elapsed);
  state.stats.bestReaction = state.stats.bestReaction === null ? elapsed : Math.min(state.stats.bestReaction, elapsed);
  state.stats.fastestReaction = state.stats.fastestReaction === null ? elapsed : Math.min(state.stats.fastestReaction, elapsed);
  state.stats.slowestReaction = state.stats.slowestReaction === null ? elapsed : Math.max(state.stats.slowestReaction, elapsed);
  state.stats.averageReaction = calculateAverage(state.stats.reactions);

  updatePersonalBests(elapsed);
  state.stats.modeHistory[state.mode] = state.stats.modeHistory[state.mode].concat(elapsed);
  saveStats();
}

function handleEarlyClick() {
  if (!state.isPlaying || state.targetVisible) return;
  clearTimer();
  state.isPlaying = false;
  setStatus('EARLY', 'danger');
  displayMessage('Too Early! Wait for the target to appear.');
  maybePlayTone('early');

  elements.resultCard.classList.remove('hidden');
  elements.resultCard.innerHTML = `
    <h3>Too Early!</h3>
    <p>You clicked before the target appeared.</p>
    <div class="result-grid">
      <div class="result-stat"><span>Result</span><strong>Invalid attempt</strong></div>
      <div class="result-stat"><span>Action</span><strong>Retry</strong></div>
    </div>
  `;
}

function showResultCard(ms, rating, isChallenge, extra) {
  const personalBestText = Number.isFinite(extra && extra.personalBest) && ms <= extra.personalBest ? 'Yes 🏆' : 'No';

  const html = isChallenge
    ? `
      <h3>Game Complete</h3>
      <p class="eyebrow">${MODE_LABELS[state.mode]}</p>
      <div class="result-grid">
        <div class="result-stat"><span>Average</span><strong>${Math.round(ms)} ms</strong></div>
        <div class="result-stat"><span>Performance</span><strong>${rating}</strong></div>
        <div class="result-stat"><span>Best</span><strong>${Number.isFinite(extra.best) ? `${extra.best} ms` : `${Math.round(ms)} ms`}</strong></div>
        <div class="result-stat"><span>Worst</span><strong>${Number.isFinite(extra.worst) ? `${extra.worst} ms` : `${Math.round(ms)} ms`}</strong></div>
        <div class="result-stat"><span>Personal Best</span><strong>${personalBestText}</strong></div>
        <div class="result-stat"><span>Rounds</span><strong>${state.totalRounds}</strong></div>
      </div>
    `
    : `
      <h3>Reaction Time</h3>
      <p class="eyebrow">${MODE_LABELS[state.mode]}</p>
      <div class="result-grid">
        <div class="result-stat"><span>Reaction</span><strong>${Math.round(ms)} ms</strong></div>
        <div class="result-stat"><span>Performance</span><strong>${rating}</strong></div>
        <div class="result-stat"><span>Best</span><strong>${state.stats.bestReaction !== null ? `${state.stats.bestReaction} ms` : 'N/A'}</strong></div>
        <div class="result-stat"><span>Average</span><strong>${state.stats.averageReaction ? `${Math.round(state.stats.averageReaction)} ms` : 'N/A'}</strong></div>
      </div>
    `;

  elements.resultCard.innerHTML = html;
  elements.resultCard.classList.remove('hidden');
}

function handleTargetClick() {
  if (!state.targetVisible || !state.isPlaying) return;
  clearTimer();

  const elapsed = Math.round(performance.now() - state.startTime);
  state.targetVisible = false;
  state.isPlaying = false;
  elements.target.classList.remove('shown');
  elements.target.style.display = 'none';

  const rating = getPerformanceRating(elapsed);
  state.roundResults.push({ ms: elapsed, rating });
  recordReaction(elapsed);
  maybePlayTone('success');
  updateStatsDashboard();

  if (state.mode === 'classic' || state.mode === 'aim' || state.mode === 'color') {
    showResultCard(elapsed, rating, false, {});
    setStatus('READY', 'ready');
    displayMessage('Great reaction. Press Start or Retry to run again.');
    return;
  }

  if (state.currentRound >= state.totalRounds) {
    finishChallenge();
    return;
  }

  setStatus('ROUND DONE', 'ready');
  displayMessage(`Round ${state.currentRound} complete. Preparing the next test...`);
  setTimeout(() => beginRound(), 700);
}

function finishChallenge() {
  const values = state.roundResults.map((item) => item.ms);
  const average = calculateAverage(values);
  const best = Math.min.apply(null, values);
  const worst = Math.max.apply(null, values);
  const rating = getPerformanceRating(average);

  state.stats.completedGames += 1;

  if (state.mode === 'five') {
    const currentBest = state.stats.personalBests.five;
    state.stats.personalBests.five = currentBest === null ? average : Math.min(currentBest, average);
  }

  if (state.mode === 'ten') {
    const currentBest = state.stats.personalBests.ten;
    state.stats.personalBests.ten = currentBest === null ? average : Math.min(currentBest, average);
  }

  saveStats();
  updateStatsDashboard();
  showResultCard(average, rating, true, {
    best,
    worst,
    personalBest: state.stats.personalBests[state.mode] || average,
  });
  displayMessage('Challenge complete. Great work.');
  setStatus('COMPLETE', 'ready');
}

function renderStatsCards() {
  const cards = [
    ['Current', state.stats.reactions.length ? `${state.stats.reactions[state.stats.reactions.length - 1]} ms` : '—'],
    ['Best', state.stats.bestReaction !== null ? `${state.stats.bestReaction} ms` : '—'],
    ['Average', state.stats.averageReaction ? `${Math.round(state.stats.averageReaction)} ms` : '—'],
    ['Fastest', state.stats.fastestReaction !== null ? `${state.stats.fastestReaction} ms` : '—'],
    ['Slowest', state.stats.slowestReaction !== null ? `${state.stats.slowestReaction} ms` : '—'],
    ['Attempts', `${state.stats.attempts}`],
    ['Completed', `${state.stats.completedGames}`],
    ['5 Round Avg', state.stats.personalBests.five ? `${Math.round(state.stats.personalBests.five)} ms` : '—'],
  ];

  elements.statsDashboard.innerHTML = cards
    .map(([label, value]) => `
      <div class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join('');
}

function renderStatsModal() {
  const cards = [
    ['Current Reaction', state.stats.reactions.length ? `${state.stats.reactions[state.stats.reactions.length - 1]} ms` : 'N/A'],
    ['Best Overall', state.stats.bestReaction !== null ? `${state.stats.bestReaction} ms` : 'N/A'],
    ['Average', state.stats.averageReaction ? `${Math.round(state.stats.averageReaction)} ms` : 'N/A'],
    ['Fastest', state.stats.fastestReaction !== null ? `${state.stats.fastestReaction} ms` : 'N/A'],
    ['Slowest', state.stats.slowestReaction !== null ? `${state.stats.slowestReaction} ms` : 'N/A'],
    ['Attempts', `${state.stats.attempts}`],
    ['Completed Games', `${state.stats.completedGames}`],
    ['Best 5 Round', state.stats.personalBests.five ? `${Math.round(state.stats.personalBests.five)} ms` : 'N/A'],
    ['Best 10 Round', state.stats.personalBests.ten ? `${Math.round(state.stats.personalBests.ten)} ms` : 'N/A'],
    ['Classic Best', state.stats.personalBests.classic ? `${state.stats.personalBests.classic} ms` : 'N/A'],
    ['Aim Best', state.stats.personalBests.aim ? `${state.stats.personalBests.aim} ms` : 'N/A'],
    ['Color Best', state.stats.personalBests.color ? `${state.stats.personalBests.color} ms` : 'N/A'],
    ['Difficulty Best', state.stats.personalBests.difficulty[state.settings.difficulty] ? `${state.stats.personalBests.difficulty[state.settings.difficulty]} ms` : 'N/A'],
  ];

  elements.statsModalContent.innerHTML = cards
    .map(([label, value]) => `
      <div class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join('');
}

function updateStatsDashboard() {
  renderStatsCards();
  renderStatsModal();
}

function resetStatistics() {
  const confirmed = window.confirm('Reset all saved reaction statistics and personal bests?');
  if (!confirmed) return;

  state.stats = createDefaultStats();
  saveStats();
  updateStatsDashboard();
  displayMessage('Statistics reset. Fresh run ready.');
}

function createDefaultStats() {
  return {
    ...DEFAULT_STATS,
    reactions: [],
    personalBests: { ...DEFAULT_STATS.personalBests, difficulty: {} },
    modeHistory: {
      classic: [],
      five: [],
      ten: [],
      aim: [],
      color: [],
    },
  };
}

function resetEverythingAndStartClassic() {
  const confirmed = window.confirm('Reset statistics, settings, and return to a fresh Classic Reaction game?');
  if (!confirmed) return;

  clearTimer();
  state.settings = { ...DEFAULT_SETTINGS };
  state.stats = createDefaultStats();
  state.mode = 'classic';
  saveSettings();
  saveStats();
  syncSettingsControls();
  updateTheme();
  applyMotionPreference();
  updateStatsDashboard();
  closeModal('settings');
  startSelectedMode('classic');
}

function syncSettingsControls() {
  elements.difficultySelect.value = state.settings.difficulty;
  elements.shapeSelect.value = state.settings.shape;
  elements.sizeSelect.value = state.settings.size;
  elements.customSizeRange.value = String(state.settings.customSize || 92);
  elements.colorSelect.value = state.settings.colorMode;
  elements.customColorInput.value = state.settings.customColor || '#f59e0b';
  elements.animationSelect.value = state.settings.animation;
  elements.positionSelect.value = state.settings.positionMode;
  elements.themeSelect.value = state.settings.theme;
  elements.soundToggle.checked = state.settings.sound;
  elements.reduceMotionToggle.checked = state.settings.reduceMotion;
}

function bindSettingsInputs() {
  syncSettingsControls();

  elements.settingsForm.addEventListener('change', (event) => {
    const { target } = event;

    if (target === elements.difficultySelect) state.settings.difficulty = target.value;
    if (target === elements.shapeSelect) state.settings.shape = target.value;
    if (target === elements.sizeSelect) state.settings.size = target.value;
    if (target === elements.customSizeRange) state.settings.customSize = Number(target.value);
    if (target === elements.colorSelect) state.settings.colorMode = target.value;
    if (target === elements.customColorInput) state.settings.customColor = target.value;
    if (target === elements.animationSelect) state.settings.animation = target.value;
    if (target === elements.positionSelect) state.settings.positionMode = target.value;
    if (target === elements.themeSelect) {
      state.settings.theme = target.value;
      updateTheme();
    }
    if (target === elements.soundToggle) state.settings.sound = target.checked;
    if (target === elements.reduceMotionToggle) {
      state.settings.reduceMotion = target.checked;
      applyMotionPreference();
    }

    saveSettings();
    if (state.targetVisible) {
      buildTarget();
      placeTarget();
    }
  });
}

function bindHeaderControls() {
  elements.themeToggleBtn.addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    elements.themeSelect.value = state.settings.theme;
    updateTheme();
    saveSettings();
  });

  elements.settingsBtn.addEventListener('click', () => showModal('settings'));
  elements.statsBtn.addEventListener('click', () => {
    renderStatsModal();
    showModal('stats');
  });
  elements.helpBtn.addEventListener('click', () => showModal('help'));
  elements.resetStatsBtn.addEventListener('click', resetStatistics);
  elements.resetAppBtn.addEventListener('click', resetEverythingAndStartClassic);

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.closeModal;
      closeModal(name);
    });
  });
}

function bindArenaInteraction() {
  elements.modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      clearTimer();
      state.isPlaying = false;
      state.targetVisible = false;
      elements.target.classList.remove('shown');
      elements.target.style.display = 'none';
      elements.resultCard.classList.add('hidden');
      elements.resultCard.innerHTML = '';
      selectMode(card.dataset.mode);
      setStatus('READY', 'ready');
      displayMessage(`${MODE_LABELS[state.mode]} selected. Press Start.`);
    });
  });

  elements.gameArena.addEventListener('pointerdown', (event) => {
    if (!state.isPlaying || state.targetVisible) return;
    if (event.target === elements.gameArena || event.target === elements.arenaMessage) {
      handleEarlyClick();
    }
  });

  elements.target.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    handleTargetClick();
  });

  elements.startBtn.addEventListener('click', () => startSelectedMode(state.mode));
  elements.retryBtn.addEventListener('click', () => startSelectedMode(state.mode));
}

function bindKeyboardControls() {
  document.addEventListener('keydown', (event) => {
    const activeTag = document.activeElement && document.activeElement.tagName;
    const isInteractive = activeTag && ['BUTTON', 'SELECT', 'INPUT'].includes(activeTag);

    if ((event.code === 'Space' || event.key === 'Enter') && !isInteractive) {
      event.preventDefault();
      startSelectedMode(state.mode);
    }

    if (event.key === 'Escape') {
      closeAllModals();
    }
  });
}

function initialize() {
  updateTheme();
  applyMotionPreference();
  bindSettingsInputs();
  bindHeaderControls();
  bindArenaInteraction();
  bindKeyboardControls();
  updateStatsDashboard();
  selectMode(state.mode);
  displayMessage('Select a mode and press Start.');
  setStatus('READY', 'ready');
}

initialize();
