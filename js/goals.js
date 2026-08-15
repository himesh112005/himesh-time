/**
 * Daily Goal Management Module for Himesh Time
 * Handles the single focused Daily Goal note with optional Target Time / Deadline.
 */

class GoalManager {
  constructor(db) {
    this.db = db;
  }

  // Format HH:mm (24h) to user-friendly "hh:mm AM/PM"
  formatTime12h(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  // Get goal for a specific date
  async getGoal(dateStr) {
    return await this.db.getGoalByDate(dateStr);
  }

  // Save or update goal for a specific date
  async saveGoal({ targetDateStr, goalText, targetTime }) {
    if (!goalText || !goalText.trim()) return null;
    
    const existing = await this.getGoal(targetDateStr);
    const goal = {
      targetDate: targetDateStr,
      goalText: goalText.trim(),
      targetTime: targetTime ? targetTime.trim() : null,
      isCompleted: existing ? existing.isCompleted : false,
      completedAt: existing ? existing.completedAt : null,
      updatedAt: new Date().toISOString()
    };

    await this.db.saveGoal(goal);
    return goal;
  }

  // Toggle goal completion
  async toggleGoal(dateStr) {
    const goal = await this.getGoal(dateStr);
    if (!goal) return null;

    goal.isCompleted = !goal.isCompleted;
    goal.completedAt = goal.isCompleted ? new Date().toISOString() : null;
    goal.updatedAt = new Date().toISOString();

    await this.db.saveGoal(goal);
    return goal;
  }

  // Delete/Clear goal
  async deleteGoal(dateStr) {
    return await this.db.deleteGoal(dateStr);
  }
}

window.goalManager = new GoalManager(window.appDB);
