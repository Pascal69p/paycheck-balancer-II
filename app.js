'use strict';

/* ================================================================
   BANK-STYLE MATHEMATICAL PRECISION FIX
   Using integer cents (multiply by 100, integer math, divide by 100)
   FIXED: No rounding - exact arithmetic
=============================================================== */

/* ================================================================
   AI FINANCIAL ASSISTANT INTEGRATION
   Backend API proxy for Gemini AI with API key security
=============================================================== */

const API_BASE_URL = '';
let aiAssistantAvailable = true;

async function askFinancialAssistant(userQuestion) {
  if (!userQuestion || userQuestion.trim().length === 0) {
    return 'Please enter a question about your finances.';
  }

  const context = buildFinancialContext();

  try {
    const response = await fetch(`/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: userQuestion,
        context: context
      })
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.response;

  } catch (error) {
    console.error('[AI] Request failed:', error);
    return generateLocalResponse(userQuestion, context);
  }
}

function buildFinancialContext() {
  const currentPeriodStart = S.currentPeriod;
  const periodEnd = getPeriodEndDate(S.currentPeriod);

  const categorySpending = S.categories.map(c => ({
    name: c.name,
    spent: c.spent,
    allocated: c.allocated,
    percentUsed: c.allocated > 0 ? (c.spent / c.allocated) * 100 : 0
  })).sort((a, b) => b.spent - a.spent).slice(0, 5);

  const savingsGoals = S.savings.map(g => ({
    name: g.name,
    progress: g.target > 0 ? (g.saved / g.target) * 100 : 0,
    remaining: subtractMoney(g.target, g.saved)
  }));

  const upcomingBills = getUpcomingBills();
  const totalUpcomingAmount = upcomingBills.reduce((sum, b) => addMoney(sum, b.amount), 0);

  return {
    paycheckAmount: S.paycheckAmount,
    totalSpent: totalSpent(),
    totalAllocated: totalAllocated(),
    remainingBalance: subtractMoney(S.paycheckAmount, totalSpent()),
    rollbackPool: S.rollbackPool,
    topSpendingCategories: categorySpending,
    savingsGoals: savingsGoals,
    upcomingBillsCount: upcomingBills.length,
    upcomingBillsTotal: totalUpcomingAmount,
    payPeriod: S.payPeriod,
    totalBudgetPercentage: totalPct(),
    periodStart: currentPeriodStart,
    periodEnd: periodEnd ? periodEnd.toISOString().split('T')[0] : 'Unknown'
  };
}

function generateLocalResponse(question, context) {
  const lowerQuestion = question.toLowerCase();
  const remaining = context.remainingBalance || 0;
  const totalSpent = context.totalSpent || 0;
  const allocated = context.totalAllocated || 0;

  if (lowerQuestion.includes('balance') || lowerQuestion.includes('remaining')) {
    return `Your current remaining balance is $${remaining.toFixed(2)}. You have spent $${totalSpent.toFixed(2)} of your $${(context.paycheckAmount || 0).toFixed(2)} paycheck for this period.`;
  }

  if (lowerQuestion.includes('spending') || lowerQuestion.includes('spent')) {
    return `You have spent $${totalSpent.toFixed(2)} across ${context.topSpendingCategories?.length || 0} categories. This represents ${allocated > 0 ? ((totalSpent / allocated) * 100).toFixed(0) : 0}% of your allocated budget.`;
  }

  if (lowerQuestion.includes('saving') || lowerQuestion.includes('rollback')) {
    return `Your Rollback Pool contains $${(context.rollbackPool || 0).toFixed(2)}. This accumulates unspent funds from previous pay periods. Use the History tab to withdraw to your current paycheck or allocate to savings goals.`;
  }

  return `I can help with financial questions. Try asking: "What is my remaining balance?", "How much have I spent?", "Analyze my savings", or "Show upcoming bills".`;
}

function addAIMessage(text, isUser = false) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${isUser ? 'ai-user' : 'ai-bot'}`;

  const icon = isUser ? 'fa-user' : 'fa-robot';
  const iconColor = isUser ? '' : 'style="color: var(--accent2);"';

  messageDiv.innerHTML = `
    <i class="fas ${icon}" ${iconColor}></i>
    <div style="flex: 1; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(text)}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function showAILoading() {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message ai-bot';
  loadingDiv.id = 'aiLoading';
  loadingDiv.innerHTML = `
    <i class="fas fa-robot"></i>
    <div class="ai-loading">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
}

function hideAILoading() {
  const loading = document.getElementById('aiLoading');
  if (loading) loading.remove();
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const question = input.value.trim();

  if (!question) return;

  addAIMessage(question, true);
  input.value = '';
  input.disabled = true;

  showAILoading();

  try {
    const response = await askFinancialAssistant(question);
    hideAILoading();
    addAIMessage(response, false);
  } catch (error) {
    hideAILoading();
    addAIMessage('I encountered an issue processing your request. Please try again.', false);
    console.error('[AI] Send error:', error);
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function openAIModal() {
  const modal = document.getElementById('aiAssistantModal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('aiInput');
      if (input) input.focus();
    }, 300);
  }
}

function closeAIModal() {
  closeModal('aiAssistantModal');
}

function initializeAIAssistant() {
  const sendBtn = document.getElementById('aiSendBtn');
  const closeBtn = document.getElementById('aiCloseBtn');
  const input = document.getElementById('aiInput');
  const suggestionChips = document.querySelectorAll('.ai-suggestion-chip');

  if (sendBtn) {
    sendBtn.addEventListener('click', sendAIMessage);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeAIModal);
  }

  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }

  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const question = chip.textContent.trim();
      if (input) {
        input.value = question;
        sendAIMessage();
      }
    });
  });
}

function addAIToDashboard() {
  const dashboardEl = document.getElementById('dashboard-content');
  if (!dashboardEl) return;

  const aiCard = document.createElement('div');
  aiCard.className = 'card';
  aiCard.style.background = 'linear-gradient(135deg, var(--surface), var(--surface2))';
  aiCard.style.marginTop = '8px';
  aiCard.style.cursor = 'pointer';
  aiCard.innerHTML = `
    <div class="flex-between">
      <div>
        <div class="card-title"><i class="fas fa-robot"></i> AI Financial Assistant</div>
        <div class="fs14" style="color: var(--text2);">Get personalized insights about your budget, spending, and savings</div>
      </div>
      <button class="btn btn-primary btn-sm" id="askAIDashboardBtn">
        <i class="fas fa-comment-dots"></i> Ask AI
      </button>
    </div>
  `;

  const statsGrid = dashboardEl.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.insertAdjacentElement('afterend', aiCard);
  } else {
    dashboardEl.appendChild(aiCard);
  }

  const askBtn = document.getElementById('askAIDashboardBtn');
  if (askBtn) {
    askBtn.addEventListener('click', openAIModal);
  }
}

function addAIFloatingButton() {
  const existingFab = document.getElementById('aiFab');
  if (existingFab) return;

  const aiFab = document.createElement('button');
  aiFab.id = 'aiFab';
  aiFab.innerHTML = '<i class="fas fa-robot"></i>';
  aiFab.setAttribute('aria-label', 'Open AI Assistant');
  aiFab.style.cssText = `
    position: fixed;
    bottom: calc(24px + var(--safe-bot, 0px));
    right: 90px;
    width: 50px;
    height: 50px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    border: none;
    color: white;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 100;
  `;

  aiFab.onclick = openAIModal;
  document.body.appendChild(aiFab);
}

// Convert dollar amount to cents (integer) - parse string to avoid float issues
function toCents(amount) {
  if (amount === undefined || amount === null) return 0;

  if (typeof amount === 'string') {
    const str = amount.trim();
    if (str === '') return 0;

    const match = str.match(/^-?(\d+)(?:\.(\d{1,2}))?$/);
    if (match) {
      let dollars = parseInt(match[1], 10);
      let cents = 0;
      if (match[2]) {
        cents = parseInt(match[2].slice(0, 2).padEnd(2, '0'), 10);
      }
      let total = dollars * 100 + cents;
      return str.startsWith('-') ? -total : total;
    }
  }

  if (typeof amount === 'number' && !isNaN(amount)) {
    const fixed = amount.toFixed(10);
    const match = fixed.match(/^-?(\d+)(?:\.(\d+))?$/);
    if (match) {
      let dollars = parseInt(match[1], 10);
      let cents = 0;
      if (match[2]) {
        cents = parseInt(match[2].slice(0, 2).padEnd(2, '0'), 10);
      }
      let total = dollars * 100 + cents;
      return amount < 0 ? -total : total;
    }
  }

  return 0;
}

function fromCents(cents) {
  return cents / 100;
}

function formatNumberWithCommas(num) {
  if (num === undefined || num === null || num === '') return '';
  const numStr = num.toString();
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function parseFormattedNumber(str) {
  if (!str || str === '') return '';

  let cleaned = str.toString().trim();

  cleaned = cleaned.replace(/[$€£¥]/g, '');
  cleaned = cleaned.replace(/\s/g, '');

  const hasCommaAsDecimal = cleaned.includes(',') && !cleaned.includes('.');
  if (hasCommaAsDecimal) {
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  const decimalIndex = cleaned.indexOf('.');
  if (decimalIndex !== -1) {
    const beforeDecimal = cleaned.substring(0, decimalIndex);
    const afterDecimal = cleaned.substring(decimalIndex + 1).replace(/\./g, '');
    cleaned = beforeDecimal + '.' + afterDecimal;
  }

  if (cleaned === '' || cleaned === '-' || cleaned === '.') return '';

  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';

  return cleaned;
}

function applyThousandSeparator(inputEl) {
  if (!inputEl) return inputEl;

  if (inputEl._thousandSepAttached) return inputEl;
  inputEl._thousandSepAttached = true;

  let lastCursorPosition = 0;

  inputEl.addEventListener('blur', function () {
    let val = parseFormattedNumber(this.value);
    if (val !== '' && val !== null && !isNaN(parseFloat(val))) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const formatted = formatNumberWithCommas(num.toFixed(2));
        this.value = formatted;
      }
    }
  });

  inputEl.addEventListener('focus', function () {
    let val = parseFormattedNumber(this.value);
    if (val !== '' && val !== null && !isNaN(parseFloat(val))) {
      const rawValue = parseFloat(val).toString();
      this.value = rawValue;
      if (lastCursorPosition && lastCursorPosition <= this.value.length) {
        this.setSelectionRange(lastCursorPosition, lastCursorPosition);
      }
    }
  });

  inputEl.addEventListener('keyup', function (e) {
    lastCursorPosition = this.selectionStart;
  });

  inputEl.addEventListener('click', function () {
    lastCursorPosition = this.selectionStart;
  });

  return inputEl;
}

function distributeExactPercent(totalCents, percentages) {
  const n = percentages.length;
  const allocatedCents = new Array(n).fill(0);
  let totalAllocatedCents = 0;

  for (let i = 0; i < n; i++) {
    const exactCents = (totalCents * percentages[i]) / 100;
    allocatedCents[i] = Math.floor(exactCents);
    totalAllocatedCents += allocatedCents[i];
  }

  let remainder = totalCents - totalAllocatedCents;
  let i = 0;
  while (remainder > 0 && i < n) {
    allocatedCents[i]++;
    remainder--;
    i++;
  }

  return allocatedCents;
}

function percentOf(amount, pct) {
  const cents = toCents(amount);
  const resultCents = Math.floor(cents * pct / 100);
  return fromCents(resultCents);
}

function addMoney(a, b) {
  const totalCents = toCents(a) + toCents(b);
  return fromCents(totalCents);
}

function subtractMoney(a, b) {
  const totalCents = toCents(a) - toCents(b);
  return fromCents(totalCents);
}

const fmt = v => {
  if (v === undefined || v === null || isNaN(v)) return '$0.00';

  const cents = toCents(v);
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const sign = cents < 0 ? '-' : '';
  const dollarsFormatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return sign + '$' + dollarsFormatted + '.' + (remainingCents < 10 ? '0' + remainingCents : remainingCents);
};

const fmtSigned = v => (v >= 0 ? '+' : '-') + fmt(Math.abs(v));

const fmtDate = iso => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return iso; }
};
const uid = () => Date.now() + Math.floor(Math.random() * 9999);
const todayStr = () => new Date().toISOString().split('T')[0];

/* ----------------------- STORAGE (localStorage) ------------------ */
const STORE_KEY = 'pb_v10_side_drawer';
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return null;
}
function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Storage full — export your data!', 'error'); }
}

/* ------------------------ DIRTY FLAG FOR UNSAVED CHANGES -------------------------- */
let isDirty = false;
function markDirty() {
  isDirty = true;
}
function clearDirty() {
  isDirty = false;
}

/* ------------------------ LAST SAVED TIMESTAMP -------------------------- */
let lastSavedTime = Date.now();

function updateLastSaved() {
  lastSavedTime = Date.now();
  const el = document.getElementById('lastSavedTime');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

/* ------------------------ SCROLL POSITION STORAGE -------------------------- */
const scrollPositions = {};

function saveScrollPosition(viewName) {
  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl) {
    scrollPositions[viewName] = viewEl.scrollTop;
  }
}

function restoreScrollPosition(viewName) {
  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl && scrollPositions[viewName] !== undefined) {
    setTimeout(() => {
      viewEl.scrollTop = scrollPositions[viewName];
    }, 50);
  }
}

/* ------------------------ INITIAL STATE -------------------------- */
function defaultState() {
  return {
    paycheckAmount: 0,
    payPeriod: 'biweekly',
    categories: [],
    spending: [],
    history: [],
    externalFunds: [],
    rollbackPool: 0,
    rollbackHistory: [],
    savings: [],
    analyticsHistory: [],
    recurring: [],
    currentPeriod: todayStr(),
    periods: [todayStr()],
    theme: 'dark',
    customPresets: [
      { name: 'Rent', pct: 30 },
      { name: 'Groceries', pct: 15 },
      { name: 'Transport', pct: 10 },
      { name: 'Savings', pct: 20 },
      { name: 'Fun', pct: 10 },
      { name: 'Utilities', pct: 8 },
      { name: 'Health', pct: 5 },
      { name: 'Clothing', pct: 2 },
    ]
  };
}

/* --------------------------- APP STATE --------------------------- */
let S = defaultState();
const saved = loadState();
if (saved) {
  S = { ...defaultState(), ...saved };
  if (!S.savings) S.savings = [];
  if (!S.analyticsHistory) S.analyticsHistory = [];
  if (!S.customPresets) S.customPresets = defaultState().customPresets;
  if (!S.recurring) S.recurring = [];

  if (S.recurring) {
    S.recurring.forEach(r => {
      if (r.active === undefined) r.active = true;
    });
  }

  if (typeof S.paycheckAmount === 'number') S.paycheckAmount = fromCents(toCents(S.paycheckAmount));
  if (typeof S.rollbackPool === 'number') S.rollbackPool = fromCents(toCents(S.rollbackPool));
  if (S.categories && Array.isArray(S.categories)) {
    S.categories.forEach(c => {
      c.allocated = fromCents(toCents(c.allocated || 0));
      c.spent = fromCents(toCents(c.spent || 0));
      c.remaining = fromCents(toCents(c.remaining || 0));
    });
  }
  if (S.spending && Array.isArray(S.spending)) {
    S.spending.forEach(s => { s.amount = fromCents(toCents(s.amount)); });
  }
  if (S.history && Array.isArray(S.history)) {
    S.history.forEach(h => { h.amount = fromCents(toCents(h.amount)); });
  }
  if (S.savings && Array.isArray(S.savings)) {
    S.savings.forEach(g => {
      g.target = fromCents(toCents(g.target || 0));
      g.saved = fromCents(toCents(g.saved || 0));
    });
  }
  if (S.recurring && Array.isArray(S.recurring)) {
    S.recurring.forEach(r => {
      r.amount = fromCents(toCents(r.amount || 0));
    });
  }
}

