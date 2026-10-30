/**
 * UI Renderer & DOM Interaction Module for Himesh Time
 * Strictly follows design standards: Solid base + single accent, clean borders,
 * SVG icons, high touch targets (44px), permanent vs single-day task management.
 */

const ICONS = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`
};

class UIRenderer {
  constructor() {
    this.currentDateStr = window.taskManager.getLocalDateString();
    this.activeFilter = 'All';
    this.activeTab = 'today';
    this.userName = 'Himesh';
    this.currentTasks = [];
    this.currentGoal = null;
    this.expandedCategories = new Set();
    this.pendingDeleteTask = null;
  }

  async init() {
    const savedName = await window.appDB.getSetting('userName', 'Himesh');
    this.userName = savedName;

    const savedTheme = await window.appDB.getSetting('theme', 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.bindEvents();
    await this.refreshAll();
  }

  async setDate(dateStr) {
    this.currentDateStr = dateStr;
    await this.refreshAll();
  }

  async refreshAll() {
    this.renderHeader();
    await this.loadAndRenderGoal();
    await this.loadAndRenderTasks();
  }

  renderHeader() {
    const greetingEl = document.getElementById('header-greeting');
    const dateEl = document.getElementById('header-date');
    const dateNavDisplay = document.getElementById('nav-date-display');
    const todayBadge = document.getElementById('today-badge');

    if (greetingEl) {
      greetingEl.innerHTML = `Jai Swaminarayan, <span class="greeting-accent">${this.escapeHtml(this.userName)} Bhai</span>`;
    }

    const d = new Date(this.currentDateStr + 'T00:00:00');
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = d.toLocaleDateString(undefined, options);

    if (dateEl) dateEl.textContent = dateFormatted;
    if (dateNavDisplay) dateNavDisplay.textContent = dateFormatted;

    const todayStr = window.taskManager.getLocalDateString();
    if (todayBadge) {
      todayBadge.style.display = (this.currentDateStr === todayStr) ? 'inline-flex' : 'none';
    }
  }

  async loadAndRenderGoal() {
    const goalCard = document.getElementById('goal-hero-card');
    if (!goalCard) return;

    this.currentGoal = await window.goalManager.getGoal(this.currentDateStr);

    if (!this.currentGoal || !this.currentGoal.goalText) {
      goalCard.innerHTML = `
        <div class="empty-goal-prompt" id="btn-open-goal-modal">
          <div class="empty-goal-text">
            <span class="empty-goal-title">Set Today's Key Goal</span>
            <span class="empty-goal-subtitle">Focus on your primary objective for today.</span>
          </div>
          <button class="empty-goal-btn" type="button">
            ${ICONS.plus}
            <span>Set Goal</span>
          </button>
        </div>
      `;
      document.getElementById('btn-open-goal-modal')?.addEventListener('click', () => {
        this.openGoalModal();
      });
      return;
    }

    const formattedTime = this.currentGoal.targetTime 
      ? window.goalManager.formatTime12h(this.currentGoal.targetTime)
      : null;

    goalCard.innerHTML = `
      <div class="goal-hero-header">
        <div class="goal-badge">Today's Focus</div>
        ${formattedTime ? `<div class="goal-time-chip">${ICONS.clock} <span>Target: ${formattedTime}</span></div>` : ''}
      </div>
      <div class="goal-content-box">
        <button class="goal-checkbox-btn ${this.currentGoal.isCompleted ? 'checked' : ''}" id="btn-toggle-goal" aria-label="Toggle Goal Completion">
          ${ICONS.check}
        </button>
        <div class="goal-text-container">
          <div class="goal-text ${this.currentGoal.isCompleted ? 'completed' : ''}">
            ${this.escapeHtml(this.currentGoal.goalText)}
          </div>
        </div>
      </div>
      <div class="goal-actions">
        <button class="goal-action-btn" id="btn-edit-goal">${ICONS.edit} <span>Edit</span></button>
        <button class="goal-action-btn delete" id="btn-delete-goal">${ICONS.trash} <span>Remove</span></button>
      </div>
    `;

    document.getElementById('btn-toggle-goal')?.addEventListener('click', async () => {
      await window.goalManager.toggleGoal(this.currentDateStr);
      await this.loadAndRenderGoal();
      this.showToast(this.currentGoal.isCompleted ? 'Goal marked active' : 'Goal completed');
    });

    document.getElementById('btn-edit-goal')?.addEventListener('click', () => {
      this.openGoalModal(this.currentGoal);
    });

    document.getElementById('btn-delete-goal')?.addEventListener('click', async () => {
      if (confirm('Remove today\'s focus goal?')) {
        await window.goalManager.deleteGoal(this.currentDateStr);
        await this.loadAndRenderGoal();
        this.showToast('Goal removed');
      }
    });
  }

  async loadAndRenderTasks() {
    this.currentTasks = await window.taskManager.populateDailyTasks(this.currentDateStr);
    this.renderProgressRing();
    this.renderFilterChips();
    this.renderTaskListDOM();
  }

  renderProgressRing() {
    const stats = window.taskManager.calculateStats(this.currentTasks);
    
    const ringCircle = document.getElementById('progress-ring-circle');
    const ringText = document.getElementById('progress-ring-text');
    const fractionText = document.getElementById('progress-fraction');
    const barFill = document.getElementById('progress-bar-fill');
    const quoteText = document.getElementById('progress-quote');

    const radius = 26;
    const circumference = 2 * Math.PI * radius; // ~163.36
    const offset = circumference - (stats.percentage / 100) * circumference;

    if (ringCircle) ringCircle.style.strokeDashoffset = offset;
    if (ringText) ringText.textContent = `${stats.percentage}%`;
    if (fractionText) fractionText.textContent = `${stats.completed}/${stats.total} Done`;
    if (barFill) barFill.style.width = `${stats.percentage}%`;

    if (quoteText) {
      if (stats.percentage === 100 && stats.total > 0) {
        quoteText.textContent = 'All daily habits completed. Dedication achieved.';
      } else if (stats.percentage >= 75) {
        quoteText.textContent = 'Nearly done. Finish your remaining habits strong.';
      } else if (stats.percentage >= 50) {
        quoteText.textContent = 'Halfway mark achieved. Continue steady progress.';
      } else if (stats.percentage > 0) {
        quoteText.textContent = 'Daily progress underway. Take one habit at a time.';
      } else {
        quoteText.textContent = 'Track your daily habits with focus.';
      }
    }

    if (stats.percentage === 100 && stats.total > 0) {
      this.triggerConfetti();
    }
  }

  renderFilterChips() {
    const container = document.getElementById('filter-chips-container');
    if (!container) return;

    const categories = ['All', 'Spiritual', 'Study', 'Career', 'Personal', 'Temporary'];
    const groups = window.taskManager.groupTasksByCategory(this.currentTasks);

    let html = '';
    categories.forEach(cat => {
      let count = 0;
      let label = cat;
      if (cat === 'All') {
        count = this.currentTasks.length;
      } else if (cat === 'Temporary') {
        label = 'Single Day';
        count = this.currentTasks.filter(t => !t.isRecurring || t.category === 'Temporary').length;
      } else {
        count = groups[cat] ? groups[cat].length : 0;
      }
      
      const isActive = (this.activeFilter === cat) ? 'active' : '';
      html += `
        <button class="filter-chip ${isActive}" data-filter="${cat}">
          <span>${label}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-filter');
        this.renderFilterChips();
        this.renderTaskListDOM();
      });
    });
  }

  renderTaskListDOM() {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    if (!this.currentTasks || this.currentTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.empty}</div>
          <div class="empty-state-title">No tasks for this day</div>
          <div class="empty-state-desc">Add daily routine habits or single-day tasks to begin tracking.</div>
        </div>
      `;
      return;
    }

    let tasksToRender = [...this.currentTasks];

    if (this.activeFilter === 'Temporary') {
      tasksToRender = tasksToRender.filter(t => !t.isRecurring || t.category === 'Temporary');
    } else if (this.activeFilter !== 'All') {
      tasksToRender = tasksToRender.filter(t => t.category === this.activeFilter);
    }

    if (tasksToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.info}</div>
          <div class="empty-state-title">No tasks under this filter</div>
          <div class="empty-state-desc">There are no tasks currently in this category.</div>
        </div>
      `;
      return;
    }

    const groups = window.taskManager.groupTasksByCategory(tasksToRender);
    let html = '';

    const categoryOrder = ['Spiritual', 'Study', 'Career', 'Personal', 'Temporary'];
    const FOLD_LIMIT = 6;

    categoryOrder.forEach(cat => {
      const tasksInCat = groups[cat] || [];
      if (tasksInCat.length === 0) return;

      const completedCount = tasksInCat.filter(t => t.isCompleted).length;
      const isExpanded = this.expandedCategories.has(cat);
      const visibleTasks = isExpanded ? tasksInCat : tasksInCat.slice(0, FOLD_LIMIT);
      const remainingCount = tasksInCat.length - FOLD_LIMIT;

      const categoryLabel = cat === 'Temporary' ? 'Single Day Tasks' : cat;

      html += `
        <div class="category-group" data-category="${cat}">
          <div class="category-group-header">
            <span class="category-group-title">
              <span>${categoryLabel}</span>
            </span>
            <span class="category-group-count">${completedCount}/${tasksInCat.length}</span>
          </div>
          <div class="tasks-list">
      `;

      visibleTasks.forEach(task => {
        const isChecked = task.isCompleted;
        const isRecurring = !!task.isRecurring && task.category !== 'Temporary';

        html += `
          <div class="task-item-card ${isChecked ? 'completed' : ''}" data-task-id="${task.id}">
            <button class="task-checkbox ${isChecked ? 'checked' : ''}" data-action="toggle" aria-label="Toggle task">
              ${ICONS.check}
            </button>
            <div class="task-details">
              <div class="task-title ${isChecked ? 'completed' : ''}">
                ${this.escapeHtml(task.title)}
              </div>
              <div class="task-tags-row">
                <span class="task-category-pill">${task.category}</span>
                ${isRecurring 
                  ? `<button class="task-repeat-badge" data-action="toggle-permanent" title="Click to stop repeating daily">${ICONS.repeat} Daily routine</button>`
                  : `<button class="task-repeat-badge adhoc" data-action="toggle-permanent" title="Click to make permanent daily habit">+ Make permanent</button>`
                }
              </div>
            </div>
            <div class="task-actions">
              <button class="task-action-btn" data-action="edit" title="Edit Task">${ICONS.edit}</button>
              <button class="task-action-btn delete" data-action="delete" title="Delete Task">${ICONS.trash}</button>
            </div>
          </div>
        `;
      });

      html += `</div>`;

      // Show fold button if category has more items than FOLD_LIMIT
      if (tasksInCat.length > FOLD_LIMIT) {
        html += `
          <button class="show-more-btn" data-toggle-category="${cat}">
            <span>${isExpanded ? 'Show less' : `Show ${remainingCount} more`}</span>
            ${isExpanded ? ICONS.chevronUp : ICONS.chevronDown}
          </button>
        `;
      }

      html += `</div>`;
    });

    container.innerHTML = html;

    // Attach Category Fold toggles
    container.querySelectorAll('[data-toggle-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-toggle-category');
        if (this.expandedCategories.has(cat)) {
          this.expandedCategories.delete(cat);
        } else {
          this.expandedCategories.add(cat);
        }
        this.renderTaskListDOM();
      });
    });

    // Attach Event Listeners to task items
    container.querySelectorAll('.task-item-card').forEach(card => {
      const taskId = card.getAttribute('data-task-id');
      const task = this.currentTasks.find(t => t.id === taskId);
      if (!task) return;

      // Completion toggle
      card.querySelector('[data-action="toggle"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.taskManager.toggleTask(task);
        await this.loadAndRenderTasks();
        this.showToast(task.isCompleted ? 'Habit reopened' : 'Habit completed');
      });

      // Permanence toggle
      card.querySelector('[data-action="toggle-permanent"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (task.isRecurring) {
          if (confirm(`Stop repeating "${task.title}" daily?\n(It will remain on today's schedule, but won't repeat on future days.)`)) {
            await window.taskManager.removeTaskPermanence(task.id);
            await this.loadAndRenderTasks();
            this.showToast('Removed from daily repeating habits');
          }
        } else {
          await window.taskManager.makeTaskPermanent(task.id);
          await this.loadAndRenderTasks();
          this.showToast('Converted to permanent daily routine');
        }
      });

      // Edit task
      card.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditTaskModal(task);
      });

      // Delete task (supports both today-only and permanent deletion)
      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteTaskModal(task);
      });
    });
  }

  openAddTaskModal() {
    const modal = document.getElementById('modal-add-task');
    const heading = document.getElementById('modal-task-heading');
    const inputId = document.getElementById('input-task-id');
    const inputTitle = document.getElementById('input-task-title');
    const selectCat = document.getElementById('select-task-category');
    const toggleRecurring = document.getElementById('toggle-task-recurring');
    const submitBtn = document.getElementById('btn-submit-task');

    if (heading) heading.textContent = 'Add Task';
    if (inputId) inputId.value = '';
    if (inputTitle) inputTitle.value = '';
    if (selectCat) selectCat.value = (this.activeFilter !== 'All' && this.activeFilter !== 'Temporary') ? this.activeFilter : 'Personal';
    if (toggleRecurring) toggleRecurring.checked = true; // Default to repeatable routine as requested
    if (submitBtn) submitBtn.querySelector('span').textContent = 'Add Task';

    modal?.classList.add('active');
    setTimeout(() => inputTitle?.focus(), 150);
  }

  openEditTaskModal(task) {
    const modal = document.getElementById('modal-add-task');
    const heading = document.getElementById('modal-task-heading');
    const inputId = document.getElementById('input-task-id');
    const inputTitle = document.getElementById('input-task-title');
    const selectCat = document.getElementById('select-task-category');
    const toggleRecurring = document.getElementById('toggle-task-recurring');
    const submitBtn = document.getElementById('btn-submit-task');

    if (heading) heading.textContent = 'Edit Task';
    if (inputId) inputId.value = task.id;
    if (inputTitle) inputTitle.value = task.title;
    if (selectCat) selectCat.value = task.category || 'Personal';
    if (toggleRecurring) toggleRecurring.checked = !!task.isRecurring;
    if (submitBtn) submitBtn.querySelector('span').textContent = 'Save Changes';

    modal?.classList.add('active');
    setTimeout(() => inputTitle?.focus(), 150);
  }

  openDeleteTaskModal(task) {
    this.pendingDeleteTask = task;
    const modal = document.getElementById('modal-delete-task');
    const promptEl = document.getElementById('delete-task-prompt');
    const actionsStack = document.getElementById('delete-actions-stack');
    if (!modal || !promptEl || !actionsStack) return;

    if (task.isRecurring) {
      promptEl.innerHTML = `<strong>"${this.escapeHtml(task.title)}"</strong> is part of your daily routine.<br>Do you want to delete it only for today, or remove it permanently from all days?`;
      actionsStack.innerHTML = `
        <button type="button" class="btn-secondary" id="btn-del-today">
          <span>Delete for Today Only</span>
        </button>
        <button type="button" class="btn-danger" id="btn-del-permanent">
          <span>Delete Permanently (All Days)</span>
        </button>
        <button type="button" class="btn-secondary" id="btn-del-cancel">
          <span>Cancel</span>
        </button>
      `;

      document.getElementById('btn-del-today')?.addEventListener('click', async () => {
        await window.taskManager.deleteTaskForToday(task.id);
        this.closeModal('modal-delete-task');
        await this.loadAndRenderTasks();
        this.showToast('Task removed for today');
      });

      document.getElementById('btn-del-permanent')?.addEventListener('click', async () => {
        await window.taskManager.deleteTaskPermanently(task.id, this.currentDateStr);
        this.closeModal('modal-delete-task');
        await this.loadAndRenderTasks();
        this.showToast('Task deleted permanently from routine');
      });

      document.getElementById('btn-del-cancel')?.addEventListener('click', () => {
        this.closeModal('modal-delete-task');
      });
    } else {
      promptEl.innerHTML = `Delete <strong>"${this.escapeHtml(task.title)}"</strong>?`;
      actionsStack.innerHTML = `
        <button type="button" class="btn-danger" id="btn-del-single">
          <span>Delete Task</span>
        </button>
        <button type="button" class="btn-secondary" id="btn-del-cancel">
          <span>Cancel</span>
        </button>
      `;

      document.getElementById('btn-del-single')?.addEventListener('click', async () => {
        await window.taskManager.deleteTaskForToday(task.id);
        this.closeModal('modal-delete-task');
        await this.loadAndRenderTasks();
        this.showToast('Task deleted');
      });

      document.getElementById('btn-del-cancel')?.addEventListener('click', () => {
        this.closeModal('modal-delete-task');
      });
    }

    modal.classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  openGoalModal(existingGoal = null) {
    const modal = document.getElementById('modal-goal');
    const inputText = document.getElementById('input-goal-text');
    const inputTime = document.getElementById('input-goal-time');

    if (inputText) inputText.value = existingGoal ? existingGoal.goalText : '';
    if (inputTime) inputTime.value = existingGoal ? (existingGoal.targetTime || '') : '';

    modal?.classList.add('active');
    setTimeout(() => inputText?.focus(), 150);
  }

  async openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    const inputName = document.getElementById('input-user-name');
    const selectTheme = document.getElementById('select-theme');

    if (inputName) inputName.value = this.userName;
    if (selectTheme) {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      selectTheme.value = currentTheme;
    }

    modal?.classList.add('active');
  }

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#d97706', '#fbbf24', '#ffffff', '#a1a1aa'];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        r: Math.random() * 5 + 2,
        d: Math.random() * 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: (Math.random() * 0.07) + .05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.7) * 12 - 2,
        gravity: 0.25
      });
    }

    let animationFrame;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.tiltAngle += p.tiltAngleIncremental;
        p.tilt = Math.sin(p.tiltAngle) * 10;

        if (p.y < canvas.height) alive = true;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });

      if (alive) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${ICONS.check} <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = '0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  bindEvents() {
    document.getElementById('fab-add-task')?.addEventListener('click', () => {
      this.openAddTaskModal();
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.openSettingsModal();
    });

    document.getElementById('btn-prev-day')?.addEventListener('click', () => {
      const d = new Date(this.currentDateStr + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      this.setDate(window.taskManager.getLocalDateString(d));
    });

    document.getElementById('btn-next-day')?.addEventListener('click', () => {
      const d = new Date(this.currentDateStr + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      this.setDate(window.taskManager.getLocalDateString(d));
    });

    document.getElementById('nav-date-display')?.addEventListener('click', () => {
      this.setDate(window.taskManager.getLocalDateString(new Date()));
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        if (modalId) this.closeModal(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.classList.remove('active');
        }
      });
    });

    // Add or Edit Task form submission
    document.getElementById('form-add-task')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskId = document.getElementById('input-task-id')?.value;
      const title = document.getElementById('input-task-title')?.value;
      const category = document.getElementById('select-task-category')?.value;
      const isRecurring = document.getElementById('toggle-task-recurring')?.checked;

      if (!title || !title.trim()) return;

      if (taskId) {
        // Edit existing task
        await window.taskManager.updateTaskDetails(taskId, { title, category });
        const existingTask = this.currentTasks.find(t => t.id === taskId);
        if (existingTask) {
          if (isRecurring && !existingTask.isRecurring) {
            await window.taskManager.makeTaskPermanent(taskId);
          } else if (!isRecurring && existingTask.isRecurring) {
            await window.taskManager.removeTaskPermanence(taskId);
          }
        }
        this.showToast('Task updated');
      } else {
        // Create new task
        await window.taskManager.addNewTask({
          title,
          category,
          isRecurring,
          targetDateStr: this.currentDateStr
        });
        this.showToast(isRecurring ? 'Permanent habit added to daily schedule' : 'Single day task added');
      }

      this.closeModal('modal-add-task');
      await this.loadAndRenderTasks();
    });

    // Goal form submission
    document.getElementById('form-goal')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const goalText = document.getElementById('input-goal-text')?.value;
      const targetTime = document.getElementById('input-goal-time')?.value;

      if (!goalText || !goalText.trim()) return;

      await window.goalManager.saveGoal({
        targetDateStr: this.currentDateStr,
        goalText,
        targetTime
      });

      this.closeModal('modal-goal');
      await this.loadAndRenderGoal();
      this.showToast('Daily goal saved');
    });

    // Settings form submission
    document.getElementById('form-settings')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('input-user-name')?.value.trim();
      const newTheme = document.getElementById('select-theme')?.value;

      if (newName) {
        this.userName = newName;
        await window.appDB.setSetting('userName', newName);
      }

      await window.appDB.setSetting('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);

      this.closeModal('modal-settings');
      this.renderHeader();
      this.showToast('Preferences saved');
    });

    // Restore default templates button
    document.getElementById('btn-reset-templates')?.addEventListener('click', async () => {
      if (confirm('Restore default daily routine habits?')) {
        await window.taskManager.resetToDefaultTemplates();
        this.closeModal('modal-settings');
        await this.loadAndRenderTasks();
        this.showToast('Default routines restored');
      }
    });

    // Export data
    document.getElementById('btn-export-data')?.addEventListener('click', async () => {
      const data = await window.appDB.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Himesh_Time_Backup_${this.currentDateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Data backup downloaded');
    });

    // Clear all data
    document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
      if (confirm('Wipe all tasks, goals, and history? This cannot be undone.')) {
        await window.appDB.clearAllData();
        await window.taskManager.ensureTemplatesSeeded();
        this.closeModal('modal-settings');
        await this.refreshAll();
        this.showToast('All data cleared');
      }
    });

    // Bottom Navigation switching
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (tab === 'today') {
          this.setDate(window.taskManager.getLocalDateString());
        } else if (tab === 'templates') {
          this.openAddTaskModal();
        } else if (tab === 'settings') {
          this.openSettingsModal();
        }
      });
    });
  }
}

window.uiRenderer = new UIRenderer();
