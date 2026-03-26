/* ─── State ──────────────────────────────────────────────────── */
let tasks  = JSON.parse(localStorage.getItem('tasks_v2') || '[]');
let filter = 'all';
let activeTag = null;

/* ─── DOM refs ───────────────────────────────────────────────── */
const taskInput      = document.getElementById('task-input');
const addBtn         = document.getElementById('add-btn');
const taskList       = document.getElementById('task-list');
const footer         = document.getElementById('footer');
const countLabel     = document.getElementById('count-label');
const clearBtn       = document.getElementById('clear-btn');
const statusFilters  = document.getElementById('status-filters');
const tagFilters     = document.getElementById('tag-filters');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');
const themeToggle    = document.getElementById('theme-toggle');
const prioritySelect = document.getElementById('priority-select');
const dueInput       = document.getElementById('due-input');
const tagInput       = document.getElementById('tag-input');

/* ─── Persistence ────────────────────────────────────────────── */
function save() { localStorage.setItem('tasks_v2', JSON.stringify(tasks)); }

/* ─── Theme ──────────────────────────────────────────────────── */
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

/* ─── Tag normaliser ─────────────────────────────────────────── */
function normaliseTag(raw) {
  return raw.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-') || null;
}

/* ─── Add Task ───────────────────────────────────────────────── */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) { taskInput.focus(); return; }

  const tag = normaliseTag(tagInput.value);
  tasks.unshift({
    id:       Date.now(),
    text,
    done:     false,
    priority: prioritySelect.value,
    due:      dueInput.value || null,
    tag:      tag
  });

  taskInput.value     = '';
  dueInput.value      = '';
  tagInput.value      = '';
  prioritySelect.value = 'none';
  save();
  render();
  taskInput.focus();
}

/* ─── Toggle / Remove ────────────────────────────────────────── */
function toggle(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  render();
  if (t.done) launchConfetti();
}

function remove(id) {
  const li = document.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.style.animation = 'none';
    li.style.transition = 'opacity .18s, transform .18s';
    li.style.opacity = '0';
    li.style.transform = 'translateX(20px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      save(); render();
    }, 180);
  }
}

/* ─── Render ─────────────────────────────────────────────────── */
function render() {
  // Collect all tags for the tag filter bar
  const allTags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
  renderTagFilters(allTags);

  let filtered = tasks.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return t.done;
    return true;
  });
  if (activeTag) filtered = filtered.filter(t => t.tag === activeTag);

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.innerHTML = `<div class="empty-icon">${filter === 'done' ? '✅' : '📋'}</div>
      ${filter === 'done' ? 'No completed tasks yet.' :
        filter === 'active' ? 'Nothing left — great job! 🎉' : 'No tasks yet. Add one above!'}`;
    taskList.appendChild(li);
  } else {
    filtered.forEach((task, idx) => renderTask(task, idx));
  }

  // Progress
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `${done} / ${total} done`;

  // Footer
  const active = tasks.filter(t => !t.done).length;
  const hasDone = tasks.filter(t => t.done).length > 0;
  if (tasks.length > 0) {
    footer.style.display = 'flex';
    countLabel.textContent = active === 1 ? '1 task left' : `${active} tasks left`;
    clearBtn.style.visibility = hasDone ? 'visible' : 'hidden';
  } else {
    footer.style.display = 'none';
  }
}

function renderTask(task, idx) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.done ? ' done' : '');
  li.setAttribute('draggable', 'true');
  li.setAttribute('data-id', task.id);
  li.setAttribute('data-priority', task.priority);
  li.style.animationDelay = idx < 10 ? `${idx * 0.03}s` : '0s';

  // Drag handle
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.innerHTML = '&#8942;&#8942;'; // ⋮⋮
  handle.title = 'Drag to reorder';

  // Check
  const check = document.createElement('div');
  check.className = 'task-check' + (task.done ? ' checked' : '');
  check.addEventListener('click', () => toggle(task.id));

  // Body
  const body = document.createElement('div');
  body.className = 'task-body';

  const textEl = document.createElement('span');
  textEl.className = 'task-text';
  textEl.textContent = task.text;
  body.appendChild(textEl);

  // Meta badges
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  if (task.priority && task.priority !== 'none') {
    const b = document.createElement('span');
    b.className = `badge badge-priority-${task.priority}`;
    const icons = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
    b.textContent = icons[task.priority] || task.priority;
    meta.appendChild(b);
  }

  if (task.due) {
    const b = document.createElement('span');
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(task.due + 'T00:00:00');
    const overdue = !task.done && due < today;
    b.className = 'badge badge-due' + (overdue ? ' overdue' : '');
    b.textContent = (overdue ? '⚠️ ' : '📅 ') + formatDate(task.due);
    meta.appendChild(b);
  }

  if (task.tag) {
    const b = document.createElement('span');
    b.className = 'badge badge-tag';
    b.textContent = '#' + task.tag;
    b.style.cursor = 'pointer';
    b.title = `Filter by #${task.tag}`;
    b.addEventListener('click', () => {
      activeTag = activeTag === task.tag ? null : task.tag;
      render();
    });
    meta.appendChild(b);
  }

  if (meta.children.length) body.appendChild(meta);

  // Delete
  const del = document.createElement('button');
  del.className = 'delete-btn';
  del.innerHTML = '&times;';
  del.title = 'Delete';
  del.addEventListener('click', () => remove(task.id));

  li.appendChild(handle);
  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(del);

  // Drag events
  li.addEventListener('dragstart', onDragStart);
  li.addEventListener('dragover',  onDragOver);
  li.addEventListener('dragleave', onDragLeave);
  li.addEventListener('drop',      onDrop);
  li.addEventListener('dragend',   onDragEnd);

  taskList.appendChild(li);
}

function renderTagFilters(tags) {
  tagFilters.innerHTML = '';
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-chip' + (activeTag === tag ? ' active' : '');
    btn.textContent = '#' + tag;
    btn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      render();
    });
    tagFilters.appendChild(btn);
  });
}

/* ─── Date helpers ───────────────────────────────────────────── */
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─── Drag & Drop ────────────────────────────────────────────── */
let dragId = null;

function taskIndexById(id) { return tasks.findIndex(t => t.id === id); }

function onDragStart(e) {
  dragId = parseInt(this.getAttribute('data-id'));
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
  this.classList.add('drag-over');
}
function onDragLeave() { this.classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  const targetId = parseInt(this.getAttribute('data-id'));
  if (dragId === targetId) return;
  const fromIdx = taskIndexById(dragId);
  const toIdx   = taskIndexById(targetId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = tasks.splice(fromIdx, 1);
  tasks.splice(toIdx, 0, moved);
  save(); render();
}
function onDragEnd() {
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}

/* ─── Status filter buttons ──────────────────────────────────── */
statusFilters.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    statusFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

/* ─── Clear completed ────────────────────────────────────────── */
clearBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  save(); render();
});

/* ─── Add listeners ──────────────────────────────────────────── */
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

/* ─── Confetti ───────────────────────────────────────────────── */
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let animating = false;

function launchConfetti() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#fb923c','#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa'];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 4 + 2,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - .5) * .2,
      drift: (Math.random() - .5) * 2,
      life:  1
    });
  }
  if (!animating) animateConfetti();
}

function animateConfetti() {
  animating = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.y     += p.speed;
    p.x     += p.drift;
    p.angle += p.spin;
    p.life  -= 0.008;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });
  if (particles.length > 0) requestAnimationFrame(animateConfetti);
  else { animating = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

/* ─── Init ───────────────────────────────────────────────────── */
render();