/* ----------------------- CALCULATIONS ---------------------------- */
function calcAllocations() {
  if (S.paycheckAmount === 0 || !S.categories || S.categories.length === 0) {
    if (S.categories) {
      S.categories.forEach(cat => {
        cat.allocated = 0;
        const spent = S.spending
          .filter(s => s.categoryId === cat.id && s.period === S.currentPeriod)
          .reduce((sum, s) => addMoney(sum, s.amount), 0);
        cat.spent = spent;
        cat.remaining = subtractMoney(0, spent);
      });
    }
    return;
  }

  const paycheckCents = toCents(S.paycheckAmount);
  const percentages = S.categories.map(c => c.pct);
  const totalPct = percentages.reduce((a, b) => a + b, 0);

  if (Math.abs(totalPct - 100) < 0.001) {
    const allocatedCents = distributeExactPercent(paycheckCents, percentages);
    S.categories.forEach((cat, idx) => {
      cat.allocated = fromCents(allocatedCents[idx]);
      const spent = S.spending
        .filter(s => s.categoryId === cat.id && s.period === S.currentPeriod)
        .reduce((sum, s) => addMoney(sum, s.amount), 0);
      cat.spent = spent;
      cat.remaining = subtractMoney(cat.allocated, cat.spent);
    });
  } else {
    S.categories.forEach(cat => {
      cat.allocated = percentOf(S.paycheckAmount, cat.pct);
      const spent = S.spending
        .filter(s => s.categoryId === cat.id && s.period === S.currentPeriod)
        .reduce((sum, s) => addMoney(sum, s.amount), 0);
      cat.spent = spent;
      cat.remaining = subtractMoney(cat.allocated, cat.spent);
    });
  }
  markDirty();
}
calcAllocations();

function totalAllocated() {
  if (!S.categories) return 0;
  return S.categories.reduce((s, c) => addMoney(s, c.allocated), 0);
}
function totalSpent() {
  if (!S.spending) return 0;
  return S.spending.filter(s => s.period === S.currentPeriod).reduce((s, e) => addMoney(s, e.amount), 0);
}
function totalPct() {
  if (!S.categories) return 0;
  return S.categories.reduce((s, c) => s + (c.pct || 0), 0);
}
function currentBalance() {
  const balance = subtractMoney(S.paycheckAmount, totalSpent());
  return isNaN(balance) ? 0 : balance;
}

function moveCategoryUp(index) {
  if (index === 0) return;
  [S.categories[index - 1], S.categories[index]] = [S.categories[index], S.categories[index - 1]];
  save();
  renderCategories();
}

function moveCategoryDown(index) {
  if (index === S.categories.length - 1) return;
  [S.categories[index], S.categories[index + 1]] = [S.categories[index + 1], S.categories[index]];
  save();
  renderCategories();
}

/* --------------------------- TOAST ------------------------------- */
let toastTimer = null;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;

  if (toastTimer) clearTimeout(toastTimer);

  el.textContent = msg;
  el.className = `show ${type}`;

  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => {
      if (!el.classList.contains('show')) {
        el.textContent = '';
      }
    }, 300);
  }, 2500);
}

/* -------------------------- CONFIRM ------------------------------ */
function confirm(title, msg) {
  return new Promise(resolve => {
    const ov = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    ov.classList.add('open');
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    const close = (result) => {
      ov.classList.remove('open');
      resolve(result);
    };
    yes.onclick = () => close(true);
    no.onclick = () => close(false);
  });
}

/* -------------------------- MODALS ------------------------------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    preventBodyScroll(true);
  }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
  const anyOpen = document.querySelector('.modal-overlay.open, .confirm-overlay.open, .welcome-overlay.open');
  if (!anyOpen) {
    preventBodyScroll(false);
  }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(modal => {
      modal.classList.remove('open');
    });
    const confirmOverlay = document.getElementById('confirmOverlay');
    if (confirmOverlay && confirmOverlay.classList.contains('open')) {
      confirmOverlay.classList.remove('open');
    }
    closeDrawer();
    preventBodyScroll(false);
  }
});

// Add after your existing initialization code
document.addEventListener('DOMContentLoaded', () => {
  initializeAIAssistant();
  addAIFloatingButton();
  enhanceTouchFeedback();
  initDrawerSwipe();
  fixNumberInputs();
  updateSafeAreas();

  const originalRenderDashboard = renderDashboard;
  window.renderDashboard = function () {
    originalRenderDashboard();
    setTimeout(addAIToDashboard, 100);
  };

  if (document.getElementById('dashboard-content')?.children.length > 0) {
    addAIToDashboard();
  }
});

/* ---------------------------- THEME ------------------------------ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  const themeIcon = document.getElementById('themeBtn')?.querySelector('i');
  if (themeIcon) {
    themeIcon.className = S.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
}
applyTheme();
document.getElementById('themeBtn')?.addEventListener('click', () => {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  save();
  destroyAllCharts();
  renderAll();
});

/* ----------------- CHARTS DESTRUCTION HELPERS ----------------- */
let spendChart = null, allocChart = null;
let analyticsTrendChart = null, analyticsCategoryChart = null, analyticsRollbackChart = null, analyticsBudgetChart = null;

function destroyAllCharts() {
  if (spendChart) { spendChart.destroy(); spendChart = null; }
  if (allocChart) { allocChart.destroy(); allocChart = null; }
  if (analyticsTrendChart) { analyticsTrendChart.destroy(); analyticsTrendChart = null; }
  if (analyticsCategoryChart) { analyticsCategoryChart.destroy(); analyticsCategoryChart = null; }
  if (analyticsRollbackChart) { analyticsRollbackChart.destroy(); analyticsRollbackChart = null; }
  if (analyticsBudgetChart) { analyticsBudgetChart.destroy(); analyticsBudgetChart = null; }
}

/* ======================== RECURRING TRANSACTIONS ======================== */

function calculateNextDueDate(rule) {
  const currentDue = new Date(rule.nextDueDate);
  let next = new Date(currentDue);

  switch (rule.frequency) {
    case 'weekly':
      next.setDate(currentDue.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(currentDue.getDate() + 14);
      break;
    case 'monthly':
      const originalDay = currentDue.getDate();
      next.setMonth(currentDue.getMonth() + 1);
      if (next.getDate() !== originalDay) {
        next.setDate(0);
      }
      break;
    case 'yearly':
      next.setFullYear(currentDue.getFullYear() + 1);
      break;
    default:
      return rule.nextDueDate;
  }

  return next.toISOString().split('T')[0];
}

function getPeriodStartDate(periodStr) {
  return new Date(periodStr);
}

function getPeriodEndDate(periodStr) {
  const date = new Date(periodStr);
  let endDate;

  switch (S.payPeriod) {
    case 'weekly':
      endDate = new Date(date);
      endDate.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      endDate = new Date(date);
      endDate.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      endDate = new Date(date);
      endDate.setMonth(date.getMonth() + 1);
      break;
    case 'semimonthly':
      endDate = new Date(date);
      endDate.setDate(date.getDate() + 15);
      break;
    default:
      endDate = new Date(date);
      endDate.setDate(date.getDate() + 14);
  }

  return endDate;
}

function getUpcomingBills() {
  const periodStart = getPeriodStartDate(S.currentPeriod);
  const periodEnd = getPeriodEndDate(S.currentPeriod);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return S.recurring.filter(rule => {
    if (!rule.active) return false;
    const dueDate = new Date(rule.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= periodStart && dueDate <= periodEnd && dueDate >= today;
  });
}

function autoProcessRecurring() {
  if (!S.recurring) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr_ = today.toISOString().split('T')[0];
  let anyAdded = false;

  for (let rule of S.recurring) {
    if (!rule.active) continue;

    const dueDate = new Date(rule.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      const endDate = rule.endDate ? new Date(rule.endDate) : null;
      if (endDate && dueDate > endDate) continue;

      const cat = S.categories.find(c => c.id === rule.categoryId);
      if (!cat) continue;

      const entry = {
        id: uid(),
        categoryId: rule.categoryId,
        categoryName: cat.name,
        note: `[Auto] ${rule.name}`,
        amount: rule.amount,
        period: S.currentPeriod,
        date: new Date().toISOString()
      };

      S.spending.push(entry);
      S.history.push({ ...entry });

      rule.nextDueDate = calculateNextDueDate(rule);
      rule.lastProcessed = todayStr_;
      anyAdded = true;
    }
  }

  if (anyAdded) {
    calcAllocations();
    save();
    renderAll();
    toast('Recurring bills processed');
  }
}

function addRecurringTransaction(name, amount, categoryId, frequency, startDate, endDate, active = true) {
  if (!name || name.trim() === '') {
    toast('Please enter a transaction name', 'error');
    return false;
  }
  if (isNaN(amount) || amount <= 0) {
    toast('Please enter a valid amount greater than 0', 'error');
    return false;
  }
  if (!categoryId) {
    toast('Please select a category', 'error');
    return false;
  }

  const nextDueDate = startDate || todayStr();

  S.recurring.push({
    id: uid(),
    name: name.trim(),
    amount: amount,
    categoryId: categoryId,
    frequency: frequency,
    startDate: startDate || todayStr(),
    endDate: endDate || null,
    nextDueDate: nextDueDate,
    active: active,
    createdAt: new Date().toISOString()
  });

  save();
  renderAll();
  toast('Recurring transaction added');
  return true;
}

function updateRecurringTransaction(id, updates) {
  const index = S.recurring.findIndex(r => r.id === id);
  if (index === -1) return false;

  S.recurring[index] = { ...S.recurring[index], ...updates };
  save();
  renderAll();
  toast('Recurring transaction updated');
  return true;
}

function deleteRecurringTransaction(id) {
  S.recurring = S.recurring.filter(r => r.id !== id);
  save();
  renderAll();
  toast('Recurring transaction deleted');
}

function openRecurringModal(editId = null) {
  const modal = document.getElementById('recurringModal');
  const title = document.getElementById('recurringModalTitle');
  const editIdInput = document.getElementById('recurringEditId');
  const nameInput = document.getElementById('recurringName');
  const amountInput = document.getElementById('recurringAmount');
  const categorySelect = document.getElementById('recurringCategory');
  const frequencySelect = document.getElementById('recurringFrequency');
  const startDateInput = document.getElementById('recurringStartDate');
  const endDateInput = document.getElementById('recurringEndDate');
  const activeCheckbox = document.getElementById('recurringActive');

  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select category...</option>' +
      S.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (editId) {
    const rule = S.recurring.find(r => r.id === editId);
    if (rule) {
      if (title) title.textContent = 'Edit Recurring Transaction';
      if (editIdInput) editIdInput.value = rule.id;
      if (nameInput) nameInput.value = rule.name;
      if (amountInput) amountInput.value = rule.amount;
      if (categorySelect) categorySelect.value = rule.categoryId;
      if (frequencySelect) frequencySelect.value = rule.frequency;
      if (startDateInput) startDateInput.value = rule.startDate;
      if (endDateInput) endDateInput.value = rule.endDate || '';
      if (activeCheckbox) activeCheckbox.checked = rule.active;
    } else {
      toast('Transaction not found', 'error');
      return;
    }
  } else {
    if (title) title.textContent = 'Add Recurring Transaction';
    if (editIdInput) editIdInput.value = '';
    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (frequencySelect) frequencySelect.value = 'monthly';
    if (startDateInput) startDateInput.value = todayStr();
    if (endDateInput) endDateInput.value = '';
    if (activeCheckbox) activeCheckbox.checked = true;
  }

  if (amountInput) {
    amountInput._thousandSepAttached = false;
    applyThousandSeparator(amountInput);
  }

  openModal('recurringModal');
}

function renderRecurring() {
  const el = document.getElementById('recurring-content');
  if (!el) return;

  const upcomingBills = getUpcomingBills();
  const totalUpcomingAmount = upcomingBills.reduce((sum, b) => addMoney(sum, b.amount), 0);

  el.innerHTML = `
    <div style="margin-bottom: 16px;">
      <button class="btn btn-primary" id="addRecurringBtn">
        <i class="fas fa-plus"></i> Add Recurring Transaction
      </button>
    </div>

    ${upcomingBills.length > 0 ? `
    <div class="card" style="border-left: 3px solid var(--green); margin-bottom: 16px;">
      <div class="card-title"><i class="fas fa-calendar-week"></i> Upcoming This Period</div>
      <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${fmt(totalUpcomingAmount)}</div>
      <div style="font-size: 12px; color: var(--text2);">Scheduled bills for this pay period</div>
    </div>
    ` : ''}

    <div class="section-hd">
      <h2>All Recurring Transactions</h2>
    </div>

    ${S.recurring.length === 0 ? `
      <div class="empty">
        <div class="empty-icon"><i class="fas fa-clock"></i></div>
        <div class="empty-text">No recurring transactions yet. Add one to automate bill payments.</div>
      </div>
    ` : S.recurring.map(r => {
    const cat = S.categories.find(c => c.id === r.categoryId);
    const frequencyLabels = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return `
        <div class="recurring-item ${!r.active ? 'inactive' : ''}">
          <div class="recurring-header">
            <div class="recurring-name">
              <i class="fas fa-repeat"></i> ${escapeHtml(r.name)}
            </div>
            <div class="recurring-header-right">
              <div class="recurring-amount">${fmt(r.amount)}</div>
              <label class="toggle-switch">
                <input type="checkbox" class="recurring-toggle" data-id="${r.id}" ${r.active ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="recurring-details">
            <span><i class="fas fa-tag"></i> ${cat ? cat.name : 'Unknown'}</span>
            <span><i class="fas fa-calendar-alt"></i> ${frequencyLabels[r.frequency] || r.frequency}</span>
          </div>
          <div class="recurring-details" style="margin-top: 4px;">
            <span><i class="fas fa-play-circle"></i> Next: ${fmtDate(r.nextDueDate)}</span>
            ${r.endDate ? `<span><i class="fas fa-stop-circle"></i> Until: ${fmtDate(r.endDate)}</span>` : ''}
          </div>
          <div class="recurring-actions">
            <button class="btn btn-ghost btn-sm recurring-edit-btn" data-id="${r.id}"><i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm recurring-delete-btn" data-id="${r.id}"><i class="fas fa-trash-alt"></i> Delete</button>
          </div>
        </div>
      `;
  }).join('')}
  `;

  el.querySelector('#addRecurringBtn')?.addEventListener('click', () => openRecurringModal());

  el.querySelectorAll('.recurring-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openRecurringModal(Number(btn.dataset.id)));
  });

  el.querySelectorAll('.recurring-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirm('Delete Recurring', 'Remove this recurring transaction?');
      if (ok) deleteRecurringTransaction(Number(btn.dataset.id));
    });
  });

  el.querySelectorAll('.recurring-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const id = Number(toggle.dataset.id);
      const rule = S.recurring.find(r => r.id === id);
      if (rule) {
        rule.active = toggle.checked;
        save();
        renderAll();
        toast(rule.active ? 'Transaction activated' : 'Transaction deactivated');
      }
    });
  });
}

document.getElementById('recurringSubmit')?.addEventListener('click', () => {
  const editId = document.getElementById('recurringEditId')?.value;
  let name = document.getElementById('recurringName')?.value.trim();
  let amountRaw = document.getElementById('recurringAmount')?.value;
  const categoryId = Number(document.getElementById('recurringCategory')?.value);
  const frequency = document.getElementById('recurringFrequency')?.value;
  const startDate = document.getElementById('recurringStartDate')?.value;
  const endDate = document.getElementById('recurringEndDate')?.value || null;
  const active = document.getElementById('recurringActive')?.checked || false;

  const amountParsed = parseFormattedNumber(amountRaw);
  const amount = parseFloat(amountParsed);

  if (!name || name === '') {
    toast('Please enter a transaction name', 'error');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    toast('Please enter a valid amount greater than 0', 'error');
    return;
  }
  if (!categoryId || categoryId === 0) {
    toast('Please select a category', 'error');
    return;
  }

  if (editId) {
    const updates = {
      name, amount, categoryId, frequency,
      startDate: startDate || todayStr(),
      endDate: endDate,
      active
    };
    if (startDate && startDate !== S.recurring.find(r => r.id === Number(editId))?.startDate) {
      updates.nextDueDate = startDate;
    }
    updateRecurringTransaction(Number(editId), updates);
  } else {
    addRecurringTransaction(name, amount, categoryId, frequency, startDate || todayStr(), endDate, active);
  }

  closeModal('recurringModal');
  const editIdInput = document.getElementById('recurringEditId');
  if (editIdInput) editIdInput.value = '';
});

