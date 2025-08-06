const json2csv = require('json2csv').parse;
const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');

class ExportToCSV {
  // Export budget summary to CSV
  async exportBudgetSummary(budgetId, userId) {
    try {
      const budget = await Budget.findOne({
        _id: budgetId,
        userId: userId
      }).populate('categories.categoryId');

      if (!budget) {
        throw new Error('Budget not found');
      }

      // Prepare budget summary data
      const summaryData = [{
        'Budget Name': budget.name,
        'Total Limit': budget.totalLimit,
        'Current Spent': budget.currentSpent,
        'Remaining Budget': budget.remainingBudget,
        'Percentage Spent': `${budget.percentageSpent.toFixed(2)}%`,
        'Start Date': budget.period.start.toISOString().split('T')[0],
        'End Date': budget.period.end.toISOString().split('T')[0],
        'Status': budget.isActive ? 'Active' : 'Inactive',
        'Created Date': budget.createdAt.toISOString().split('T')[0]
      }];

      const fields = [
        'Budget Name',
        'Total Limit',
        'Current Spent',
        'Remaining Budget',
        'Percentage Spent',
        'Start Date',
        'End Date',
        'Status',
        'Created Date'
      ];

      return json2csv(summaryData, { fields });
    } catch (error) {
      console.error('Error exporting budget summary:', error);
      throw error;
    }
  }

  // Export items to CSV
  async exportItems(budgetId, userId, options = {}) {
    try {
      const query = { budgetId };
      
      // Add date filters if provided
      if (options.startDate || options.endDate) {
        query.purchaseDate = {};
        if (options.startDate) {
          query.purchaseDate.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          query.purchaseDate.$lte = new Date(options.endDate);
        }
      }

      // Add category filter if provided
      if (options.categoryId) {
        query.categoryId = options.categoryId;
      }

      const items = await Item.find(query)
        .populate('categoryId')
        .sort('-purchaseDate');

      // Verify items belong to user
      const budget = await Budget.findOne({ _id: budgetId, userId });
      if (!budget) {
        throw new Error('Budget not found or unauthorized');
      }

      // Prepare item data for CSV
      const itemData = items.map(item => ({
        'Item Name': item.name,
        'Category': item.categoryId.name,
        'Price': item.price,
        'Quantity': item.quantity,
        'Total Cost': (item.price * item.quantity).toFixed(2),
        'Essential': item.isEssential ? 'Yes' : 'No',
        'Purchase Date': item.purchaseDate.toISOString().split('T')[0],
        'Notes': item.notes || '',
        'Added Date': item.createdAt.toISOString().split('T')[0]
      }));

      const fields = [
        'Item Name',
        'Category',
        'Price',
        'Quantity',
        'Total Cost',
        'Essential',
        'Purchase Date',
        'Notes',
        'Added Date'
      ];

      return json2csv(itemData, { fields });
    } catch (error) {
      console.error('Error exporting items:', error);
      throw error;
    }
  }

  // Export category breakdown to CSV
  async exportCategoryBreakdown(budgetId, userId) {
    try {
      const budget = await Budget.findOne({
        _id: budgetId,
        userId: userId
      }).populate('categories.categoryId');

      if (!budget) {
        throw new Error('Budget not found');
      }

      const items = await Item.find({ budgetId }).populate('categoryId');

      // Calculate spending by category
      const categorySpending = {};
      items.forEach(item => {
        const categoryName = item.categoryId.name;
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = {
            spent: 0,
            itemCount: 0,
            limit: 0
          };
        }
        categorySpending[categoryName].spent += item.price * item.quantity;
        categorySpending[categoryName].itemCount += 1;
      });

      // Add category limits from budget
      budget.categories.forEach(cat => {
        const categoryName = cat.categoryId.name;
        if (categorySpending[categoryName]) {
          categorySpending[categoryName].limit = cat.limit || 0;
        }
      });

      // Prepare category data for CSV
      const categoryData = Object.entries(categorySpending).map(([category, data]) => ({
        'Category': category,
        'Amount Spent': data.spent.toFixed(2),
        'Category Limit': data.limit || 'No limit',
        'Items Count': data.itemCount,
        'Percentage of Total': ((data.spent / budget.currentSpent) * 100).toFixed(2) + '%',
        'Status': data.limit && data.spent > data.limit ? 'Over Limit' : 'Within Limit'
      }));

      const fields = [
        'Category',
        'Amount Spent',
        'Category Limit',
        'Items Count',
        'Percentage of Total',
        'Status'
      ];

      return json2csv(categoryData, { fields });
    } catch (error) {
      console.error('Error exporting category breakdown:', error);
      throw error;
    }
  }

  // Export comprehensive report
  async exportComprehensiveReport(userId, options = {}) {
    try {
      const query = { userId };
      
      // Add date filter for budgets
      if (options.startDate || options.endDate) {
        query['period.start'] = {};
        if (options.startDate) {
          query['period.start'].$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          query['period.start'].$lte = new Date(options.endDate);
        }
      }

      const budgets = await Budget.find(query).sort('-period.start');

      const reportData = [];
      
      for (const budget of budgets) {
        const items = await Item.find({ budgetId: budget._id }).populate('categoryId');
        
        items.forEach(item => {
          reportData.push({
            'Budget Name': budget.name,
            'Budget Period': `${budget.period.start.toISOString().split('T')[0]} to ${budget.period.end.toISOString().split('T')[0]}`,
            'Item Name': item.name,
            'Category': item.categoryId.name,
            'Price': item.price,
            'Quantity': item.quantity,
            'Total Cost': (item.price * item.quantity).toFixed(2),
            'Essential': item.isEssential ? 'Yes' : 'No',
            'Purchase Date': item.purchaseDate.toISOString().split('T')[0],
            'Budget Status': budget.isActive ? 'Active' : 'Completed'
          });
        });
      }

      const fields = [
        'Budget Name',
        'Budget Period',
        'Item Name',
        'Category',
        'Price',
        'Quantity',
        'Total Cost',
        'Essential',
        'Purchase Date',
        'Budget Status'
      ];

      return json2csv(reportData, { fields });
    } catch (error) {
      console.error('Error exporting comprehensive report:', error);
      throw error;
    }
  }

  // Generate filename with timestamp
  generateFilename(prefix) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}_${timestamp}.csv`;
  }
}

module.exports = new ExportToCSV();