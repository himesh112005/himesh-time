/**
 * Tasks Management Module for Himesh Time
 * Handles pre-seeded recurring habits, dynamic temporary tasks,
 * auto-population for each day, and completion tracking.
 */

// Master default recurring routines
const DEFAULT_RECURRING_TEMPLATES = [
  // Spiritual & Routine
  { id: 'tmpl_aarti_morn', title: '🙏 Morning Aarti', category: 'Spiritual', order: 1 },
  { id: 'tmpl_pooja_morn', title: '🙏 Morning Pooja', category: 'Spiritual', order: 2 },
  { id: 'tmpl_vachan_amrut', title: '📖 Vachan Amrut', category: 'Spiritual', order: 3 },
  { id: 'tmpl_swamini_vato', title: '📖 Swamini Vato', category: 'Spiritual', order: 4 },
  { id: 'tmpl_aarti_eve', title: '🙏 Evening Aarti', category: 'Spiritual', order: 5 },
  { id: 'tmpl_diary_night', title: '📓 My Diary (Night Reflection)', category: 'Spiritual', order: 6 },
  { id: 'tmpl_chesta_night', title: '🛕 Chesta (Night)', category: 'Spiritual', order: 7 },

  // Learning & Skill Building
  { id: 'tmpl_duolingo', title: '🦉 Duolingo Practice', category: 'Study', order: 8 },
  { id: 'tmpl_gate_prep', title: '📚 GATE Prep / Study Block', category: 'Study', order: 9 },
  { id: 'tmpl_book_reading', title: '📕 Book Reading', category: 'Study', order: 10 },

  // Career & Projects
  { id: 'tmpl_internship', title: '💼 Internship Work', category: 'Career', order: 11 },
  { id: 'tmpl_startup', title: '🚀 Startup Work', category: 'Career', order: 12 }
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

  // Seed default templates if first time
  async ensureTemplatesSeeded() {
    const existingTemplates = await this.db.getTemplates();
    if (!existingTemplates || existingTemplates.length === 0) {
      await this.db.setTemplatesBatch(DEFAULT_RECURRING_TEMPLATES);
      return DEFAULT_RECURRING_TEMPLATES;
    }
    return existingTemplates;
  }

  // Reset templates back to factory default
  async resetToDefaultTemplates() {
    await this.db.setTemplatesBatch(DEFAULT_RECURRING_TEMPLATES);
    return DEFAULT_RECURRING_TEMPLATES;
  }

  // Populate tasks for a given date from recurring templates if not already populated
  async populateDailyTasks(targetDateStr) {
    await this.ensureTemplatesSeeded();
    const existingDayTasks = await this.db.getTasksByDate(targetDateStr);

    if (existingDayTasks.length === 0) {
      // Load templates and create today's recurring tasks
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

      await this.db.addTasksBatch(newTasks);
      return newTasks;
    }

    return existingDayTasks;
  }

  // Create a new task (either recurring template + today's instance, or temporary today-only)
  async addNewTask({ title, category, isRecurring, targetDateStr }) {
    const dateStr = targetDateStr || this.getLocalDateString();
    const taskId = this.generateId(isRecurring ? 'rec' : 'tmp');

    // If it is recurring, also save it as a permanent template
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

  // Delete a task instance
  async deleteTask(taskId) {
    return await this.db.deleteTask(taskId);
  }

  // Delete a recurring template permanently and future instances
  async deleteRecurringTemplate(templateId) {
    await this.db.deleteTemplate(templateId);
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