document.getElementById('recurringCancel')?.addEventListener('click', () => closeModal('recurringModal'));

/* ------------------------- NEW PERIOD ---------------------------- */
document.getElementById('newPeriodBtn')?.addEventListener('click', async () => {
  const ta = totalAllocated();
  const ts = totalSpent();
  const rb = Math.max(0, subtractMoney(ta, ts));
  const ok = await confirm('Start New Pay Period',
    fmt(rb) + ' unspent will move to your Rollback Pool. Paycheck and spending reset. Your categories are preserved.');
  if (!ok) return;

  savePeriodAnalytics();

  if (rb > 0) {
    S.rollbackPool = addMoney(S.rollbackPool, rb);
    S.rollbackHistory.unshift({
      id: uid(),
      date: new Date().toISOString(),
      period: S.currentPeriod,
      amount: rb,
      note: `Rollback from ${S.currentPeriod.substring(5).replace('-', '/')}`
    });
  }

  const newPeriod = todayStr();
  S.currentPeriod = newPeriod;
  if (!S.periods.includes(newPeriod)) S.periods.unshift(newPeriod);

  S.paycheckAmount = 0;
  S.externalFunds = S.externalFunds.filter(ef => ef.period !== S.currentPeriod);
  S.spending = [];

  S.categories.forEach(c => {
    c.allocated = 0;
    c.spent = 0;
    c.remaining = 0;
  });

  calcAllocations();
  autoProcessRecurring();
  save();
  renderAll();
  toast('New pay period started! Enter your paycheck amount.');
});

/* ------------------------ SAVE ANALYTICS ------------------------- */
function savePeriodAnalytics() {
  const catSpend = {};
  S.categories.forEach(c => {
    catSpend[c.name] = S.spending
      .filter(s => s.categoryId === c.id && s.period === S.currentPeriod)
      .reduce((sm, e) => addMoney(sm, e.amount), 0);
  });
  S.analyticsHistory.unshift({
    period: S.currentPeriod,
    date: new Date().toISOString(),
    totalAllocated: totalAllocated(),
    totalSpent: totalSpent(),
    rollbackAmount: Math.max(0, subtractMoney(totalAllocated(), totalSpent())),
    categorySpending: catSpend,
  });
  if (S.analyticsHistory.length > 24) S.analyticsHistory = S.analyticsHistory.slice(0, 24);
}

/* ----------------------------- SAVE ------------------------------ */
function save() {
  saveState(S);
  updateLastSaved();
  clearDirty();
}

/* -------------------------- RENDER ------------------------------- */
function renderAll() {
  const active = document.querySelector('.drawer-item.active')?.dataset.view || 'dashboard';
  switch (active) {
    case 'dashboard': renderDashboard(); break;
    case 'categories': renderCategories(); break;
    case 'spend': renderSpend(); break;
    case 'history': renderHistory(); break;
    case 'recurring': renderRecurring(); break;
    case 'savings': renderSavings(); break;
    case 'analytics': renderAnalytics(); break;
    case 'settings': renderSettings(); break;
  }
  restoreScrollPosition(active);
}

/* ═══════════════════════════════════════════════════════════════════
   ALERT/NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

function generateAlertsAndAchievements() {
  let negativeAlerts = [];
  let positiveMilestones = [];

  if (S.categories) {
    S.categories.forEach(c => {
      const pctUsed = c.allocated > 0 ? (c.spent / c.allocated) * 100 : 0;

      const isPositiveCategory = (c.name.toLowerCase().includes('saving') ||
        c.name.toLowerCase().includes('tuition') ||
        c.name.toLowerCase().includes('invest') ||
        c.name.toLowerCase().includes('emergency') ||
        c.name.toLowerCase().includes('debt'));

      if (isPositiveCategory) {
        if (pctUsed >= 99.5 && pctUsed <= 100 && c.allocated > 0) {
          positiveMilestones.push({
            message: `Achievement: ${c.name} goal REACHED! Great job saving!`,
            icon: 'fa-trophy'
          });
        } else if (pctUsed >= 80 && pctUsed < 99.5 && c.allocated > 0 && c.spent > 0) {
          positiveMilestones.push({
            message: `Milestone: ${c.name} is at ${Math.floor(pctUsed)}% - Excellent progress!`,
            icon: 'fa-chart-line'
          });
        }
      } else {
        if (pctUsed >= 90 && c.allocated > 0 && pctUsed <= 100) {
          negativeAlerts.push({
            message: `Warning: ${c.name} is at ${Math.floor(pctUsed)}% — only ${fmt(c.remaining)} left`,
            icon: 'fa-exclamation-circle'
          });
        } else if (pctUsed > 100) {
          negativeAlerts.push({
            message: `Alert: ${c.name} is OVER budget by ${fmt(Math.abs(c.remaining))}!`,
            icon: 'fa-ban'
          });
        }
      }
    });
  }

  const totalAlloc = totalAllocated();
  const totalSpentAmt = totalSpent();
  if (totalAlloc > 0 && totalSpentAmt < totalAlloc && totalSpentAmt < totalAlloc * 0.9) {
    positiveMilestones.push({
      message: `Great job! You've only spent ${fmt(totalSpentAmt)} of ${fmt(totalAlloc)} allocated. Keep it up!`,
      icon: 'fa-smile-wink'
    });
  }

  if (S.savings) {
    S.savings.forEach(g => {
      const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      if (pct >= 100) {
        positiveMilestones.push({
          message: `Achievement: "${g.name}" savings goal COMPLETED! You're crushing it!`,
          icon: 'fa-check-circle'
        });
      } else if (pct >= 75) {
        positiveMilestones.push({
          message: `Milestone: "${g.name}" is at ${Math.floor(pct)}% - Almost there!`,
          icon: 'fa-rocket'
        });
      } else if (pct >= 50 && pct < 75 && g.saved > 0) {
        positiveMilestones.push({
          message: `Good progress: "${g.name}" is halfway to ${fmt(g.target)}!`,
          icon: 'fa-piggy-bank'
        });
      }
    });
  }

  if (S.rollbackPool > 1000) {
    positiveMilestones.push({
      message: `Excellent savings! Your Rollback Pool has grown to ${fmt(S.rollbackPool)}.`,
      icon: 'fa-piggy-bank'
    });
  } else if (S.rollbackPool > 500 && S.rollbackPool <= 1000) {
    positiveMilestones.push({
      message: `Milestone: Rollback Pool reached ${fmt(S.rollbackPool)} - building safety net!`,
      icon: 'fa-chart-simple'
    });
  }

  const recentExtFunds = S.externalFunds.filter(ef => ef.period === S.currentPeriod);
  if (recentExtFunds.length > 0 && S.paycheckAmount > 0) {
    const totalExt = recentExtFunds.reduce((sum, ef) => addMoney(sum, ef.amount), 0);
    if (totalExt > 0) {
      positiveMilestones.unshift({
        message: `+${fmt(totalExt)} added from external sources this period!`,
        icon: 'fa-gift'
      });
    }
  }

  if (S.categories) {
    const debtCategories = S.categories.filter(c =>
      c.name.toLowerCase().includes('debt') ||
      c.name.toLowerCase().includes('loan') ||
      c.name.toLowerCase().includes('credit')
    );
    debtCategories.forEach(c => {
      if (c.spent > 0 && c.allocated > 0 && c.spent <= c.allocated * 0.8) {
        positiveMilestones.push({
          message: `Great progress on ${c.name}! You're staying under budget on debt reduction.`,
          icon: 'fa-arrow-trend-down'
        });
      }
    });
  }

  return { negativeAlerts, positiveMilestones };
}

/* ══════════════════════════ DASHBOARD ══════════════════════════ */

function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  if (!el) return;

  const bal = currentBalance();
  const ts = totalSpent();
  const ta = totalAllocated();
  const tp = totalPct();
  const rem = subtractMoney(S.paycheckAmount, ta);

  const upcomingBills = getUpcomingBills();
  const totalUpcomingAmount = upcomingBills.reduce((sum, b) => addMoney(sum, b.amount), 0);

  const { negativeAlerts, positiveMilestones } = generateAlertsAndAchievements();

  el.innerHTML = `
    <div class="balance-hero">
      <div class="balance-label">Current Balance</div>
      <div class="balance-amount ${bal < 0 ? 'text-red' : ''}">${fmt(bal)}</div>
      <div class="balance-row">
        <div class="balance-mini">
          <div class="balance-mini-label">Rollback Pool</div>
          <div class="balance-mini-value">${fmt(S.rollbackPool)}</div>
        </div>
        <div class="balance-mini">
          <div class="balance-mini-label">Paycheck</div>
          <div class="balance-mini-value">${fmt(S.paycheckAmount)}</div>
        </div>
        <div class="balance-mini">
          <div class="balance-mini-label">Period</div>
          <div class="balance-mini-value" style="font-size:13px">${S.currentPeriod.substring(5).replace('-', '/')}</div>
        </div>
      </div>
    </div>

    ${upcomingBills.length > 0 ? `
    <div class="card" style="border-left: 3px solid var(--accent2);">
      <div class="card-title"><i class="fas fa-calendar-week"></i> Upcoming Bills</div>
      <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">${fmt(totalUpcomingAmount)}</div>
      <div style="font-size: 13px; color: var(--text2);">Scheduled for this period</div>
      <div class="divider" style="margin: 12px 0;"></div>
      ${upcomingBills.slice(0, 3).map(b => `
        <div class="flex-between" style="margin-bottom: 8px;">
          <span><i class="fas fa-receipt"></i> ${escapeHtml(b.name)}</span>
          <span>${fmt(b.amount)}</span>
        </div>
      `).join('')}
      ${upcomingBills.length > 3 ? `<div class="fs12" style="color: var(--text3); margin-top: 8px;">+ ${upcomingBills.length - 3} more...</div>` : ''}
    </div>
    ` : ''}

    ${negativeAlerts.length > 0 ? negativeAlerts.map(a => `
      <div class="alert-banner"><i class="fas ${a.icon}"></i> ${a.message}</div>
    `).join('') : ''}

    ${positiveMilestones.length > 0 ? positiveMilestones.map(p => `
      <div class="success-banner"><i class="fas ${p.icon}"></i> ${p.message}</div>
    `).join('') : ''}

    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
        <div class="stat-value">${fmt(ta)}</div>
        <div class="stat-label">Total Allocated (${tp.toFixed(1)}%)</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon"><i class="fas fa-receipt"></i></div>
        <div class="stat-value">${fmt(ts)}</div>
        <div class="stat-label">Total Spent</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon"><i class="fas fa-box"></i></div>
        <div class="stat-value">${fmt(rem)}</div>
        <div class="stat-label">Unallocated</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon"><i class="fas fa-piggy-bank"></i></div>
        <div class="stat-value">${fmt(S.rollbackPool)}</div>
        <div class="stat-label">Rollback Pool</div>
      </div>
    </div>

    <button class="btn btn-primary mb8" id="openPaycheckModal">
      ${S.paycheckAmount > 0 ? '<i class="fas fa-edit"></i> Edit Paycheck' : '<i class="fas fa-dollar-sign"></i> Set Paycheck Amount'}
    </button>

    <div class="section-hd">
      <h2>Categories</h2>
      <a id="dash-goto-cat">See all</a>
    </div>
    ${!S.categories || S.categories.length === 0 ? `<div class="empty"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><div class="empty-text">No categories yet. Add your first category to start budgeting</div><button class="btn btn-primary btn-sm" id="dash-add-cat">Add Category</button></div>` :
      S.categories.slice(0, 5).map(c => catProgressCard(c)).join('')
    }

    ${S.spending && S.spending.filter(s => s.period === S.currentPeriod).length > 0 ? `
    <div class="section-hd mt16"><h2>Spending Breakdown</h2></div>
    <div class="chart-wrap">
      <div class="chart-title">Current Period · ${fmt(ts)} spent</div>
      <canvas id="spendChart" height="200"></canvas>
    </div>
    <div class="chart-wrap">
      <div class="chart-title">Budget vs Actual</div>
      <canvas id="allocChart" height="180"></canvas>
    </div>
    ` : ''}

    ${S.savings && S.savings.length > 0 ? `
    <div class="section-hd mt16">
      <h2>Savings Goals</h2>
      <a id="dash-goto-savings">See all</a>
    </div>
    ${S.savings.slice(0, 3).map(g => goalCard(g)).join('')}
    ` : ''}

    <div class="section-hd mt16">
      <h2>Recent Spending</h2>
      <a id="dash-goto-hist">See all</a>
    </div>
    ${!S.spending || S.spending.filter(s => s.period === S.currentPeriod).length === 0
      ? `<div class="empty"><div class="empty-icon"><i class="fas fa-receipt"></i></div><div class="empty-text">No spending tracked yet</div></div>`
      : S.spending.filter(s => s.period === S.currentPeriod).slice(-5).reverse().map(e => spendItemHtml(e)).join('')
    }
  `;

  el.querySelector('#openPaycheckModal')?.addEventListener('click', openPaycheckModal);
  el.querySelector('#dash-goto-cat')?.addEventListener('click', () => switchView('categories'));
  el.querySelector('#dash-goto-hist')?.addEventListener('click', () => switchView('history'));
  el.querySelector('#dash-goto-savings')?.addEventListener('click', () => switchView('savings'));
  el.querySelector('#dash-add-cat')?.addEventListener('click', () => openCatModal());

  el.querySelectorAll('.spend-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirm('Delete Spending', 'Remove this spending entry?');
      if (ok) deleteSpending(Number(btn.dataset.id));
    });
  });

  el.querySelectorAll('.spend-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditSpendModal(Number(btn.dataset.id));
    });
  });

  setTimeout(() => drawCharts(), 50);
}

function catProgressCard(cat) {
  const pctUsed = cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0;
  const color = pctUsed >= 90 ? 'var(--red)' : pctUsed >= 60 ? 'var(--amber)' : 'var(--green)';
  return `
    <div class="cat-item" onclick="openSpendModalWithCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')">
      <div class="cat-header">
        <div class="cat-name">${catEmoji(cat.name)} ${cat.name}</div>
        <div class="cat-badge">${cat.pct}%</div>
      </div>
      <div class="cat-amounts">
        <div class="cat-amount-block">
          <div class="cat-amount-label">Allocated</div>
          <div class="cat-amount-value">${fmt(cat.allocated)}</div>
        </div>
        <div class="cat-amount-block">
          <div class="cat-amount-label">Spent</div>
          <div class="cat-amount-value text-red">${fmt(cat.spent)}</div>
        </div>
        <div class="cat-amount-block">
          <div class="cat-amount-label">${cat.remaining < 0 ? 'Overspent' : 'Left'}</div>
          <div class="cat-amount-value" style="color:${cat.remaining < 0 ? 'var(--red)' : 'var(--green)'}">${cat.remaining < 0 ? '-' + fmt(Math.abs(cat.remaining)) : fmt(cat.remaining)}</div>
        </div>
      </div>
      <div class="cat-bar"><div class="cat-bar-fill" style="width:${pctUsed}%;background:${color}"></div></div>
    </div>`;
}

function goalCard(g) {
  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
  let daysLeft = '';
  if (g.deadline) {
    const days = Math.ceil((new Date(g.deadline) - Date.now()) / 86400000);
    daysLeft = days > 0 ? `${days} days left` : 'Deadline passed';
  }
  return `
    <div class="goal-item">
      <div class="goal-header">
        <div>
          <div class="goal-name">${g.name}</div>
          <div class="goal-target">${daysLeft}</div>
        </div>
        <div class="goal-pct">${pct.toFixed(0)}%</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div>
      <div class="goal-amounts">
        <span>${fmt(g.saved)} saved</span>
        <span>${fmt(g.target)} goal</span>
      </div>
    </div>`;
}

