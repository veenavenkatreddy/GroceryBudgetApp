const mongoose = require('mongoose');
const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');
const Audit = require('../models/auditModel');

class HistoryTracker {
  // Track budget modifications
  async trackBudgetChange(budgetId, userId, changeType, changes) {
    try {
      const timestamp = new Date();
      const historyEntry = {
        budgetId,
        userId,
        changeType, // 'created', 'updated', 'deleted', 'item_added', 'item_removed'
        changes,
        timestamp
      };

      // In a production app, you might want to store this in a separate History collection
      // For now, we'll add it to the budget document
      await Budget.findByIdAndUpdate(budgetId, {
        $push: {
          history: {
            $each: [historyEntry],
            $position: 0,
            $slice: 50 // Keep only last 50 history entries
          }
        }
      });

      return historyEntry;
    } catch (error) {
      console.error('Error tracking budget change:', error);
      return null;
    }
  }

  // Get budget history with detailed changes
  async getBudgetHistory(budgetId, userId) {
    try {
      const budget = await Budget.findOne({
        _id: budgetId,
        userId: userId
      }).select('history');

      if (!budget) {
        return [];
      }

      return budget.history || [];
    } catch (error) {
      console.error('Error fetching budget history:', error);
      return [];
    }
  }

  // Analyze spending trends over time
  async analyzeSpendingTrends(userId, periodInDays = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodInDays);

      // Get all budgets for the user in the period
      const budgets = await Budget.find({
        userId,
        createdAt: { $gte: startDate }
      });

      // Get all items for these budgets
      const budgetIds = budgets.map(b => b._id);
      const items = await Item.find({
        budgetId: { $in: budgetIds },
        purchaseDate: { $gte: startDate }
      }).populate('categoryId');

      // Group by week
      const weeklySpending = {};
      const categoryTrends = {};

      items.forEach(item => {
        const weekStart = this.getWeekStart(item.purchaseDate);
        const weekKey = weekStart.toISOString().split('T')[0];
        const categoryName = item.categoryId.name;

        // Weekly total
        if (!weeklySpending[weekKey]) {
          weeklySpending[weekKey] = 0;
        }
        weeklySpending[weekKey] += item.price * item.quantity;

        // Category trends
        if (!categoryTrends[categoryName]) {
          categoryTrends[categoryName] = {};
        }
        if (!categoryTrends[categoryName][weekKey]) {
          categoryTrends[categoryName][weekKey] = 0;
        }
        categoryTrends[categoryName][weekKey] += item.price * item.quantity;
      });

      // Calculate averages and trends
      const weeks = Object.keys(weeklySpending).sort();
      const weeklyAverage = weeks.length > 0
        ? Object.values(weeklySpending).reduce((a, b) => a + b, 0) / weeks.length
        : 0;

      // Identify trend direction
      let trend = 'stable';
      if (weeks.length >= 2) {
        const firstHalf = weeks.slice(0, Math.floor(weeks.length / 2));
        const secondHalf = weeks.slice(Math.floor(weeks.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, week) => sum + weeklySpending[week], 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, week) => sum + weeklySpending[week], 0) / secondHalf.length;
        
        if (secondHalfAvg > firstHalfAvg * 1.1) {
          trend = 'increasing';
        } else if (secondHalfAvg < firstHalfAvg * 0.9) {
          trend = 'decreasing';
        }
      }

      return {
        periodInDays,
        weeklySpending,
        weeklyAverage,
        trend,
        categoryTrends,
        totalItems: items.length,
        totalSpent: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
    } catch (error) {
      console.error('Error analyzing spending trends:', error);
      return null;
    }
  }

  // Get week start date (Monday)
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  // Compare current period with previous period
  async comparePeriods(userId, currentBudgetId) {
    try {
      const currentBudget = await Budget.findById(currentBudgetId);
      if (!currentBudget) return null;

      // Find previous budget
      const previousBudget = await Budget.findOne({
        userId,
        'period.end': { $lt: currentBudget.period.start },
        isActive: false
      }).sort('-period.end');

      if (!previousBudget) {
        return {
          hasPreviousPeriod: false,
          message: 'No previous budget period found for comparison'
        };
      }

      // Get items for both periods
      const [currentItems, previousItems] = await Promise.all([
        Item.find({ budgetId: currentBudgetId }).populate('categoryId'),
        Item.find({ budgetId: previousBudget._id }).populate('categoryId')
      ]);

      // Calculate totals
      const currentTotal = currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const previousTotal = previousItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Category comparison
      const categoryComparison = {};
      
      // Process current items
      currentItems.forEach(item => {
        const category = item.categoryId.name;
        if (!categoryComparison[category]) {
          categoryComparison[category] = { current: 0, previous: 0 };
        }
        categoryComparison[category].current += item.price * item.quantity;
      });

      // Process previous items
      previousItems.forEach(item => {
        const category = item.categoryId.name;
        if (!categoryComparison[category]) {
          categoryComparison[category] = { current: 0, previous: 0 };
        }
        categoryComparison[category].previous += item.price * item.quantity;
      });

      // Calculate changes
      Object.keys(categoryComparison).forEach(category => {
        const data = categoryComparison[category];
        data.change = data.current - data.previous;
        data.changePercent = data.previous > 0
          ? ((data.current - data.previous) / data.previous) * 100
          : data.current > 0 ? 100 : 0;
      });

      return {
        hasPreviousPeriod: true,
        currentPeriod: {
          budget: currentBudget,
          totalSpent: currentTotal,
          itemCount: currentItems.length
        },
        previousPeriod: {
          budget: previousBudget,
          totalSpent: previousTotal,
          itemCount: previousItems.length
        },
        comparison: {
          totalChange: currentTotal - previousTotal,
          totalChangePercent: previousTotal > 0
            ? ((currentTotal - previousTotal) / previousTotal) * 100
            : currentTotal > 0 ? 100 : 0,
          categoryComparison
        }
      };
    } catch (error) {
      console.error('Error comparing periods:', error);
      return null;
    }
  }

  // Get complete audit trail for a user
  async getUserAuditTrail(userId, options = {}) {
    try {
      return await Audit.getUserActivity(userId, options);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      return { audits: [], total: 0 };
    }
  }

  // Get budget-specific audit trail
  async getBudgetAuditTrail(budgetId, userId) {
    try {
      const audits = await Audit.find({
        userId,
        entityType: 'budget',
        entityId: budgetId
      }).sort('-timestamp').limit(50);

      return audits;
    } catch (error) {
      console.error('Error fetching budget audit trail:', error);
      return [];
    }
  }

  // Get activity summary for dashboard
  async getActivitySummary(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const summary = await Audit.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              action: '$action'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            activities: {
              $push: {
                action: '$_id.action',
                count: '$count'
              }
            },
            totalActivities: { $sum: '$count' }
          }
        },
        { $sort: { _id: -1 } }
      ]);

      return summary;
    } catch (error) {
      console.error('Error getting activity summary:', error);
      return [];
    }
  }
}

module.exports = new HistoryTracker();