'use strict';

// --- Элементы страницы ---
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const displayEl = document.getElementById('display');
const keysEl = document.getElementById('keys');
const historyListEl = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

const OPERATORS = ['+', '−', '×', '÷', '^'];
const MAX_HISTORY = 12;

let expression = '';
let lastExpression = '';
let justEvaluated = false;
const history = [];

// --- Вычисления ---

// Переводим красивые символы в обычную математику для JS
function toMath(raw) {
  return raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√/g, 'Math.sqrt')
    .replace(/²/g, '**2')
    .replace(/\^/g, '**');
}

// Дописываем недостающие закрывающие скобки
function balance(raw) {
  const open = (raw.match(/\(/g) || []).length;
  const close = (raw.match(/\)/g) || []).length;
  return raw + ')'.repeat(Math.max(0, open - close));
}

// Защищённое вычисление: если что-то не так — возвращаем null
function safeEvaluate(raw) {
  if (!raw || raw.trim() === '') return null;

  let math = toMath(raw);

  // Если выражение начинается с минуса, добавляем ноль: "−5^2" -> "0-5**2"
  if (math.startsWith('-')) math = '0' + math;

  const open = (math.match(/\(/g) || []).length;
  const close = (math.match(/\)/g) || []).length;
  if (close > open) return null;
  math += ')'.repeat(open - close);

  // Разрешаем только цифры, операторы, точки, экспоненту, пробелы и Math.sqrt
  const leftover = math.replace(/Math\.sqrt/g, '');
  if (!/^[0-9+\-*/().eE\s]+$/.test(leftover)) return null;

  try {
    const value = Function('"use strict"; return (' + math + ');')();
    if (typeof value !== 'number' || !isFinite(value) || Number.isNaN(value)) return null;
    return clean(value);
  } catch (error) {
    return null;
  }
}

// Убираем "хвосты" плавающей точки: 0.30000000000000004 -> 0.3
function clean(value) {
  if (Math.abs(value) >= 1e15) return value;
  return Math.round(value * 1e10) / 1e10;
}

function format(value) {
  if (Math.abs(value) >= 1e15) return value.toExponential(6);
  return String(value);
}

// --- Ввод с кнопок ---

function appendDigit(digit) {
  const last = expression.slice(-1);

  if (expression === '0') {
    expression = digit;
    return;
  }
  if (last === ')' || last === '²') {
    expression += '×';
  }
  expression += digit;
}

function appendDot() {
  const segment = expression.split(/[+−×÷^()²]/).pop();
  if (segment.includes('.')) return;

  const last = expression.slice(-1);
  if (last === ')' || last === '²') {
    expression += '×0.';
  } else if (segment === '') {
    expression += '0.';
  } else {
    expression += '.';
  }
}

function appendOpen() {
  const last = expression.slice(-1);
  if (/[0-9)²]/.test(last)) {
    expression += '×';
  }
  expression += '(';
}

function appendClose() {
  const open = (expression.match(/\(/g) || []).length;
  const close = (expression.match(/\)/g) || []).length;
  const last = expression.slice(-1);

  if (open > close && /[0-9)²]/.test(last)) {
    expression += ')';
  }
}

function appendSqrt() {
  const last = expression.slice(-1);
  if (/[0-9)²]/.test(last)) {
    expression += '×';
  }
  expression += '√(';
}

function appendSquare() {
  if (/[0-9)²]$/.test(expression)) {
    expression += '²';
  }
}

function appendOperator(op) {
  const last = expression.slice(-1);

  if (expression === '' || last === '(') {
    if (op === '−') expression += '−';
    return;
  }

  if (last === '.') {
    expression = expression.slice(0, -1);
  }

  const newLast = expression.slice(-1);
  if (OPERATORS.includes(newLast)) {
    expression = expression.slice(0, -1) + op;
    return;
  }

  expression += op;
}

function handleInput(value) {
  if (justEvaluated) {
    const canContinue =
      OPERATORS.includes(value) || value === ')' || value === '²';
    if (!canContinue) expression = '';
    justEvaluated = false;
  }

  if (/^[0-9]$/.test(value)) {
    appendDigit(value);
  } else if (value === '.') {
    appendDot();
  } else if (value === '(') {
    appendOpen();
  } else if (value === ')') {
    appendClose();
  } else if (value === '√(') {
    appendSqrt();
  } else if (value === '²') {
    appendSquare();
  } else if (OPERATORS.includes(value)) {
    appendOperator(value);
  }

  update();
}