function spendItemHtml(e) {
  const cat = S.categories.find(c => c.id === e.categoryId);
  const displayIcon = cat ? (catEmoji(cat?.name || '') || '<i class="fas fa-credit-card"></i>') : '<i class="fas fa-credit-card"></i>';
  return `
    <div class="spend-item">
      <div class="spend-emoji">${displayIcon}</div>
      <div class="spend-info">
        <div class="spend-name">${escapeHtml(e.note || e.categoryName)}</div>
        <div class="spend-meta">${e.categoryName} · ${fmtDate(e.date)}</div>
      </div>
      <div class="spend-amount ${e.amount > 0 ? 'negative' : ''}">-${fmt(e.amount)}</div>
      <div class="spend-actions">
        <button class="spend-edit" data-id="${e.id}" aria-label="Edit"><i class="fas fa-pen"></i></button>
        <button class="spend-delete" data-id="${e.id}" aria-label="Delete"><i class="fas fa-times"></i></button>
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function catEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('rent') || n.includes('hous')) return '<i class="fas fa-home"></i>';
  if (n.includes('grocer') || n.includes('food')) return '<i class="fas fa-shopping-basket"></i>';
  if (n.includes('transport') || n.includes('car')) return '<i class="fas fa-car"></i>';
  if (n.includes('saving')) return '<i class="fas fa-piggy-bank"></i>';
  if (n.includes('fun') || n.includes('entertain')) return '<i class="fas fa-gamepad"></i>';
  if (n.includes('util')) return '<i class="fas fa-bolt"></i>';
  if (n.includes('health') || n.includes('med')) return '<i class="fas fa-heartbeat"></i>';
  if (n.includes('cloth')) return '<i class="fas fa-tshirt"></i>';
  if (n.includes('tuition')) return '<i class="fas fa-graduation-cap"></i>';
  if (n.includes('dine') || n.includes('restaur')) return '<i class="fas fa-utensils"></i>';
  if (n.includes('debt') || n.includes('loan')) return '<i class="fas fa-hand-holding-usd"></i>';
  if (n.includes('invest')) return '<i class="fas fa-chart-line"></i>';
  return '<i class="fas fa-credit-card"></i>';
}

function drawCharts() {
  destroyAllCharts();

  const currentPeriodSpending = S.spending ? S.spending.filter(s => s.period === S.currentPeriod) : [];
  const spendCtx = document.getElementById('spendChart');
  if (spendCtx && currentPeriodSpending.length > 0) {
    const cats = [...new Set(currentPeriodSpending.map(s => s.categoryName))];
    const data = cats.map(c => currentPeriodSpending.filter(s => s.categoryName === c).reduce((sm, e) => addMoney(sm, e.amount), 0));
    const palette = ['#7c6dfa', '#22d3ee', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#06d6a0', '#ef476f', '#118ab2', '#fd7e14'];
    spendChart = new Chart(spendCtx, {
      type: 'doughnut',
      data: { labels: cats, datasets: [{ data, backgroundColor: palette, borderWidth: 0, hoverOffset: 10 }] },
      options: {
        responsive: true, cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim(), boxWidth: 12, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
        }
      }
    });
  }

  const allocCtx = document.getElementById('allocChart');
  if (allocCtx && S.categories && S.categories.length > 0) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim();
    allocChart = new Chart(allocCtx, {
      type: 'bar',
      data: {
        labels: S.categories.map(c => c.name),
        datasets: [
          { label: 'Allocated', data: S.categories.map(c => c.allocated), backgroundColor: 'rgba(124,109,250,.7)', borderRadius: 6 },
          { label: 'Spent', data: S.categories.map(c => c.spent), backgroundColor: 'rgba(248,113,113,.7)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: textColor, callback: v => '$' + v, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } }
        }
      }
    });
  }
}

/* ══════════════════════════ SAVINGS PANEL ══════════════════════════ */

function renderSavings() {
  const el = document.getElementById('savings-content');
  if (!el) return;

  const totalSaved = S.savings.reduce((sum, g) => addMoney(sum, g.saved), 0);
  const totalTarget = S.savings.reduce((sum, g) => addMoney(sum, g.target), 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  el.innerHTML = `
    <div class="section-hd">
      <h2><i class="fas fa-piggy-bank"></i> Savings Goals</h2>
      <a id="savingsAddGoalBtn">+ Add Goal</a>
    </div>

    <div class="savings-stats">
      <div class="stat-card green">
        <div class="stat-icon"><i class="fas fa-coins"></i></div>
        <div class="stat-value">${fmt(totalSaved)}</div>
        <div class="stat-label">Total Saved</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon"><i class="fas fa-bullseye"></i></div>
        <div class="stat-value">${fmt(totalTarget)}</div>
        <div class="stat-label">Total Goal</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Overall Progress</div>
      <div class="flex-between mb8">
        <span>${fmt(totalSaved)} of ${fmt(totalTarget)}</span>
        <span class="fw7">${overallPct.toFixed(0)}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${Math.min(100, overallPct)}%;background:var(--accent2)"></div></div>
    </div>

    <div class="section-hd">
      <h2>All Goals</h2>
    </div>
    ${S.savings.length === 0 ? `
      <div class="empty">
        <div class="empty-icon"><i class="fas fa-piggy-bank"></i></div>
        <div class="empty-text">No savings goals yet. Add your first goal!</div>
        <button class="btn btn-primary btn-sm" id="emptyAddGoalBtn">Add Goal</button>
      </div>
    ` : S.savings.map(g => fullSavingsGoalCard(g)).join('')}
  `;

  el.querySelector('#savingsAddGoalBtn')?.addEventListener('click', openGoalModal);
  el.querySelector('#emptyAddGoalBtn')?.addEventListener('click', openGoalModal);
  el.querySelectorAll('.savings-contrib-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openContributeModal(Number(btn.dataset.id));
    });
  });
  el.querySelectorAll('.savings-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirm('Delete Goal', 'Remove this savings goal?');
      if (ok) {
        S.savings = S.savings.filter(g => g.id !== Number(btn.dataset.id));
        save();
        renderAll();
        toast('Goal deleted');
      }
    });
  });
}

function fullSavingsGoalCard(g) {
  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
  let daysLeft = '';
  let deadlineClass = '';
  if (g.deadline) {
    const days = Math.ceil((new Date(g.deadline) - Date.now()) / 86400000);
    daysLeft = days > 0 ? `${days} days left` : 'Deadline passed';
    deadlineClass = days <= 0 ? 'text-red' : '';
  }
  return `
    <div class="goal-card">
      <div class="goal-card-header">
        <div>
          <div class="goal-card-name"><i class="fas fa-bullseye"></i> ${escapeHtml(g.name)}</div>
          <div class="goal-card-target ${deadlineClass}">${daysLeft || 'No deadline'}</div>
        </div>
        <div class="goal-pct">${pct.toFixed(0)}%</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:var(--accent2)"></div></div>
      <div class="goal-card-amounts">
        <span class="goal-card-saved">${fmt(g.saved)} saved</span>
        <span class="goal-card-remaining">${fmt(subtractMoney(g.target, g.saved))} to go</span>
      </div>
      <div class="goal-card-actions">
        <button class="btn btn-green btn-sm savings-contrib-btn" data-id="${g.id}"><i class="fas fa-plus-circle"></i> Contribute</button>
        <button class="btn btn-danger btn-sm savings-delete-btn" data-id="${g.id}"><i class="fas fa-trash-alt"></i> Delete</button>
      </div>
    </div>`;
}

/* ══════════════════════════ CATEGORIES ══════════════════════════ */
let categoriesRenderFunc;
function renderCategories() {
  const el = document.getElementById('categories-content');
  if (!el) return;

  const tp = totalPct();

  el.innerHTML = `
    <div class="period-pill"><i class="far fa-calendar-alt"></i>${S.currentPeriod.substring(5).replace('-', '/')} · ${S.payPeriod}</div>

    <div class="card">
      <div class="card-title">Allocation Summary</div>
      <div class="flex-between mb8">
        <span class="fs14">Allocated</span>
        <span class="fs14 fw7">${tp.toFixed(1)}% of 100%</span>
      </div>
      <div class="progress">
        <div class="progress-fill" style="width:${Math.min(100, tp)}%;background:${tp > 100 ? 'var(--red)' : tp === 100 ? 'var(--green)' : 'var(--accent)'}"></div>
      </div>
      <div class="flex-between mt16" style="gap:8px">
        <button class="btn btn-green btn-sm" id="distributeBtn"><i class="fas fa-arrows-alt-h"></i> Distribute Rest</button>
        <button class="btn btn-danger btn-sm" id="clearAllocBtn"><i class="fas fa-trash-alt"></i> Clear All</button>
      </div>
    </div>

    <div class="search-card">
      <div class="search-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" class="search-input" id="categorySearch" placeholder="Search categories..." />
        <button class="search-clear" id="clearSearchBtn"><i class="fas fa-times"></i></button>
      </div>
    </div>

    <div class="section-hd">
      <h2>Your Categories</h2>
      <a id="addCatBtn">+ Add</a>
    </div>
    <div id="categoriesList">
    ${!S.categories || S.categories.length === 0
      ? `<div class="empty"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><div class="empty-text">No categories yet. Add your first category to start budgeting</div><button class="btn btn-primary btn-sm" id="emptyAddCatBtn">Add Category</button></div>`
      : S.categories.map((c, i) => fullCatCard(c, i)).join('')
    }
    </div>
  `;

  const searchInput = el.querySelector('#categorySearch');
  const clearBtn = el.querySelector('#clearSearchBtn');

  if (searchInput) {
    const filterCategories = () => {
      const searchTerm = searchInput.value.toLowerCase();
      const catItems = el.querySelectorAll('.cat-item');
      let visibleCount = 0;
      catItems.forEach(item => {
        const catName = item.querySelector('.cat-name')?.textContent.toLowerCase() || '';
        if (catName.includes(searchTerm)) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      const noResultsDiv = el.querySelector('#noSearchResults');
      if (visibleCount === 0 && catItems.length > 0) {
        if (!noResultsDiv) {
          const container = el.querySelector('#categoriesList');
          const noResults = document.createElement('div');
          noResults.className = 'empty';
          noResults.innerHTML = '<div class="empty-icon"><i class="fas fa-search"></i></div><div class="empty-text">No matching categories found</div>';
          noResults.id = 'noSearchResults';
          if (container) container.appendChild(noResults);
        }
      } else if (noResultsDiv) {
        noResultsDiv.remove();
      }
    };

    searchInput.addEventListener('input', filterCategories);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterCategories();
        searchInput.focus();
      });
    }
  }

  el.querySelector('#addCatBtn')?.addEventListener('click', openCatModal);
  el.querySelector('#emptyAddCatBtn')?.addEventListener('click', openCatModal);
  el.querySelector('#distributeBtn')?.addEventListener('click', () => distributeRemaining());
  el.querySelector('#clearAllocBtn')?.addEventListener('click', () => clearAllocations());

  el.querySelectorAll('.cat-del-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(Number(btn.dataset.id)));
  });
}

function fullCatCard(cat, index) {
  const pctUsed = cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0;
  const color = pctUsed >= 90 ? 'var(--red)' : pctUsed >= 60 ? 'var(--amber)' : 'var(--green)';
  return `
    <div class="cat-item" data-category-id="${cat.id}">
      <div class="cat-header">
        <div class="cat-name">${cat.name}</div>
        <div class="cat-badge">${cat.pct}%</div>
      </div>
      <div class="cat-amounts">
        <div class="cat-amount-block"><div class="cat-amount-label">Allocated</div><div class="cat-amount-value">${fmt(cat.allocated)}</div></div>
        <div class="cat-amount-block"><div class="cat-amount-label">Spent</div><div class="cat-amount-value text-red">${fmt(cat.spent)}</div></div>
        <div class="cat-amount-block"><div class="cat-amount-label">${cat.remaining < 0 ? 'Overspent' : 'Left'}</div><div class="cat-amount-value" style="color:${cat.remaining < 0 ? 'var(--red)' : 'var(--green)'}">${cat.remaining < 0 ? '-' + fmt(Math.abs(cat.remaining)) : fmt(cat.remaining)}</div></div>
      </div>
      <div class="cat-bar"><div class="cat-bar-fill" style="width:${pctUsed}%;background:${color}"></div></div>
      <div class="cat-actions">
        <button class="btn btn-ghost btn-sm" onclick="moveCategoryUp(${index})"><i class="fas fa-arrow-up"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="moveCategoryDown(${index})"><i class="fas fa-arrow-down"></i></button>
        <button class="btn btn-danger btn-sm cat-del-btn" data-id="${cat.id}"><i class="fas fa-trash-alt"></i> Delete</button>
      </div>
    </div>`;
}

/* ══════════════════════════ SPEND VIEW ══════════════════════════ */
function renderSpend() {
  const el = document.getElementById('spend-content');
  if (!el) return;

  const currentPeriodSpending = S.spending ? S.spending.filter(s => s.period === S.currentPeriod) : [];
  const ts = totalSpent();

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Quick Add</div>
      <div class="field">
        <label>Category</label>
        <select id="s-cat">
          <option value="">Select category…</option>
          ${S.categories.map(c => `<option value="${c.id}">${c.name} (${fmt(c.remaining)} left)</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Amount</label>
        <input type="tel" id="s-amt" inputmode="decimal" placeholder="0.00" />
      </div>
      <div class="field">
        <label>Note (optional)</label>
        <input type="text" id="s-note" placeholder="e.g., Aldi run"/>
      </div>
      <button class="btn btn-primary" id="s-addBtn">Add Spending</button>
    </div>

    <div class="section-hd mt16">
      <h2>This Period · ${fmt(ts)}</h2>
    </div>
    ${currentPeriodSpending.length === 0
      ? `<div class="empty"><div class="empty-icon"><i class="fas fa-receipt"></i></div><div class="empty-text">No spending this period</div></div>`
      : currentPeriodSpending.slice().reverse().map(e => spendItemHtml(e)).join('')
    }
  `;

  const amtInput = document.getElementById('s-amt');
  if (amtInput) {
    amtInput._thousandSepAttached = false;
    applyThousandSeparator(amtInput);
  }

  const addBtn = el.querySelector('#s-addBtn');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);

    newAddBtn.addEventListener('click', async () => {
      newAddBtn.disabled = true;

      const catId = Number(document.getElementById('s-cat').value);
      let amtVal = document.getElementById('s-amt').value;
      amtVal = parseFormattedNumber(amtVal);
      const note = document.getElementById('s-note').value;
      await addSpending(catId, amtVal, note);

      setTimeout(() => { newAddBtn.disabled = false; }, 500);
    });
  }

  el.querySelectorAll('.spend-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirm('Delete Spending', 'Remove this spending entry?');
      if (ok) deleteSpending(Number(btn.dataset.id));
    });
  });

  el.querySelectorAll('.spend-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditSpendModal(Number(btn.dataset.id));
    });
  });
}

window._pendingQuickCategoryId = null;

function openSpendModalWithCategory(catId, catName) {
  const modal = document.getElementById('spendModal');
  const categorySelect = document.getElementById('m-spendCat');

  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select category…</option>' +
      S.categories.map(c => `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.name} (${fmt(c.remaining)} left)</option>`).join('');
    categorySelect.value = catId;
  }

  modal.dataset.quickCategoryId = catId;
  window._pendingQuickCategoryId = catId;

  modal.classList.add('quick-mode');

  const title = modal.querySelector('.modal-title');
  if (title) title.textContent = `Add to ${catName}`;

  const amtInput = document.getElementById('m-spendAmt');
  const noteInput = document.getElementById('m-spendNote');
  if (amtInput) {
    amtInput.value = '';
    amtInput._thousandSepAttached = false;
    applyThousandSeparator(amtInput);
  }
  if (noteInput) noteInput.value = '';

  openModal('spendModal');

  setTimeout(() => {
    if (amtInput) amtInput.focus();
  }, 100);
}

/* ══════════════════════════ HISTORY ════════════════════════════ */
function renderHistory() {
  const el = document.getElementById('history-content');
  if (!el) return;

  const periods = S.history ? [...new Set(S.history.map(h => h.period))].sort().reverse() : [];
  let histHtml = '';
  if (periods.length === 0) {
    histHtml = `<div class="empty"><div class="empty-icon"><i class="fas fa-scroll"></i></div><div class="empty-text">No history yet</div></div>`;
  } else {
    periods.forEach(period => {
      const entries = S.history.filter(h => h.period === period).sort((a, b) => new Date(b.date) - new Date(a.date));
      const ptotal = entries.reduce((s, e) => addMoney(s, e.amount), 0);
      histHtml += `<div class="hist-period"><i class="far fa-calendar-alt"></i> ${period} · ${fmt(ptotal)}</div>`;
      histHtml += entries.map(e => spendItemHtml(e)).join('');
    });
  }

  let analyticsHtml = '';
  if (S.analyticsHistory && S.analyticsHistory.length > 0) {
    analyticsHtml = S.analyticsHistory.map(a => `
      <div class="analytics-item">
        <div class="analytics-period"><i class="far fa-calendar-alt"></i> ${a.period}</div>
        <div class="analytics-row"><span>Total Allocated</span><span>${fmt(a.totalAllocated)}</span></div>
        <div class="analytics-row"><span>Total Spent</span><span>${fmt(a.totalSpent)}</span></div>
        <div class="analytics-row"><span>Rolled Back</span><span class="text-green">${fmt(a.rollbackAmount)}</span></div>
        <div class="divider"></div>
        ${Object.entries(a.categorySpending).filter(([, v]) => v > 0).map(([k, v]) =>
      `<div class="analytics-row"><span>${k}</span><span>${fmt(v)}</span></div>`
    ).join('')}
      </div>
    `).join('');
  } else {
    analyticsHtml = `<div class="empty"><div class="empty-icon"><i class="fas fa-chart-line"></i></div><div class="empty-text">Analytics appear after your first period rollover</div></div>`;
  }

  let rbHtml = '';
  if (!S.rollbackHistory || S.rollbackHistory.length === 0) {
    rbHtml = `<div class="empty"><div class="empty-icon"><i class="fas fa-dollar-sign"></i></div><div class="empty-text">No rollback records yet</div></div>`;
  } else {
    rbHtml = S.rollbackHistory.map(r => `
      <div class="rollback-item">
        <div>
          <div class="fw7">${r.note || r.period}</div>
          <div class="rollback-meta">${fmtDate(r.date)}</div>
        </div>
        <div class="rollback-amount" style="color:${r.amount > 0 ? 'var(--green)' : 'var(--red)'}">
          ${r.amount > 0 ? '+' : ''} ${fmt(Math.abs(r.amount))}
        </div>
      </div>
    `).join('');
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Rollback Pool</div>
      <div class="flex-between mb8">
        <div>
          <div style="font-size:32px;font-weight:700;color:var(--green)">${fmt(S.rollbackPool)}</div>
          <div class="fs12" style="color:var(--text2)">Available to withdraw</div>
        </div>
        <button class="btn btn-green btn-sm" id="withdrawBtn">Withdraw</button>
      </div>
      <div class="divider"></div>
      ${rbHtml}
    </div>

    <div class="section-hd mt16"><h2>Period Analytics</h2></div>
    ${analyticsHtml}

    <div class="section-hd mt16"><h2>All Spending</h2></div>
    ${histHtml}

    <div style="margin-top:20px">
      <button class="btn btn-danger" id="clearDataBtn"><i class="fas fa-trash-alt"></i> Clear All Data</button>
    </div>
  `;

  const clearDataBtn = el.querySelector('#clearDataBtn');
  if (clearDataBtn) {
    const newClearBtn = clearDataBtn.cloneNode(true);
    clearDataBtn.parentNode.replaceChild(newClearBtn, clearDataBtn);
    newClearBtn.addEventListener('click', () => {
      openClearDataModal();
    });
  }

  const withdrawBtn = el.querySelector('#withdrawBtn');
  if (withdrawBtn) {
    const newWithdrawBtn = withdrawBtn.cloneNode(true);
    withdrawBtn.parentNode.replaceChild(newWithdrawBtn, withdrawBtn);
    newWithdrawBtn.addEventListener('click', openWithdrawModal);
  }

  el.querySelectorAll('.spend-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirm('Delete Spending', 'Remove this spending entry?');
      if (ok) deleteSpending(Number(btn.dataset.id));
    });
  });

  el.querySelectorAll('.spend-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditSpendModal(Number(btn.dataset.id));
    });
  });
}

