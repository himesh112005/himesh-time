/**
 * UI Renderer & DOM Interaction Module for Himesh Time
 * Renders the Today view, Daily Goal card, Task checklist, modals, and animations.
 */

class UIRenderer {
  constructor() {
    this.currentDateStr = window.taskManager.getLocalDateString();
    this.activeFilter = 'All';
    this.activeTab = 'today';
    this.userName = 'Himesh';
    this.currentTasks = [];
    this.currentGoal = null;
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
      greetingEl.innerHTML = `Jai Swaminarayan, <span class="greeting-accent">${this.escapeHtml(this.userName)} Bhai</span> 🙏`;
    }

    const d = new Date(this.currentDateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const dateFormatted = d.toLocaleDateString(undefined, options);

    if (dateEl) dateEl.textContent = dateFormatted;
    if (dateNavDisplay) dateNavDisplay.textContent = dateFormatted;

    const todayStr = window.taskManager.getLocalDateString();
    if (todayBadge) {
      todayBadge.style.display = (this.currentDateStr === todayStr) ? 'inline-block' : 'none';
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
            <span class="empty-goal-title">🎯 Set Today's Key Goal & Time</span>
            <span class="empty-goal-subtitle">Focus on your #1 priority for today</span>
          </div>
          <button class="empty-goal-btn">
            <span>+ Set Goal</span>
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
        <div class="goal-badge">🎯 Today's Main Goal</div>
        ${formattedTime ? `<div class="goal-time-chip">⏰ By ${formattedTime}</div>` : ''}
      </div>
      <div class="goal-content-box">
        <button class="goal-checkbox-btn ${this.currentGoal.isCompleted ? 'checked' : ''}" id="btn-toggle-goal" aria-label="Toggle Goal Completion">
          ✓
        </button>
        <div class="goal-text-container">
          <div class="goal-text ${this.currentGoal.isCompleted ? 'completed' : ''}">
            ${this.escapeHtml(this.currentGoal.goalText)}
          </div>
        </div>
      </div>
      <div class="goal-actions">
        <button class="goal-action-btn" id="btn-edit-goal">✏️ Edit</button>
        <button class="goal-action-btn" id="btn-delete-goal">🗑️ Remove</button>
      </div>
    `;

    document.getElementById('btn-toggle-goal')?.addEventListener('click', async () => {
      await window.goalManager.toggleGoal(this.currentDateStr);
      await this.loadAndRenderGoal();
      this.showToast(this.currentGoal.isCompleted ? 'Goal marked active' : '🎉 Goal completed!', '🎯');
    });

    document.getElementById('btn-edit-goal')?.addEventListener('click', () => {
      this.openGoalModal(this.currentGoal);
    });

    document.getElementById('btn-delete-goal')?.addEventListener('click', async () => {
      if (confirm('Remove today\'s goal?')) {
        await window.goalManager.deleteGoal(this.currentDateStr);
        await this.loadAndRenderGoal();
        this.showToast('Goal removed', '🗑️');
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
        quoteText.textContent = '🌟 All routines completed! Outstanding dedication!';
      } else if (stats.percentage >= 75) {
        quoteText.textContent = '🔥 Almost there! Keep up the great momentum!';
      } else if (stats.percentage >= 50) {
        quoteText.textContent = '💪 Halfway done! Keep going strong!';
      } else if (stats.percentage > 0) {
        quoteText.textContent = '🌱 Good start! One routine at a time.';
      } else {
        quoteText.textContent = '✨ Start your daily routine with focus.';
      }
    }

    if (stats.percentage === 100 && stats.total > 0) {
      this.triggerConfetti();
    }
  }

  renderFilterChips() {
    const container = document.getElementById('filter-chips-container');
    if (!container) return;

    const categories = ['All', 'Spiritual', 'Study', 'Career', 'Temporary'];
    const groups = window.taskManager.groupTasksByCategory(this.currentTasks);

    let html = '';
    categories.forEach(cat => {
      let count = 0;
      if (cat === 'All') {
        count = this.currentTasks.length;
      } else if (cat === 'Temporary') {
        count = this.currentTasks.filter(t => !t.isRecurring || t.category === 'Temporary').length;
      } else {
        count = groups[cat] ? groups[cat].length : 0;
      }
      
      const isActive = (this.activeFilter === cat) ? 'active' : '';
      html += `
        <button class="filter-chip ${isActive}" data-filter="${cat}">
          <span>${cat}</span>
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
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No tasks for today</div>
          <div class="empty-state-desc">Tap the + button below to add your routines or ad-hoc tasks.</div>
        </div>
      `;
      return;
    }

    const categoryIcons = {
      Spiritual: '🙏',
      Study: '📚',
      Career: '💼',
      Personal: '🌟',
      Temporary: '🏷️'
    };

    let tasksToRender = [...this.currentTasks];

    if (this.activeFilter === 'Temporary') {
      tasksToRender = tasksToRender.filter(t => !t.isRecurring || t.category === 'Temporary');
    } else if (this.activeFilter !== 'All') {
      tasksToRender = tasksToRender.filter(t => t.category === this.activeFilter);
    }

    if (tasksToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No ${this.activeFilter} tasks</div>
          <div class="empty-state-desc">There are no tasks currently under this view.</div>
        </div>
      `;
      return;
    }

    const groups = window.taskManager.groupTasksByCategory(tasksToRender);
    let html = '';

    const categoryOrder = ['Spiritual', 'Study', 'Career', 'Personal', 'Temporary'];

    categoryOrder.forEach(cat => {
      const tasksInCat = groups[cat] || [];
      if (tasksInCat.length === 0) return;

      const completedCount = tasksInCat.filter(t => t.isCompleted).length;

      html += `
        <div class="category-group">
          <div class="category-group-header">
            <span class="category-group-title ${cat.toLowerCase()}">
              ${categoryIcons[cat] || '📌'} ${cat}
            </span>
            <span class="category-group-count">${completedCount}/${tasksInCat.length}</span>
          </div>
          <div class="tasks-list">
      `;

      tasksInCat.forEach(task => {
        const isChecked = task.isCompleted;
        const isTemporary = !task.isRecurring || task.category === 'Temporary';
        const catClass = (task.category || 'personal').toLowerCase();

        html += `
          <div class="task-item-card ${isChecked ? 'completed' : ''}" data-task-id="${task.id}">
            <button class="task-checkbox ${isChecked ? 'checked' : ''}" data-action="toggle" aria-label="Toggle task">
              ✓
            </button>
            <div class="task-details">
              <div class="task-title ${isChecked ? 'completed' : ''}">
                ${this.escapeHtml(task.title)}
              </div>
              <div class="task-tags-row">
                <span class="task-category-pill ${catClass}">${task.category}</span>
                ${isTemporary ? `<span class="temp-tag-badge">⚡ [Temporary]</span>` : ''}
              </div>
            </div>
            <div class="task-actions">
              <button class="task-delete-btn" data-action="delete" title="Delete Task">✕</button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach Event Listeners to cards
    container.querySelectorAll('.task-item-card').forEach(card => {
      const taskId = card.getAttribute('data-task-id');
      const task = this.currentTasks.find(t => t.id === taskId);
      if (!task) return;

      card.querySelector('[data-action="toggle"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.taskManager.toggleTask(task);
        await this.loadAndRenderTasks();
        this.showToast(task.isCompleted ? 'Routine reopened' : '✅ Routine completed!', '✨');
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${task.title}"?`)) {
          await window.taskManager.deleteTask(taskId);
          await this.loadAndRenderTasks();
          this.showToast('Task deleted', '🗑️');
        }
      });
    });
  }

  openAddTaskModal() {
    const modal = document.getElementById('modal-add-task');
    const inputTitle = document.getElementById('input-task-title');
    const selectCat = document.getElementById('select-task-category');
    const toggleRecurring = document.getElementById('toggle-task-recurring');

    if (inputTitle) inputTitle.value = '';
    if (selectCat) selectCat.value = (this.activeFilter !== 'All' && this.activeFilter !== 'Temporary') ? this.activeFilter : 'Personal';
    if (toggleRecurring) toggleRecurring.checked = false;

    modal?.classList.add('active');
    setTimeout(() => inputTitle?.focus(), 150);
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
    const colors = ['#f59e0b', '#38bdf8', '#34d399', '#c084fc', '#ef4444', '#fbbf24'];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        r: Math.random() * 6 + 3,
        d: Math.random() * 75,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: (Math.random() * 0.07) + .05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14 - 3,
        gravity: 0.28
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
        p.tilt = Math.sin(p.tiltAngle) * 12;

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

  showToast(message, icon = 'ℹ️') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2400);
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

    document.getElementById('form-add-task')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('input-task-title').value;
      const category = document.getElementById('select-task-category').value;
      const isRecurring = document.getElementById('toggle-task-recurring').checked;

      if (!title || !title.trim()) return;

      await window.taskManager.addNewTask({
        title,
        category,
        isRecurring,
        targetDateStr: this.currentDateStr
      });

      this.closeModal('modal-add-task');
      await this.loadAndRenderTasks();
      this.showToast(isRecurring ? 'Recurring routine added!' : 'Temporary task added for today!', isRecurring ? '🔄' : '⚡');
    });

    document.getElementById('form-goal')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const goalText = document.getElementById('input-goal-text').value;
      const targetTime = document.getElementById('input-goal-time').value;

      if (!goalText || !goalText.trim()) return;

      await window.goalManager.saveGoal({
        targetDateStr: this.currentDateStr,
        goalText,
        targetTime
      });

      this.closeModal('modal-goal');
      await this.loadAndRenderGoal();
      this.showToast('Daily Goal saved!', '🎯');
    });

    document.getElementById('form-settings')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('input-user-name').value.trim();
      const newTheme = document.getElementById('select-theme').value;

      if (newName) {
        this.userName = newName;
        await window.appDB.setSetting('userName', newName);
      }

      await window.appDB.setSetting('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);

      this.closeModal('modal-settings');
      this.renderHeader();
      this.showToast('Settings updated', '⚙️');
    });

    document.getElementById('btn-reset-templates')?.addEventListener('click', async () => {
      if (confirm('Reset recurring routine templates back to default 12 habits?')) {
        await window.taskManager.resetToDefaultTemplates();
        this.closeModal('modal-settings');
        await this.loadAndRenderTasks();
        this.showToast('Routine templates reset to defaults', '🔄');
      }
    });

    document.getElementById('btn-export-data')?.addEventListener('click', async () => {
      const data = await window.appDB.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Himesh_Time_Backup_${this.currentDateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Backup downloaded successfully', '📥');
    });

    document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
      if (confirm('⚠️ WARNING: This will erase all tasks, goals, and history. Are you sure?')) {
        await window.appDB.clearAllData();
        await window.taskManager.ensureTemplatesSeeded();
        this.closeModal('modal-settings');
        await this.refreshAll();
        this.showToast('All data wiped and refreshed', '🧹');
      }
    });

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