// --- Управление ---

function clearAll() {
  expression = '';
  lastExpression = '';
  justEvaluated = false;
  update();
}

function backspace() {
  expression = expression.slice(0, -1);
  justEvaluated = false;
  update();
}

function equals() {
  if (expression === '') return;

  const value = safeEvaluate(expression);

  if (value === null) {
    showError();
    return;
  }

  const text = format(value);
  addHistory(balance(expression), text);

  lastExpression = balance(expression);
  expression = text;
  justEvaluated = true;

  expressionEl.textContent = lastExpression + ' =';
  resultEl.textContent = text;
  resultEl.classList.remove('is-error');
  popResult();
}

function showError() {
  expressionEl.textContent = balance(expression) + ' =';
  resultEl.textContent = 'Ошибка';
  resultEl.classList.add('is-error');

  displayEl.classList.remove('shake');
  void displayEl.offsetWidth;
  displayEl.classList.add('shake');

  expression = '';
  lastExpression = '';
  justEvaluated = true;
}

function update() {
  resultEl.classList.remove('is-error');
  expressionEl.textContent = expression === '' ? '0' : expression;

  if (expression === '') {
    resultEl.textContent = '0';
    return;
  }

  // Показываем результат только когда выражение похоже на законченное
  if (!/[0-9)²]$/.test(expression)) {
    resultEl.textContent = '';
    return;
  }

  const value = safeEvaluate(expression);
  resultEl.textContent = value === null ? '' : format(value);
}

function popResult() {
  resultEl.classList.remove('pop');
  void resultEl.offsetWidth;
  resultEl.classList.add('pop');
}

// --- История вычислений ---

function addHistory(expr, result) {
  history.unshift({ expr, result });
  if (history.length > MAX_HISTORY) history.pop();
  renderHistory();
}

function renderHistory() {
  historyListEl.innerHTML = '';

  if (history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history__empty';
    empty.textContent = 'Пока пусто — посчитай что-нибудь!';
    historyListEl.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  history.forEach((item) => {
    const row = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history__item';
    button.title = 'Подставить результат';

    const expr = document.createElement('span');
    expr.className = 'history__expr';
    expr.textContent = item.expr + ' =';

    const result = document.createElement('span');
    result.className = 'history__result';
    result.textContent = item.result;

    button.append(expr, result);
    button.addEventListener('click', () => {
      expression = item.result;
      lastExpression = item.expr;
      justEvaluated = true;
      expressionEl.textContent = item.expr + ' =';
      resultEl.textContent = item.result;
      resultEl.classList.remove('is-error');
      popResult();
    });

    row.append(button);
    fragment.append(row);
  });

  historyListEl.append(fragment);
}

// --- Нажатия на кнопки ---

function makeRipple(button, event) {
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = size + 'px';
  ripple.style.height = size + 'px';
  ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
  ripple.style.top = event.clientY - rect.top - size / 2 + 'px';

  button.append(ripple);
  setTimeout(() => ripple.remove(), 600);
}

keysEl.addEventListener('click', (event) => {
  const button = event.target.closest('.key');
  if (!button) return;

  makeRipple(button, event);

  const action = button.dataset.action;
  if (action === 'clear') {
    clearAll();
  } else if (action === 'backspace') {
    backspace();
  } else if (action === 'equals') {
    equals();
  } else if (button.dataset.value) {
    handleInput(button.dataset.value);
  }
});

clearHistoryBtn.addEventListener('click', () => {
  history.length = 0;
  renderHistory();
});

// --- Управление с клавиатуры ---

document.addEventListener('keydown', (event) => {
  const key = event.key;

  if (/^[0-9]$/.test(key)) {
    handleInput(key);
  } else if (key === '.' || key === ',') {
    handleInput('.');
  } else if (key === '+') {
    handleInput('+');
  } else if (key === '-') {
    handleInput('−');
  } else if (key === '*') {
    handleInput('×');
  } else if (key === '/') {
    event.preventDefault();
    handleInput('÷');
  } else if (key === '^') {
    handleInput('^');
  } else if (key === '(') {
    handleInput('(');
  } else if (key === ')') {
    handleInput(')');
  } else if (key === 'Enter' || key === '=') {
    event.preventDefault();
    equals();
  } else if (key === 'Backspace') {
    event.preventDefault();
    backspace();
  } else if (key === 'Escape') {
    clearAll();
  }
});

// --- Старт ---
update();
renderHistory();