/* ══════════════════════════ ANALYTICS ════════════════════════════ */

let currentAnalyticsPeriod = null;
const ANALYTICS_COLLAPSE_KEY = 'analytics_collapsed_sections';
let analyticsLoading = false;
let analyticsResizeObserver = null;

function getCollapsedSections() {
  try {
    const stored = localStorage.getItem(ANALYTICS_COLLAPSE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCollapsedSections(collapsed) {
  localStorage.setItem(ANALYTICS_COLLAPSE_KEY, JSON.stringify(collapsed));
}

function toggleAnalyticsSection(sectionId) {
  const collapsed = getCollapsedSections();
  collapsed[sectionId] = !collapsed[sectionId];
  saveCollapsedSections(collapsed);
  renderAnalytics();
}

function redrawAnalyticsChartsAfterDelay() {
  setTimeout(() => {
    drawAnalyticsCharts();
  }, 350);
}

function setupAnalyticsResizeListener() {
  if (analyticsResizeObserver) return;
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (analyticsTrendChart) analyticsTrendChart.resize();
      if (analyticsCategoryChart) analyticsCategoryChart.resize();
      if (analyticsRollbackChart) analyticsRollbackChart.resize();
      if (analyticsBudgetChart) analyticsBudgetChart.resize();
    }, 200);
  });
}

function renderAnalytics() {
  const el = document.getElementById('analytics-content');
  if (!el) return;

  destroyAllCharts();

  if (!S.analyticsHistory || S.analyticsHistory.length === 0) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon"><i class="fas fa-chart-line"></i></div>
        <div class="empty-text">Complete your first pay period to see analytics</div>
        <div class="fs12" style="color: var(--text2); margin-top: 8px;">Start a new period from the home screen to generate insights</div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="analytics-loading">
      <i class="fas fa-spinner fa-pulse"></i> Loading analytics...
    </div>
  `;

  setTimeout(() => {
    renderAnalyticsContent(el);
  }, 50);
}

function renderAnalyticsContent(el) {
  const availablePeriods = [...new Set(S.analyticsHistory.map(a => a.period))].sort().reverse();

  if (!currentAnalyticsPeriod || !availablePeriods.includes(currentAnalyticsPeriod)) {
    currentAnalyticsPeriod = availablePeriods[0];
  }

  const totalSpentAllPeriods = S.analyticsHistory.reduce((sum, a) => addMoney(sum, a.totalSpent), 0);
  const avgSpendingPerPeriod = S.analyticsHistory.length > 0 ? totalSpentAllPeriods / S.analyticsHistory.length : 0;

  const totalRollbackAllPeriods = S.analyticsHistory.reduce((sum, a) => addMoney(sum, a.rollbackAmount), 0);
  const avgRollbackPerPeriod = S.analyticsHistory.length > 0 ? totalRollbackAllPeriods / S.analyticsHistory.length : 0;

  let categoryTotals = {};
  S.analyticsHistory.forEach(a => {
    Object.entries(a.categorySpending).forEach(([cat, amt]) => {
      if (amt > 0) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });
  });
  let topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  let topCategoryName = topCategory ? topCategory[0] : 'N/A';
  let topCategoryAmount = topCategory ? topCategory[1] : 0;

  const totalSaved = S.savings.reduce((sum, g) => addMoney(sum, g.saved), 0);
  const totalTarget = S.savings.reduce((sum, g) => addMoney(sum, g.target), 0);
  const savingsProgressPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const periodOptions = availablePeriods.map(p =>
    `<option value="${p}" ${p === currentAnalyticsPeriod ? 'selected' : ''}>${p}</option>`
  ).join('');

  const collapsed = getCollapsedSections();

  el.innerHTML = `
    <div class="analytics-period-selector flex-between">
      <label><i class="fas fa-calendar-alt"></i> View Period:</label>
      <select id="analyticsPeriodSelect">
        ${periodOptions}
      </select>
    </div>

    <div class="analytics-metrics">
      <div class="analytics-metric-card">
        <div class="analytics-metric-value">${fmt(avgSpendingPerPeriod)}</div>
        <div class="analytics-metric-label">Avg Spending / Period</div>
      </div>
      <div class="analytics-metric-card">
        <div class="analytics-metric-value">${fmt(avgRollbackPerPeriod)}</div>
        <div class="analytics-metric-label">Avg Saved / Period</div>
      </div>
      <div class="analytics-metric-card">
        <div class="analytics-metric-value">${topCategoryName}</div>
        <div class="analytics-metric-label">Top Category (${fmt(topCategoryAmount)})</div>
      </div>
      <div class="analytics-metric-card">
        <div class="analytics-metric-value">${savingsProgressPct.toFixed(0)}%</div>
        <div class="analytics-metric-label">Savings Progress</div>
      </div>
    </div>

    <div class="analytics-grid">
      ${renderCollapsibleChart('trend', 'Spending Trend', '<i class="fas fa-chart-line"></i>', !collapsed['trend'], `
        <canvas id="analyticsTrendChart" height="200"></canvas>
      `)}
      ${renderCollapsibleChart('category', 'Category Breakdown', '<i class="fas fa-chart-pie"></i>', !collapsed['category'], `
        <canvas id="analyticsCategoryChart" height="200"></canvas>
      `)}
      ${renderCollapsibleChart('rollback', 'Rollback Pool Growth', '<i class="fas fa-chart-area"></i>', !collapsed['rollback'], `
        <canvas id="analyticsRollbackChart" height="200"></canvas>
      `)}
      ${renderCollapsibleChart('budget', 'Budget vs Actual', '<i class="fas fa-chart-bar"></i>', !collapsed['budget'], `
        <canvas id="analyticsBudgetChart" height="200"></canvas>
      `)}
    </div>
  `;

  setTimeout(() => drawAnalyticsCharts(), 100);
  setupAnalyticsResizeListener();

  const periodSelect = document.getElementById('analyticsPeriodSelect');
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      currentAnalyticsPeriod = e.target.value;
      renderAnalytics();
    });
  }

  document.querySelectorAll('.chart-collapsible-header').forEach(header => {
    header.removeEventListener('click', analyticsHeaderHandler);
    header.addEventListener('click', analyticsHeaderHandler);
  });
}

function renderCollapsibleChart(id, title, icon, isExpanded, contentHtml) {
  return `
    <div class="analytics-chart-card">
      <div class="chart-collapsible-header" data-section="${id}">
        <div class="chart-header-title">
          ${icon} ${title}
        </div>
        <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'} chart-toggle-icon"></i>
      </div>
      <div class="chart-collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}">
        <div class="chart-wrap-inner">
          ${contentHtml}
        </div>
      </div>
    </div>
  `;
}

function drawAnalyticsCharts() {
  if (analyticsTrendChart) { analyticsTrendChart.destroy(); analyticsTrendChart = null; }
  if (analyticsCategoryChart) { analyticsCategoryChart.destroy(); analyticsCategoryChart = null; }
  if (analyticsRollbackChart) { analyticsRollbackChart.destroy(); analyticsRollbackChart = null; }
  if (analyticsBudgetChart) { analyticsBudgetChart.destroy(); analyticsBudgetChart = null; }

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

  const trendCtx = document.getElementById('analyticsTrendChart');
  if (trendCtx && S.analyticsHistory && S.analyticsHistory.length > 0) {
    const last8 = S.analyticsHistory.slice(0, 8).reverse();
    const labels = last8.map(a => a.period.substring(5).replace('-', '/'));
    const data = last8.map(a => a.totalSpent);

    analyticsTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Spent',
          data: data,
          borderColor: '#7c6dfa',
          backgroundColor: 'rgba(124, 109, 250, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#a78bfa',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` Spent: ${fmt(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, callback: v => '$' + v, font: { size: 10 } }, grid: { color: gridColor } }
        }
      }
    });
  }

  const categoryCtx = document.getElementById('analyticsCategoryChart');
  if (categoryCtx && currentAnalyticsPeriod) {
    const selectedData = S.analyticsHistory.find(a => a.period === currentAnalyticsPeriod);
    if (selectedData && selectedData.categorySpending) {
      const categories = Object.keys(selectedData.categorySpending).filter(c => selectedData.categorySpending[c] > 0);
      const amounts = categories.map(c => selectedData.categorySpending[c]);
      const palette = ['#7c6dfa', '#22d3ee', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#06d6a0', '#ef476f', '#118ab2', '#fd7e14'];

      if (categories.length > 0) {
        analyticsCategoryChart = new Chart(categoryCtx, {
          type: 'doughnut',
          data: {
            labels: categories,
            datasets: [{
              data: amounts,
              backgroundColor: palette,
              borderWidth: 0,
              hoverOffset: 10
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
              legend: { position: 'right', labels: { color: textColor, boxWidth: 12, padding: 10, font: { size: 10 } } },
              tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
            }
          }
        });
      }
    }
  }

  const rollbackCtx = document.getElementById('analyticsRollbackChart');
  if (rollbackCtx && S.rollbackHistory && S.rollbackHistory.length > 0) {
    let cumulative = 0;
    const rollbackData = [];
    const rollbackLabels = [];
    const reversedHistory = [...S.rollbackHistory].reverse();

    for (let i = 0; i < reversedHistory.length; i++) {
      const r = reversedHistory[i];
      if (r.amount > 0) {
        cumulative += r.amount;
      } else if (r.amount < 0) {
        cumulative += r.amount;
      }
      rollbackData.push(Math.max(0, cumulative));
      rollbackLabels.push(r.period ? r.period.substring(5).replace('-', '/') : fmtDate(r.date));
    }

    analyticsRollbackChart = new Chart(rollbackCtx, {
      type: 'line',
      data: {
        labels: rollbackLabels,
        datasets: [{
          label: 'Rollback Pool',
          data: rollbackData,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#34d399',
          pointBorderColor: '#fff',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` Pool: ${fmt(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, callback: v => '$' + v, font: { size: 10 } }, grid: { color: gridColor } }
        }
      }
    });
  }

  const budgetCtx = document.getElementById('analyticsBudgetChart');
  if (budgetCtx && currentAnalyticsPeriod) {
    const selectedPeriodData = S.analyticsHistory.find(a => a.period === currentAnalyticsPeriod);
    if (selectedPeriodData && S.categories && S.categories.length > 0) {
      const categoryNames = S.categories.map(c => c.name);
      const allocatedData = S.categories.map(c => c.allocated);
      const spentData = categoryNames.map(name => selectedPeriodData.categorySpending[name] || 0);

      analyticsBudgetChart = new Chart(budgetCtx, {
        type: 'bar',
        data: {
          labels: categoryNames,
          datasets: [
            { label: 'Allocated', data: allocatedData, backgroundColor: 'rgba(124, 109, 250, 0.7)', borderRadius: 6 },
            { label: 'Spent', data: spentData, backgroundColor: 'rgba(248, 113, 113, 0.7)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { labels: { color: textColor, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: 9 } }, grid: { color: gridColor } },
            y: { ticks: { color: textColor, callback: v => '$' + v, font: { size: 10 } }, grid: { color: gridColor } }
          }
        }
      });
    }
  }
}

function analyticsHeaderHandler(e) {
  const section = this.dataset.section;
  if (section) {
    toggleAnalyticsSection(section);
  }
}

/* ══════════════════════════ SETTINGS ════════════════════════════ */
function renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;

  const backupReminderDismissed = localStorage.getItem('backupReminderDismissed') === 'true';

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Paycheck</div>
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">Current Amount</div>
          <div class="toggle-sub">${fmt(S.paycheckAmount)} · ${S.payPeriod}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="set-editPaycheck">Edit</button>
      </div>
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">Pay Period</div>
          <div class="toggle-sub">${S.payPeriod}</div>
        </div>
        <select id="set-payPeriod" style="width:140px;padding:8px 12px;border-radius:8px;font-size:13px;background:var(--surface2);border:1px solid var(--border2);color:var(--text)">
          <option value="weekly"      ${S.payPeriod === 'weekly' ? 'selected' : ''}>Weekly</option>
          <option value="biweekly"    ${S.payPeriod === 'biweekly' ? 'selected' : ''}>Bi-weekly</option>
          <option value="semimonthly" ${S.payPeriod === 'semimonthly' ? 'selected' : ''}>Semi-monthly</option>
          <option value="monthly"     ${S.payPeriod === 'monthly' ? 'selected' : ''}>Monthly</option>
        </select>
      </div>
    </div>

    <div class="section-hd">
      <h2>Savings Goals</h2>
      <a id="addGoalBtn">+ Add</a>
    </div>
    ${!S.savings || S.savings.length === 0
      ? `<div class="empty"><div class="empty-icon"><i class="fas fa-bullseye"></i></div><div class="empty-text">No savings goals yet</div><button class="btn btn-primary btn-sm" id="emptySettingsAddGoal">Add Goal</button></div>`
      : S.savings.map(g => fullGoalCard(g)).join('')
    }

    <div class="section-hd mt16">
      <h2>Help & Tips</h2>
    </div>
    <div class="help-section">
      <div class="help-item">
        <div class="help-question"><i class="fas fa-question-circle"></i> What is the Rollback Pool?</div>
        <div class="help-answer">Unspent money from each pay period automatically moves here. You can withdraw it anytime to add to your current paycheck.</div>
      </div>
      <div class="help-item">
        <div class="help-question"><i class="fas fa-repeat"></i> How do recurring transactions work?</div>
        <div class="help-answer">Set them up in the Bills tab. They will automatically be added to your spending on their due dates.</div>
      </div>
      <div class="help-item">
        <div class="help-question"><i class="fas fa-chart-line"></i> How do pay periods work?</div>
        <div class="help-answer">Select your pay frequency in Settings. Click the refresh icon to start a new period when you get paid.</div>
      </div>
      <div class="help-item">
        <div class="help-question"><i class="fas fa-percent"></i> What if my budget doesn't add to 100%?</div>
        <div class="help-answer">Use "Distribute Rest" to evenly spread remaining percentage, or manually adjust.</div>
      </div>
    </div>

    <div class="section-hd mt16">
      <h2>Category Presets</h2>
    </div>
    <div class="card">
      <div class="preset-chips" id="set-presets">
        ${S.customPresets.map((p, i) => `
          <div class="preset-chip" data-index="${i}">
            ${p.name} <span class="chip-pct">${p.pct}%</span>
            <span class="preset-chip-del" data-del="${i}"><i class="fas fa-times"></i></span>
          </div>
        `).join('')}
      </div>
      <div class="field"><label>Preset Name</label><input type="text" id="set-pName" placeholder="e.g., Dining Out"/></div>
      <div class="field"><label>Percentage</label><input type="number" id="set-pPct" inputmode="decimal" placeholder="10" min="0" max="100" step="0.1"/></div>
      <button class="btn btn-ghost" id="set-addPreset">Add Preset</button>
    </div>

    <div class="section-hd mt16"><h2>Data</h2></div>
    <div class="card">
      ${!backupReminderDismissed ? `
        <div class="backup-reminder" id="backupReminder">
          <i class="fas fa-cloud-upload-alt"></i>
          <span><i class="fas fa-info-circle"></i> Tip: Export your data periodically as a backup!</span>
          <button class="backup-dismiss" id="dismissBackupReminder"><i class="fas fa-times"></i></button>
        </div>
      ` : ''}
      <div class="btn-row mb8">
        <button class="btn btn-green" id="exportBtn"><i class="fas fa-download"></i> Export JSON</button>
        <button class="btn btn-ghost" id="importBtn"><i class="fas fa-upload"></i> Import JSON</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="exportCsvBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
        <button class="btn btn-ghost" id="loadDemoDataBtn"><i class="fas fa-chart-simple"></i> Load Demo Data</button>
      </div>
      <div class="btn-row" style="margin-top: 12px;">
        <button class="btn btn-danger" id="settingsClearDataBtn"><i class="fas fa-trash-alt"></i> Clear All Data</button>
      </div>
      <input type="file" id="importFile" accept=".json" style="display:none"/>
      <div class="last-saved" style="margin-top: 16px;">Last saved: <span id="lastSavedTime">${new Date(lastSavedTime).toLocaleTimeString()}</span></div>
    </div>

    <div class="section-hd mt16"><h2>Appearance</h2></div>
    <div class="card">
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">Dark Mode</div>
          <div class="toggle-sub">Easier on the eyes at night</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="set-darkMode" ${S.theme === 'dark' ? 'checked' : ''}/>
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>
    </div>

    <div class="card" style="border:1px solid var(--green);">
      <div class="card-title"><i class="fas fa-save"></i> Auto-save</div>
      <p class="fs14" style="color:var(--green)">All changes are automatically saved to local storage.</p>
    </div>

    <div class="card" style="border:1.5px solid rgba(124,109,250,.3);margin-top:8px">
      <div class="card-title"><i class="fas fa-mobile-alt"></i> Install as App</div>
      <div class="fs14" style="color:var(--text2);line-height:1.6">In Safari, tap the <strong style="color:var(--text)">Share</strong> button (□↑), then select <strong style="color:var(--text)">"Add to Home Screen"</strong> to install Paycheck Balancer as a standalone app on your phone.</div>
    </div>

    <div style="height:16px"></div>
  `;

  el.querySelector('#set-editPaycheck')?.addEventListener('click', openPaycheckModal);
  el.querySelector('#addGoalBtn')?.addEventListener('click', openGoalModal);
  el.querySelector('#emptySettingsAddGoal')?.addEventListener('click', openGoalModal);
  el.querySelector('#set-payPeriod')?.addEventListener('change', e => {
    S.payPeriod = e.target.value;
    save();
    renderAll();
  });
  el.querySelector('#set-darkMode')?.addEventListener('change', e => {
    S.theme = e.target.checked ? 'dark' : 'light';
    applyTheme();
    save();
  });
  el.querySelector('#set-addPreset')?.addEventListener('click', () => {
    const name = document.getElementById('set-pName').value.trim();
    const pct = Number(document.getElementById('set-pPct').value);
    if (!name || isNaN(pct) || pct < 0 || pct > 100) { toast('Enter a valid name and %', 'error'); return; }
    S.customPresets.push({ name, pct });
    save();
    renderSettings();
    toast('Preset added');
  });
  el.querySelectorAll('.preset-chip-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = Number(btn.dataset.del);
      S.customPresets.splice(i, 1);
      save();
      renderSettings();
      toast('Preset removed');
    });
  });
  el.querySelectorAll('.goal-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      S.savings = S.savings.filter(g => g.id !== Number(btn.dataset.id));
      save();
      renderSettings();
      toast('Goal deleted');
    });
  });
  el.querySelectorAll('.goal-contrib-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openContributeModal(Number(btn.dataset.id));
    });
  });
  el.querySelector('#exportBtn')?.addEventListener('click', exportData);
  el.querySelector('#importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
  el.querySelector('#exportCsvBtn')?.addEventListener('click', exportCSV);
  el.querySelector('#loadDemoDataBtn')?.addEventListener('click', async () => {
    const ok = await confirm('Load Demo Data', 'This will add sample data to your app. Your existing data will be merged. Continue?');
    if (ok) loadDemoData();
  });
  el.querySelector('#dismissBackupReminder')?.addEventListener('click', () => {
    localStorage.setItem('backupReminderDismissed', 'true');
    renderSettings();
  });
  const importFile = document.getElementById('importFile');
  if (importFile) importFile.onchange = importData;

  const settingsClearBtn = el.querySelector('#settingsClearDataBtn');
  if (settingsClearBtn) {
    const newClearBtn = settingsClearBtn.cloneNode(true);
    settingsClearBtn.parentNode.replaceChild(newClearBtn, settingsClearBtn);
    newClearBtn.addEventListener('click', () => {
      openClearDataModal();
    });
  }
}

