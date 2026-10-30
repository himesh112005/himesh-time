/**
 * Tasks Management Module for Himesh Time
 * Handles routine habits, ad-hoc tasks, day auto-population,
 * permanent vs day-only deletion, and permanence toggling.
 */

// Master default routines (clean naming, customizable & deletable)
const DEFAULT_RECURRING_TEMPLATES = [
  // Spiritual & Routine
  { id: 'tmpl_aarti_morn', title: 'Morning Aarti', category: 'Spiritual', order: 1 },
  { id: 'tmpl_pooja_morn', title: 'Morning Pooja', category: 'Spiritual', order: 2 },
  { id: 'tmpl_vachan_amrut', title: 'Vachan Amrut', category: 'Spiritual', order: 3 },
  { id: 'tmpl_swamini_vato', title: 'Swamini Vato', category: 'Spiritual', order: 4 },
  { id: 'tmpl_aarti_eve', title: 'Evening Aarti', category: 'Spiritual', order: 5 },
  { id: 'tmpl_diary_night', title: 'Night Diary & Reflection', category: 'Spiritual', order: 6 },
  { id: 'tmpl_chesta_night', title: 'Chesta (Night)', category: 'Spiritual', order: 7 },

  // Learning & Skill Building
  { id: 'tmpl_duolingo', title: 'Duolingo Practice', category: 'Study', order: 8 },
  { id: 'tmpl_gate_prep', title: 'GATE Prep & Practice', category: 'Study', order: 9 },
  { id: 'tmpl_book_reading', title: 'Book Reading', category: 'Study', order: 10 },

  // Career & Projects
  { id: 'tmpl_internship', title: 'Internship Work', category: 'Career', order: 11 },
  { id: 'tmpl_startup', title: 'Startup Development', category: 'Career', order: 12 }
];

class TaskManager {
  constructor(db) {
    this.db = db;
  }

  // Format Date to YYYY-MM-DD (local time)
  getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Generate unique ID
  generateId(prefix = 'task') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Seed default templates if first time setup
  async ensureTemplatesSeeded() {
    const isSeeded = await this.db.getSetting('templates_seeded', false);
    if (!isSeeded) {
      await this.db.setTemplatesBatch(DEFAULT_RECURRING_TEMPLATES);
      await this.db.setSetting('templates_seeded', true);
      return DEFAULT_RECURRING_TEMPLATES;
    }
    return await this.db.getTemplates();
  }

  // Reset templates back to default routines
  async resetToDefaultTemplates() {
    await this.db.setTemplatesBatch(DEFAULT_RECURRING_TEMPLATES);
    await this.db.setSetting('templates_seeded', true);
    return DEFAULT_RECURRING_TEMPLATES;
  }

  // Populate tasks for a given date from active recurring templates if day not yet populated
  async populateDailyTasks(targetDateStr) {
    await this.ensureTemplatesSeeded();
    const isDayInitialized = await this.db.getSetting(`day_init_${targetDateStr}`, false);
    const existingDayTasks = await this.db.getTasksByDate(targetDateStr);

    if (!isDayInitialized && existingDayTasks.length === 0) {
      const templates = await this.db.getTemplates();
      const newTasks = templates.map((tmpl) => ({
        id: this.generateId('rec'),
        templateId: tmpl.id,
        title: tmpl.title,
        category: tmpl.category,
        isRecurring: true,
        isCompleted: false,
        targetDate: targetDateStr,
        completedAt: null,
        createdAt: new Date().toISOString(),
        order: tmpl.order || 99
      }));

      if (newTasks.length > 0) {
        await this.db.addTasksBatch(newTasks);
      }
      await this.db.setSetting(`day_init_${targetDateStr}`, true);
      return newTasks;
    }

    return existingDayTasks;
  }