function fullGoalCard(g) {
  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
  let daysLeft = '';
  if (g.deadline) {
    const days = Math.ceil((new Date(g.deadline) - Date.now()) / 86400000);
    daysLeft = days > 0 ? `${days} days left` : 'Deadline passed';
  }
  return `
    <div class="goal-item">
      <div class="goal-header">
        <div>
          <div class="goal-name"><i class="fas fa-bullseye"></i> ${g.name}</div>
          <div class="goal-target">${daysLeft || 'No deadline'}</div>
        </div>
        <div class="goal-pct">${pct.toFixed(0)}%</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div>
      <div class="goal-amounts">
        <span>${fmt(g.saved)} saved</span>
        <span>${fmt(g.target)} goal</span>
      </div>
      <div class="cat-actions">
        <button class="btn btn-green btn-sm goal-contrib-btn" data-id="${g.id}"><i class="fas fa-plus-circle"></i> Contribute</button>
        <button class="btn btn-danger btn-sm goal-del-btn" data-id="${g.id}"><i class="fas fa-trash-alt"></i> Delete</button>
      </div>
    </div>`;
}

/* ══════════════════════ DEMO DATA (no duplicates) ══════════════════════════ */
function loadDemoData() {
  if (S.categories.length === 0) {
    const demoCategories = [
      { name: 'Rent', pct: 30 }, { name: 'Groceries', pct: 15 }, { name: 'Transport', pct: 10 },
      { name: 'Savings', pct: 20 }, { name: 'Fun', pct: 10 }, { name: 'Utilities', pct: 8 },
      { name: 'Health', pct: 5 }, { name: 'Dining', pct: 2 }
    ];
    S.categories = demoCategories.map(c => ({ id: uid(), name: c.name, pct: c.pct, allocated: 0, spent: 0, remaining: 0 }));
  }

  if (S.spending.filter(s => s.period === S.currentPeriod).length === 0) {
    const sampleSpending = [
      { categoryName: 'Rent', amount: 750, note: 'Monthly rent' },
      { categoryName: 'Groceries', amount: 125, note: 'Trader Joes' },
      { categoryName: 'Groceries', amount: 85, note: 'Costco run' },
      { categoryName: 'Transport', amount: 45, note: 'Gas' },
      { categoryName: 'Fun', amount: 60, note: 'Movies' },
      { categoryName: 'Utilities', amount: 95, note: 'Electric bill' },
      { categoryName: 'Health', amount: 25, note: 'Pharmacy' },
      { categoryName: 'Savings', amount: 200, note: 'Auto transfer to savings' }
    ];
    sampleSpending.forEach(s => {
      const cat = S.categories.find(c => c.name === s.categoryName);
      if (cat) {
        S.spending.push({ id: uid(), categoryId: cat.id, categoryName: cat.name, note: s.note, amount: s.amount, period: S.currentPeriod, date: new Date().toISOString() });
        S.history.push({ id: uid(), categoryId: cat.id, categoryName: cat.name, note: s.note, amount: s.amount, period: S.currentPeriod, date: new Date().toISOString() });
      }
    });
  }

  if (S.savings.length === 0) {
    S.savings.push({ id: uid(), name: 'Emergency Fund', target: 5000, saved: 1250, deadline: null, created: new Date().toISOString() });
    S.savings.push({ id: uid(), name: 'Vacation', target: 2000, saved: 450, deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0], created: new Date().toISOString() });
  }

  S.paycheckAmount = 2500;
  calcAllocations();
  save();
  renderAll();
  toast('Demo data loaded!');
}

/* ══════════════════════ MODAL: CONTRIBUTE TO GOAL ══════════════════════ */
let currentContributingGoalId = null;

function openContributeModal(goalId) {
  const goal = S.savings.find(g => g.id === goalId);
  if (!goal) return;
  currentContributingGoalId = goalId;
  document.getElementById('contributeModalTitle').textContent = `Contribute to ${goal.name}`;
  document.getElementById('contributeGoalId').value = goalId;
  document.getElementById('contribCurrentSaved').textContent = fmt(goal.saved);
  document.getElementById('contribTargetAmount').textContent = fmt(goal.target);
  const amountInput = document.getElementById('contributeAmount');
  if (amountInput) {
    amountInput.value = '';
    amountInput._thousandSepAttached = false;
    applyThousandSeparator(amountInput);
  }
  document.getElementById('contributeNote').value = '';
  openModal('contributeModal');
}

function submitContribution() {
  if (!currentContributingGoalId) {
    toast('No goal selected', 'error');
    return;
  }
  const goal = S.savings.find(g => g.id === currentContributingGoalId);
  if (!goal) {
    toast('Goal not found', 'error');
    return;
  }
  let amountVal = document.getElementById('contributeAmount')?.value;
  amountVal = parseFormattedNumber(amountVal);
  const amount = parseFloat(amountVal);
  const note = document.getElementById('contributeNote')?.value || '';

  if (isNaN(amount) || amount <= 0) {
    toast('Enter a valid amount greater than 0', 'error');
    return;
  }

  const newSaved = addMoney(goal.saved, amount);
  if (newSaved > goal.target) {
    toast(`Cannot exceed goal target of ${fmt(goal.target)}`, 'error');
    return;
  }

  goal.saved = newSaved;

  S.history.push({
    id: uid(),
    categoryId: null,
    categoryName: 'Savings',
    note: `Contribution to ${goal.name}: ${note || 'manual contribution'}`,
    amount: amount,
    period: S.currentPeriod,
    date: new Date().toISOString(),
    isSavingsContribution: true
  });

  save();
  closeModal('contributeModal');
  currentContributingGoalId = null;
  renderAll();
  toast(`Added ${fmt(amount)} to ${goal.name}!`);
}

/* ══════════════════════ MODAL: EDIT SPENDING ══════════════════════ */
let currentEditingSpendId = null;

function openEditSpendModal(spendId) {
  const spendEntry = S.spending.find(s => s.id === spendId);
  if (!spendEntry) {
    toast('Spending entry not found', 'error');
    return;
  }
  currentEditingSpendId = spendId;
  const amtInput = document.getElementById('e-spendAmt');
  if (amtInput) {
    amtInput.value = formatNumberWithCommas(spendEntry.amount.toFixed(2));
    amtInput._thousandSepAttached = false;
    applyThousandSeparator(amtInput);
  }
  document.getElementById('e-spendNote').value = spendEntry.note || '';
  const catSelect = document.getElementById('e-spendCat');
  if (catSelect) {
    catSelect.innerHTML = S.categories.map(c => `<option value="${c.id}" ${c.id === spendEntry.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');
  }
  openModal('editSpendModal');
}

document.getElementById('e-spendSubmit')?.addEventListener('click', () => {
  if (!currentEditingSpendId) {
    toast('No spending entry selected', 'error');
    return;
  }
  let newAmountVal = document.getElementById('e-spendAmt')?.value;
  newAmountVal = parseFormattedNumber(newAmountVal);
  const newAmount = parseFloat(newAmountVal);
  const newNote = document.getElementById('e-spendNote')?.value || '';
  const newCategoryId = Number(document.getElementById('e-spendCat')?.value);

  if (isNaN(newAmount) || newAmount < 0) {
    toast('Enter a valid amount', 'error');
    return;
  }
  if (!newCategoryId) {
    toast('Select a category', 'error');
    return;
  }

  updateSpending(currentEditingSpendId, newAmount, newNote, newCategoryId);
  closeModal('editSpendModal');
  currentEditingSpendId = null;
});
document.getElementById('e-spendCancel')?.addEventListener('click', () => {
  closeModal('editSpendModal');
  currentEditingSpendId = null;
});

/* ══════════════════════ MODAL: PAYCHECK ══════════════════════════ */
function openPaycheckModal() {
  const amtInput = document.getElementById('m-paycheckAmt');
  const extAmtInput = document.getElementById('m-extAmt');

  if (amtInput) {
    amtInput.value = '';
    amtInput._thousandSepAttached = false;
    applyThousandSeparator(amtInput);
  }
  if (extAmtInput) {
    extAmtInput.value = '';
    extAmtInput._thousandSepAttached = false;
    applyThousandSeparator(extAmtInput);
  }

  document.getElementById('m-payPeriod').value = S.payPeriod;
  document.getElementById('m-extSource').value = '';

  openModal('paycheckModal');
}

document.getElementById('m-paycheckSubmit')?.addEventListener('click', () => {
  let amtRaw = document.getElementById('m-paycheckAmt')?.value;
  let amtParsed = parseFormattedNumber(amtRaw);
  const amtNum = amtParsed !== '' ? parseFloat(amtParsed) : NaN;
  const per = document.getElementById('m-payPeriod')?.value;
  const eSrc = document.getElementById('m-extSource')?.value.trim();
  let eAmtRaw = document.getElementById('m-extAmt')?.value;
  let eAmtParsed = parseFormattedNumber(eAmtRaw);
  const eAmtNum = eAmtParsed !== '' ? parseFloat(eAmtParsed) : NaN;

  let newPaycheckAmount = S.paycheckAmount;
  let paycheckUpdated = false;
  let changes = [];

  if (amtRaw !== undefined && amtRaw !== '') {
    if (!isNaN(amtNum) && amtNum >= 0) {
      if (amtNum !== S.paycheckAmount) {
        newPaycheckAmount = amtNum;
        paycheckUpdated = true;
        changes.push(`paycheck from ${fmt(S.paycheckAmount)} to ${fmt(amtNum)}`);
      }
    } else {
      toast('Please enter a valid paycheck amount (numbers only)', 'error');
      return;
    }
  }

  if (per && per !== S.payPeriod) {
    S.payPeriod = per;
    changes.push(`pay period to ${per}`);
    paycheckUpdated = true;
  }

  if (eSrc && eSrc !== '') {
    if (!isNaN(eAmtNum) && eAmtNum > 0) {
      S.externalFunds.push({
        id: uid(),
        source: eSrc,
        amount: eAmtNum,
        period: S.currentPeriod,
        date: new Date().toISOString()
      });
      newPaycheckAmount = addMoney(newPaycheckAmount, eAmtNum);
      paycheckUpdated = true;
      changes.push(`+${fmt(eAmtNum)} from ${eSrc}`);
      toast(`Added ${fmt(eAmtNum)} from ${eSrc} to your balance!`, 'success');
    } else {
      toast('Please enter a valid external funds amount', 'error');
      return;
    }
  }

  if (paycheckUpdated) {
    S.paycheckAmount = newPaycheckAmount;
    calcAllocations();
    save();
    renderAll();
    if (changes.length > 0) {
      toast(`Updated: ${changes.join(', ')}`, 'success');
    } else {
      toast('Paycheck updated!', 'success');
    }
    closeModal('paycheckModal');
  } else {
    if (amtRaw === '' && (!eSrc || eSrc === '')) {
      toast('Enter a paycheck amount or external funds to update', 'error');
    } else if (amtRaw !== '' && isNaN(amtNum)) {
      toast('Invalid paycheck amount entered', 'error');
    } else if (eSrc && eSrc !== '' && (isNaN(eAmtNum) || eAmtNum <= 0)) {
      toast('Enter a valid external funds amount', 'error');
    } else {
      toast('No changes made. Enter a paycheck amount or external funds.', 'error');
    }
  }
});

document.getElementById('m-paycheckCancel')?.addEventListener('click', () => closeModal('paycheckModal'));

/* ══════════════════════ MODAL: CATEGORY ══════════════════════════ */
function openCatModal() {
  document.getElementById('m-catName').value = '';
  document.getElementById('m-catPct').value = '';
  renderPresetChips();
  openModal('catModal');
}
function renderPresetChips() {
  const el = document.getElementById('presetChips');
  if (!el) return;
  el.innerHTML = S.customPresets.map(p => `<div class="preset-chip" data-name="${p.name}" data-pct="${p.pct}">${p.name} <span class="chip-pct">${p.pct}%</span></div>`).join('');
  el.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('m-catName').value = chip.dataset.name;
      document.getElementById('m-catPct').value = chip.dataset.pct;
    });
  });
}

document.getElementById('m-catSubmit')?.addEventListener('click', () => {
  const name = document.getElementById('m-catName')?.value.trim();
  const pctRaw = document.getElementById('m-catPct')?.value;
  const pct = parseFloat(pctRaw);

  if (!name) {
    toast('Please enter a category name', 'error');
    return;
  }
  if (isNaN(pct) || pct < 0 || pct > 100) {
    toast('Please enter a valid percentage between 0 and 100', 'error');
    return;
  }

  const used = totalPct();
  if (used + pct > 100.01) {
    toast(`Only ${(100 - used).toFixed(1)}% remaining`, 'error');
    return;
  }

  S.categories.push({
    id: uid(),
    name: name,
    pct: parseFloat(pct.toFixed(1)),
    allocated: 0,
    spent: 0,
    remaining: 0
  });
  calcAllocations();
  save();
  renderAll();
  toast(`${name} added!`);
  closeModal('catModal');
});
document.getElementById('m-catCancel')?.addEventListener('click', () => closeModal('catModal'));

/* ══════════════════════ MODAL: SPEND ══════════════════════════ */
function openSpendModal() {
  const sel = document.getElementById('m-spendCat');
  if (sel) {
    sel.innerHTML = '<option value="">Select category…</option>' +
      S.categories.map(c => `<option value="${c.id}">${c.name} (${fmt(c.remaining)} left)</option>`).join('');
  }
  const amtInput = document.getElementById('m-spendAmt');
  if (amtInput) {
    amtInput.value = '';
    amtInput._thousandSepAttached = false;
    applyThousandSeparator(amtInput);
  }
  document.getElementById('m-spendNote').value = '';
  const modal = document.getElementById('spendModal');
  if (modal) {
    delete modal.dataset.quickCategoryId;
    modal.classList.remove('quick-mode');
    const title = modal.querySelector('.modal-title');
    if (title) title.textContent = 'Add Spending';
  }
  window._pendingQuickCategoryId = null;
  openModal('spendModal');
}

document.getElementById('m-spendSubmit')?.addEventListener('click', async () => {
  const modal = document.getElementById('spendModal');
  let catId = null;

  if (modal?.dataset.quickCategoryId) {
    catId = Number(modal.dataset.quickCategoryId);
  } else if (window._pendingQuickCategoryId) {
    catId = Number(window._pendingQuickCategoryId);
  } else {
    catId = Number(document.getElementById('m-spendCat')?.value);
  }

  let amtRaw = document.getElementById('m-spendAmt')?.value;
  let amtParsed = parseFormattedNumber(amtRaw);
  const note = document.getElementById('m-spendNote')?.value;

  if (!catId || catId === 0) {
    toast('Please select a category', 'error');
    return;
  }

  if (amtParsed === '' || isNaN(parseFloat(amtParsed))) {
    toast('Please enter a valid amount', 'error');
    return;
  }

  const amt = parseFloat(amtParsed);
  if (amt <= 0) {
    toast('Please enter an amount greater than 0', 'error');
    return;
  }

  const success = await addSpending(catId, amt, note);
  if (success) {
    if (modal) {
      delete modal.dataset.quickCategoryId;
      modal.classList.remove('quick-mode');
      const title = modal.querySelector('.modal-title');
      if (title) title.textContent = 'Add Spending';
      const categorySelect = document.getElementById('m-spendCat');
      if (categorySelect) categorySelect.value = '';
    }
    window._pendingQuickCategoryId = null;
    const amtInput = document.getElementById('m-spendAmt');
    if (amtInput) amtInput.value = '';
    const noteInput = document.getElementById('m-spendNote');
    if (noteInput) noteInput.value = '';
    closeModal('spendModal');
  }
});

document.getElementById('m-spendCancel')?.addEventListener('click', () => {
  const modal = document.getElementById('spendModal');
  if (modal) {
    delete modal.dataset.quickCategoryId;
    modal.classList.remove('quick-mode');
    const title = modal.querySelector('.modal-title');
    if (title) title.textContent = 'Add Spending';
    const categorySelect = document.getElementById('m-spendCat');
    if (categorySelect) categorySelect.value = '';
  }
  window._pendingQuickCategoryId = null;
  closeModal('spendModal');
});

/* ══════════════════════ MODAL: GOAL ══════════════════════════ */
function openGoalModal() {
  ['m-goalName', 'm-goalTarget', 'm-goalSaved', 'm-goalDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const targetInput = document.getElementById('m-goalTarget');
  const savedInput = document.getElementById('m-goalSaved');
  if (targetInput) {
    targetInput._thousandSepAttached = false;
    applyThousandSeparator(targetInput);
  }
  if (savedInput) {
    savedInput._thousandSepAttached = false;
    applyThousandSeparator(savedInput);
  }
  openModal('goalModal');
}

document.getElementById('m-goalSubmit')?.addEventListener('click', () => {
  const name = document.getElementById('m-goalName')?.value.trim();
  let targetRaw = document.getElementById('m-goalTarget')?.value;
  let targetParsed = parseFormattedNumber(targetRaw);
  const target = parseFloat(targetParsed);
  let savedRaw = document.getElementById('m-goalSaved')?.value;
  let savedParsed = parseFormattedNumber(savedRaw);
  const saved = parseFloat(savedParsed) || 0;
  const dl = document.getElementById('m-goalDate')?.value;

  if (!name) {
    toast('Please enter a goal name', 'error');
    return;
  }
  if (isNaN(target) || target <= 0) {
    toast('Please enter a valid target amount', 'error');
    return;
  }
  if (isNaN(saved)) {
    toast('Please enter a valid saved amount', 'error');
    return;
  }
  if (saved > target) {
    toast('Saved amount cannot exceed target', 'error');
    return;
  }

  S.savings.push({
    id: uid(),
    name: name,
    target: target,
    saved: saved,
    deadline: dl || null,
    created: new Date().toISOString()
  });
  save();
  closeModal('goalModal');
  renderAll();
  toast('Savings goal added!');
});
document.getElementById('m-goalCancel')?.addEventListener('click', () => closeModal('goalModal'));

/* ══════════════════════ MODAL: WITHDRAW ══════════════════════════ */
function openWithdrawModal() {
  document.getElementById('w-available').textContent = fmt(S.rollbackPool);
  const amountInput = document.getElementById('w-amount');
  if (amountInput) {
    amountInput.value = '';
    amountInput._thousandSepAttached = false;
    applyThousandSeparator(amountInput);
  }
  openModal('withdrawModal');
}

document.getElementById('w-submit')?.addEventListener('click', () => {
  let amtRaw = document.getElementById('w-amount')?.value;
  let amtParsed = parseFormattedNumber(amtRaw);
  const amt = parseFloat(amtParsed);

  if (isNaN(amt) || amt <= 0) {
    toast('Please enter a valid amount greater than 0', 'error');
    return;
  }
  if (amt > S.rollbackPool) {
    toast(`Amount exceeds rollback pool of ${fmt(S.rollbackPool)}`, 'error');
    return;
  }

  S.rollbackPool = subtractMoney(S.rollbackPool, amt);
  S.paycheckAmount = addMoney(S.paycheckAmount, amt);
  S.rollbackHistory.unshift({
    id: uid(),
    date: new Date().toISOString(),
    period: S.currentPeriod,
    amount: -amt,
    note: 'Withdrawn to paycheck'
  });

  calcAllocations();
  save();
  closeModal('withdrawModal');
  renderAll();
  toast(`Withdrew ${fmt(amt)} to paycheck`);
});
document.getElementById('w-cancel')?.addEventListener('click', () => closeModal('withdrawModal'));

/* ══════════════════════ CORE ACTIONS ══════════════════════════ */
function addCategory(name, pct) {
  if (!name) { toast('Enter a category name', 'error'); return false; }
  if (isNaN(pct) || pct < 0 || pct > 100) { toast('Enter a valid % (0–100)', 'error'); return false; }
  const used = totalPct();
  if (used + pct > 100.001) { toast(`Only ${(100 - used).toFixed(1)}% remaining`, 'error'); return false; }
  S.categories.push({ id: uid(), name, pct: +pct.toFixed(1), allocated: 0, spent: 0, remaining: 0 });
  calcAllocations();
  save();
  renderAll();
  toast(`${name} added!`);
  return true;
}

let pendingDeleteCategoryId = null;

function deleteCategory(id) {
  const category = S.categories.find(c => c.id === id);
  if (!category) return;
  const categorySpending = S.spending.filter(s => s.categoryId === id);
  const hasSpending = categorySpending.length > 0 && categorySpending.some(s => s.amount > 0);

  if (hasSpending) {
    pendingDeleteCategoryId = id;
    const modal = document.getElementById('deleteCategoryModal');
    const content = document.getElementById('deleteCategoryContent');
    let spendingListHtml = '<p style="margin-bottom: 12px;">This category has spending entries:</p><ul style="margin: 0 0 16px 20px; max-height: 200px; overflow-y: auto;">';
    categorySpending.slice(0, 10).forEach(s => { spendingListHtml += `<li style="margin: 6px 0;">${fmt(s.amount)} - ${escapeHtml(s.note || s.categoryName)} (${fmtDate(s.date)})</li>`; });
    if (categorySpending.length > 10) spendingListHtml += `<li><em>... and ${categorySpending.length - 10} more</em></li>`;
    spendingListHtml += '</ul><p style="margin-bottom: 16px; color: var(--red);"><strong>Deleting this category will permanently remove all associated spending entries.</strong></p>';
    if (content) content.innerHTML = spendingListHtml;
    const confirmField = document.getElementById('deleteCategoryConfirmField');
    const confirmInput = document.getElementById('deleteCategoryConfirmInput');
    const confirmBtn = document.getElementById('deleteCategoryConfirmBtn');
    if (confirmField) confirmField.style.display = 'block';
    if (confirmInput) confirmInput.value = '';
    if (confirmBtn) confirmBtn.disabled = true;
    const checkConfirm = () => { if (confirmInput && confirmBtn) confirmBtn.disabled = confirmInput.value.toUpperCase() !== 'CONFIRM'; };
    if (confirmInput) { confirmInput.oninput = checkConfirm; confirmInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !confirmBtn.disabled) { performDeleteCategory(id); closeModal('deleteCategoryModal'); pendingDeleteCategoryId = null; } }); }
    if (confirmBtn) { const newConfirmBtn = confirmBtn.cloneNode(true); confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn); newConfirmBtn.onclick = () => { if (confirmInput && confirmInput.value.toUpperCase() === 'CONFIRM') { performDeleteCategory(id); closeModal('deleteCategoryModal'); pendingDeleteCategoryId = null; } }; }
    const cancelBtn = document.getElementById('deleteCategoryCancelBtn');
    if (cancelBtn) { const newCancelBtn = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn); newCancelBtn.onclick = () => { closeModal('deleteCategoryModal'); pendingDeleteCategoryId = null; }; }
    openModal('deleteCategoryModal');
  } else {
    confirm('Delete Category', `Remove category "${category.name}"?`).then(ok => { if (ok) performDeleteCategory(id); });
  }
}

function performDeleteCategory(id) {
  S.categories = S.categories.filter(c => c.id !== id);
  S.spending = S.spending.filter(s => s.categoryId !== id);
  S.history = S.history.filter(h => h.categoryId !== id);
  S.recurring = S.recurring.filter(r => r.categoryId !== id);
  calcAllocations();
  save();
  renderAll();
  toast('Category deleted');
}

function updateSpending(id, newAmount, newNote, newCategoryId = null) {
  const spendingIndex = S.spending.findIndex(s => s.id === id);
  if (spendingIndex === -1) {
    toast('Spending entry not found', 'error');
    return false;
  }

  const updatedSpending = { ...S.spending[spendingIndex] };
  updatedSpending.amount = newAmount;
  updatedSpending.note = newNote?.trim() || '';

  if (newCategoryId && newCategoryId !== S.spending[spendingIndex].categoryId) {
    const newCat = S.categories.find(c => c.id === newCategoryId);
    if (newCat) {
      updatedSpending.categoryId = newCategoryId;
      updatedSpending.categoryName = newCat.name;
    } else {
      toast('Selected category not found', 'error');
      return false;
    }
  }

  S.spending[spendingIndex] = updatedSpending;

  const historyIndex = S.history.findIndex(h => h.id === id);
  if (historyIndex !== -1) {
    S.history[historyIndex] = {
      ...S.history[historyIndex],
      amount: newAmount,
      note: newNote?.trim() || '',
      categoryId: updatedSpending.categoryId,
      categoryName: updatedSpending.categoryName
    };
  }

  calcAllocations();
  save();
  renderAll();
  toast('Spending updated!');
  return true;
}

async function addSpending(catId, amtStr, note = '') {
  if (!catId) {
    toast('Select a category', 'error');
    return false;
  }

  let amtParsed = parseFormattedNumber(amtStr);
  const amt = parseFloat(amtParsed);

  if (isNaN(amt) || amt < 0) {
    toast('Enter a valid amount', 'error');
    return false;
  }
  if (amt === 0) {
    toast('Amount must be greater than 0', 'error');
    return false;
  }

  const balance = currentBalance();

  if (amt > balance && balance > 0) {
    const ok = await confirm('Warning', `This spending (${fmt(amt)}) exceeds your current balance (${fmt(balance)}). Continue anyway?`);
    if (!ok) return false;
  }

  return proceedAddSpending(catId, amt, note);
}

function proceedAddSpending(catId, amt, note) {
  const cat = S.categories.find(c => c.id === catId);
  if (!cat) {
    toast('Category not found', 'error');
    return false;
  }

  const entry = {
    id: uid(),
    categoryId: catId,
    categoryName: cat.name,
    note: note?.trim() || '',
    amount: amt,
    period: S.currentPeriod,
    date: new Date().toISOString()
  };

  S.spending.push(entry);
  S.history.push({ ...entry });
  calcAllocations();
  save();
  renderAll();
  toast('Spending recorded!');
  return true;
}

function deleteSpending(id) {
  S.spending = S.spending.filter(s => s.id !== id);
  S.history = S.history.filter(h => h.id !== id);
  calcAllocations();
  save();
  renderAll();
  toast('Entry removed');
}

function distributeRemaining() {
  const used = totalPct();
  const rem = 100 - used;
  if (rem <= 0) { toast('Already at 100%', 'error'); return; }
  if (S.categories.length === 0) { toast('Add categories first', 'error'); return; }
  const perCat = rem / S.categories.length;
  const newPercentages = S.categories.map(c => ({ name: c.name, oldPct: c.pct, newPct: Math.round((c.pct + perCat) * 10) / 10 }));
  let totalNewPct = newPercentages.reduce((sum, p) => sum + p.newPct, 0);
  let diff = Math.round((100 - totalNewPct) * 10) / 10;
  if (Math.abs(diff) > 0.01 && newPercentages.length > 0) { newPercentages[newPercentages.length - 1].newPct = Math.round((newPercentages[newPercentages.length - 1].newPct + diff) * 10) / 10; }
  const modal = document.getElementById('distributePreviewModal');
  const content = document.getElementById('distributePreviewContent');
  let previewHtml = '<p style="margin-bottom: 12px;">The remaining allocation will be distributed evenly:</p><table style="width:100%; border-collapse: collapse;">';
  previewHtml += '<tr style="border-bottom: 1px solid var(--border);"><th style="text-align: left; padding: 8px 0;">Category</th><th style="text-align: right; padding: 8px 0;">Current %</th><th style="text-align: right; padding: 8px 0;">New %</th></tr>';
  newPercentages.forEach(p => { previewHtml += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 8px 0;">${escapeHtml(p.name)}</td><td style="text-align: right; padding: 8px 0;">${p.oldPct.toFixed(1)}%</td><td style="text-align: right; padding: 8px 0; font-weight: 600;">${p.newPct.toFixed(1)}%</td></tr>`; });
  previewHtml += `</table><p style="margin-top: 16px; color: var(--green);">Remaining to distribute: ${rem.toFixed(1)}%</p>`;
  if (content) content.innerHTML = previewHtml;
  const confirmBtn = document.getElementById('distributeConfirmBtn');
  const cancelBtn = document.getElementById('distributeCancelBtn');
  const applyDistribution = () => { S.categories.forEach((c, index) => { c.pct = newPercentages[index].newPct; }); calcAllocations(); save(); renderAll(); toast(`Distributed ${rem.toFixed(1)}% across ${S.categories.length} categories`); };
  if (confirmBtn) { const newConfirmBtn = confirmBtn.cloneNode(true); confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn); newConfirmBtn.onclick = () => { applyDistribution(); closeModal('distributePreviewModal'); }; }
  if (cancelBtn) { const newCancelBtn = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn); newCancelBtn.onclick = () => { closeModal('distributePreviewModal'); }; }
  openModal('distributePreviewModal');
}