  // Create a new task (either permanent recurring habit or single-day task)
  async addNewTask({ title, category, isRecurring, targetDateStr }) {
    const dateStr = targetDateStr || this.getLocalDateString();
    const taskId = this.generateId(isRecurring ? 'rec' : 'tmp');

    let templateId = null;
    if (isRecurring) {
      templateId = this.generateId('tmpl');
      await this.db.saveTemplate({
        id: templateId,
        title: title.trim(),
        category: category || 'Personal',
        order: 99
      });
    }

    const newTask = {
      id: taskId,
      templateId: templateId,
      title: title.trim(),
      category: category || (isRecurring ? 'Personal' : 'Temporary'),
      isRecurring: !!isRecurring,
      isCompleted: false,
      targetDate: dateStr,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: 100
    };

    await this.db.addTask(newTask);
    return newTask;
  }

  // Toggle task completion
  async toggleTask(task) {
    const updated = {
      ...task,
      isCompleted: !task.isCompleted,
      completedAt: !task.isCompleted ? new Date().toISOString() : null
    };
    await this.db.updateTask(updated);
    return updated;
  }

  // Update task details (title, category)
  async updateTaskDetails(taskId, { title, category }) {
    const all = await this.db.getAllTasks();
    const task = all.find(t => t.id === taskId);
    if (!task) return null;

    task.title = title.trim();
    if (category) task.category = category;
    await this.db.updateTask(task);

    // If it has a templateId, update the template too so future days reflect the change
    if (task.templateId) {
      const templates = await this.db.getTemplates();
      const tmpl = templates.find(t => t.id === task.templateId);
      if (tmpl) {
        tmpl.title = title.trim();
        if (category) tmpl.category = category;
        await this.db.saveTemplate(tmpl);
      }
    }
    return task;
  }

  // Make an existing single-day task permanent (repeats every day)
  async makeTaskPermanent(taskId) {
    const all = await this.db.getAllTasks();
    const task = all.find(t => t.id === taskId);
    if (!task) return null;

    const templateId = this.generateId('tmpl');
    await this.db.saveTemplate({
      id: templateId,
      title: task.title,
      category: task.category === 'Temporary' ? 'Personal' : task.category,
      order: 99
    });

    task.isRecurring = true;
    task.templateId = templateId;
    if (task.category === 'Temporary') task.category = 'Personal';
    await this.db.updateTask(task);
    return task;
  }

  // Remove permanence from a task (keeps today's task, but stops repeating on future days)
  async removeTaskPermanence(taskId) {
    const all = await this.db.getAllTasks();
    const task = all.find(t => t.id === taskId);
    if (!task) return null;

    if (task.templateId) {
      await this.db.deleteTemplate(task.templateId);
    }

    task.isRecurring = false;
    task.templateId = null;
    await this.db.updateTask(task);
    return task;
  }

  // Delete task for this day only
  async deleteTaskForToday(taskId) {
    return await this.db.deleteTask(taskId);
  }

  // Delete task permanently (removes today's task, all future scheduled instances, and template)
  async deleteTaskPermanently(taskId, currentDateStr) {
    const all = await this.db.getAllTasks();
    const task = all.find(t => t.id === taskId);
    if (!task) {
      return await this.db.deleteTask(taskId);
    }

    if (task.templateId) {
      // Remove template so it never generates again
      await this.db.deleteTemplate(task.templateId);
      // Remove any existing instances from today onwards
      await this.db.deleteTasksByTemplateId(task.templateId, currentDateStr);
    }

    // Ensure the current task instance is removed
    return await this.db.deleteTask(taskId);
  }

  // Calculate day completion stats
  calculateStats(tasks) {
    if (!tasks || tasks.length === 0) {
      return { total: 0, completed: 0, pending: 0, percentage: 0 };
    }
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const percentage = Math.round((completed / total) * 100);
    return { total, completed, pending, percentage };
  }

  // Group tasks by category
  groupTasksByCategory(tasks) {
    const categoryOrder = ['Spiritual', 'Study', 'Career', 'Personal', 'Temporary'];
    const groups = {};

    categoryOrder.forEach(cat => { groups[cat] = []; });

    tasks.forEach(task => {
      const cat = task.category || 'Personal';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(task);
    });

    // Sort within categories by completion status then order
    for (const cat in groups) {
      groups[cat].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return (a.order || 99) - (b.order || 99);
      });
    }

    return groups;
  }
}

window.taskManager = new TaskManager(window.appDB);