async function clearAllocations() {
  const ok = await confirm('Clear Allocations', 'Reset all category percentages to 0%?');
  if (!ok) return;
  S.categories.forEach(c => c.pct = 0);
  calcAllocations();
  save();
  renderAll();
  toast('Allocations cleared');
}

function openClearDataModal() {
  const modal = document.getElementById('clearDataModal');
  const confirmInput = document.getElementById('clearDataConfirmInput');
  const confirmBtn = document.getElementById('clearDataConfirmBtn');

  if (!modal || !confirmInput || !confirmBtn) return;

  confirmInput.value = '';
  confirmBtn.disabled = true;
  confirmBtn.classList.add('disabled');

  const newInput = confirmInput.cloneNode(true);
  const newBtn = confirmBtn.cloneNode(true);
  confirmInput.parentNode.replaceChild(newInput, confirmInput);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  const freshInput = document.getElementById('clearDataConfirmInput');
  const freshBtn = document.getElementById('clearDataConfirmBtn');

  if (!freshInput || !freshBtn) return;

  const checkConfirm = () => {
    if (freshInput && freshBtn) {
      const isValid = freshInput.value.trim().toUpperCase() === 'CONFIRM';
      freshBtn.disabled = !isValid;
      if (isValid) {
        freshBtn.classList.remove('disabled');
      } else {
        freshBtn.classList.add('disabled');
      }
    }
  };

  freshInput.oninput = checkConfirm;

  freshInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !freshBtn.disabled) {
      performClearAllData();
      closeModal('clearDataModal');
    }
  });

  freshBtn.onclick = () => {
    if (freshInput.value.trim().toUpperCase() === 'CONFIRM') {
      performClearAllData();
      closeModal('clearDataModal');
    }
  };

  const cancelBtn = document.getElementById('clearDataCancelBtn');
  if (cancelBtn) {
    const freshCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(freshCancel, cancelBtn);
    freshCancel.onclick = () => {
      closeModal('clearDataModal');
      if (freshInput) freshInput.value = '';
      if (freshBtn) freshBtn.disabled = true;
    };
  }

  openModal('clearDataModal');

  setTimeout(() => {
    if (freshInput) freshInput.focus();
  }, 100);
}

function performClearAllData() {
  try {
    const oldTheme = S.theme;
    const oldPresets = S.customPresets;
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome_v2');

    S = {
      ...defaultState(),
      theme: oldTheme,
      customPresets: oldPresets,
      recurring: []
    };

    if (hasSeenWelcome) localStorage.setItem('hasSeenWelcome_v2', hasSeenWelcome);

    localStorage.removeItem(STORE_KEY);
    saveState(S);
    calcAllocations();
    renderAll();
    toast('All data cleared successfully!', 'success');
    clearDirty();
    updateLastSaved();

  } catch (error) {
    console.error('Error clearing data:', error);
    toast('Error clearing data. Please try again.', 'error');
  }
}

/* ══════════════════════ DATA I/O ══════════════════════════ */
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `paycheck-balancer-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Data exported!');
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data && typeof data === 'object') {
        delete data.forecastPrefs;
        S = { ...defaultState(), ...data };
        if (!S.recurring) S.recurring = [];
        if (S.recurring) S.recurring.forEach(r => { if (r.active === undefined) r.active = true; });
        calcAllocations();
        save();
        applyTheme();
        renderAll();
        toast('Data imported!');
      } else { toast('Invalid file format', 'error'); }
    } catch { toast('Error reading file', 'error'); }
    e.target.value = '';
  };
  reader.readAsText(file);
}
function exportCSV() {
  const rows = [['Date', 'Period', 'Category', 'Note', 'Amount']];
  S.history.forEach(e => { rows.push([new Date(e.date).toLocaleDateString(), e.period, e.categoryName, e.note || '', e.amount.toFixed(2)]); });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `paycheck-spending-${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported!');
}

/* ══════════════════════ DRAWER NAVIGATION SETUP ══════════════════════════ */
function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('sideDrawer').classList.remove('open');
  preventBodyScroll(false);
}
function openDrawer() {
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('sideDrawer').classList.add('open');
  preventBodyScroll(true);
}
function switchView(name) {
  const currentView = document.querySelector('.drawer-item.active')?.dataset.view;
  if (currentView && currentView !== name) {
    saveScrollPosition(currentView);
  }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${name}`);
  if (view) { view.classList.add('active'); view.classList.add('view-fade-in'); setTimeout(() => view.classList.remove('view-fade-in'), 300); }
  document.querySelectorAll('.drawer-item').forEach(item => { item.classList.remove('active'); if (item.dataset.view === name) item.classList.add('active'); });
  closeDrawer();
  renderAll();
  const fab = document.getElementById('fab');
  fab.style.display = (name === 'dashboard' || name === 'spend') ? 'flex' : 'none';
}
document.getElementById('menuBtn')?.addEventListener('click', openDrawer);
document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);
document.querySelectorAll('.drawer-item').forEach(item => { item.addEventListener('click', () => switchView(item.dataset.view)); });

/* ══════════════════════ SIDE DRAWER SWIPE TO CLOSE ══════════════════════════ */
let touchStartXDrawer = 0;
let touchCurrentXDrawer = 0;
let isDraggingDrawer = false;

function initDrawerSwipe() {
  const drawer = document.getElementById('sideDrawer');
  if (!drawer) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        if (drawer.classList.contains('open')) {
          enableDrawerSwipe();
        } else {
          disableDrawerSwipe();
        }
      }
    });
  });
  
  observer.observe(drawer, { attributes: true });
}

function enableDrawerSwipe() {
  const drawer = document.getElementById('sideDrawer');
  if (!drawer) return;
  
  drawer.addEventListener('touchstart', onDrawerTouchStart, { passive: false });
  drawer.addEventListener('touchmove', onDrawerTouchMove, { passive: false });
  drawer.addEventListener('touchend', onDrawerTouchEnd);
}

function disableDrawerSwipe() {
  const drawer = document.getElementById('sideDrawer');
  if (!drawer) return;
  
  drawer.removeEventListener('touchstart', onDrawerTouchStart);
  drawer.removeEventListener('touchmove', onDrawerTouchMove);
  drawer.removeEventListener('touchend', onDrawerTouchEnd);
  drawer.style.transform = '';
}

function onDrawerTouchStart(e) {
  touchStartXDrawer = e.touches[0].clientX;
  isDraggingDrawer = true;
  const drawer = e.currentTarget;
  drawer.style.transition = 'none';
  drawer.style.willChange = 'transform';
}

function onDrawerTouchMove(e) {
  if (!isDraggingDrawer) return;
  touchCurrentXDrawer = e.touches[0].clientX;
  const deltaX = touchCurrentXDrawer - touchStartXDrawer;
  const drawer = e.currentTarget;
  
  if (deltaX < 0) {
    const translateX = Math.max(-280, deltaX);
    drawer.style.transform = `translateX(${translateX}px)`;
  }
  e.preventDefault();
}

function onDrawerTouchEnd(e) {
  if (!isDraggingDrawer) return;
  isDraggingDrawer = false;
  const drawer = e.currentTarget;
  drawer.style.transition = '';
  drawer.style.willChange = '';
  const deltaX = touchCurrentXDrawer - touchStartXDrawer;
  
  if (deltaX < -50) {
    closeDrawer();
  } else {
    drawer.style.transform = '';
  }
  
  touchStartXDrawer = 0;
  touchCurrentXDrawer = 0;
}

/* ══════════════════════ KEYBOARD SHORTCUTS ══════════════════════════ */
function handleKeyboardShortcuts(e) {
  const activeElement = document.activeElement;
  const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');

  if (isInputFocused) return;

  const key = e.key.toLowerCase();

  switch (key) {
    case 'd': switchView('dashboard'); break;
    case 'c': switchView('categories'); break;
    case 's': switchView('spend'); break;
    case 'h': switchView('history'); break;
    case 'r': switchView('recurring'); break;
    case 'v': switchView('savings'); break;
    case 'a': switchView('analytics'); break;
    case 't': switchView('settings'); break;
    case 'n':
      document.getElementById('newPeriodBtn')?.click();
      break;
    default: break;
  }
}

document.addEventListener('keydown', handleKeyboardShortcuts);

/* ══════════════════════ UNSAVED CHANGES WARNING ══════════════════════════ */
window.addEventListener('beforeunload', (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});

/* ══════════════════════ FAB ══════════════════════════ */
const fab = document.getElementById('fab');
if (fab) { fab.addEventListener('click', openSpendModal); }

/* ══════════════════════ WELCOME MODAL ══════════════════════════ */
function showWelcomeModal() { document.getElementById('welcomeModal').classList.add('open'); }
function hideWelcomeModal() { document.getElementById('welcomeModal').classList.remove('open'); localStorage.setItem('hasSeenWelcome_v2', 'true'); }
if (!localStorage.getItem('hasSeenWelcome_v2')) { setTimeout(showWelcomeModal, 300); }
document.getElementById('welcomeGetStarted')?.addEventListener('click', hideWelcomeModal);
document.getElementById('welcomeLoadDemo')?.addEventListener('click', () => { loadDemoData(); hideWelcomeModal(); });

/* ══════════════════════ CLOSE MODALS ON BACKDROP ══════════════ */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

/* ══════════════════════ CONTRIBUTE MODAL EVENT LISTENERS ══════════════════════ */
document.getElementById('contributeSubmit')?.addEventListener('click', submitContribution);
document.getElementById('contributeCancel')?.addEventListener('click', () => {
  closeModal('contributeModal');
  currentContributingGoalId = null;
});

/* ══════════════════════ SERVICE WORKER ══════════════════════════ */
if ('serviceWorker' in navigator) {
  const swCode = `const CACHE='pb-v10';self.addEventListener('install',e=>{self.skipWaiting();});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(e.request.url.startsWith('https://cdn.')){const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return resp;})));});`;
  const blob = new Blob([swCode], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  navigator.serviceWorker.register(url).catch(() => { });
}

/* ══════════════════════ MOBILE & TOUCH OPTIMIZATIONS ══════════════════════════ */

function preventBodyScroll(shouldPrevent) {
  if (shouldPrevent) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.classList.add('modal-open');
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.classList.remove('modal-open');
  }
}

function scrollInputIntoView(inputElement) {
  if (!inputElement) return;
  setTimeout(() => {
    inputElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, 300);
}

document.body.addEventListener('touchmove', function(e) {
  const target = e.target;
  const view = target.closest('.view');
  if (view) {
    const scrollTop = view.scrollTop;
    const scrollHeight = view.scrollHeight;
    const clientHeight = view.clientHeight;
    
    if (scrollTop === 0 && e.touches[0].clientY > 0) {
      e.preventDefault();
    }
  }
}, { passive: false });

function updateSafeAreas() {
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    const safeTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-top').trim();
    statusBar.style.height = safeTop;
  }
}

window.addEventListener('resize', updateSafeAreas);
window.addEventListener('orientationchange', updateSafeAreas);
updateSafeAreas();

function enhanceTouchFeedback() {
  document.addEventListener('touchstart', function(e) {
    const target = e.target.closest('.cat-item, .spend-item, .goal-item, .recurring-item, .btn, .icon-btn, .drawer-item');
    if (target) {
      target.classList.add('touch-active');
      setTimeout(() => target.classList.remove('touch-active'), 150);
    }
  });
}

window.addEventListener('popstate', () => {
  const openModals = document.querySelectorAll('.modal-overlay.open, .confirm-overlay.open, .welcome-overlay.open');
  openModals.forEach(modal => modal.classList.remove('open'));
  if (document.getElementById('sideDrawer')?.classList.contains('open')) {
    closeDrawer();
  }
  preventBodyScroll(false);
});

function fixNumberInputs() {
  document.querySelectorAll('input[inputmode="decimal"]').forEach(input => {
    if (input.getAttribute('type') !== 'tel') {
      input.setAttribute('type', 'tel');
    }
  });
}

// Initialize all mobile enhancements
document.addEventListener('DOMContentLoaded', () => {
  enhanceTouchFeedback();
  initDrawerSwipe();
  fixNumberInputs();
  updateSafeAreas();
});

/* ══════════════════════ INITIAL RENDER ══════════════════════════ */
autoProcessRecurring();
renderDashboard();