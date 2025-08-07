const exportToCSV = require('../utils/exportToCSV');
const pdfGenerator = require('../utils/pdfGenerator');
const Budget = require('../models/budgetModel');
const Item = require('../models/itemModel');
const Category = require('../models/categoryModel');
const User = require('../models/userModel');

// Export budget as PDF
exports.exportBudgetPDF = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const userId = req.user._id;

    // Get budget data
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: userId
    }).populate('categories.categoryId');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Get items for this budget
    const items = await Item.find({
      budgetId: budgetId,
      userId: userId
    }).populate('categoryId').sort('-purchaseDate');

    // Calculate category spending
    const categorySpending = {};
    items.forEach(item => {
      const categoryName = item.categoryId ? item.categoryId.name : 'Uncategorized';
      if (!categorySpending[categoryName]) {
        categorySpending[categoryName] = 0;
      }
      categorySpending[categoryName] += item.price * (item.quantity || 1);
    });


    // Generate PDF with user's currency
    const pdfBuffer = await pdfGenerator.generateBudgetPDF(budget, items, categorySpending, userCurrency);
    
    // Set response headers for PDF download
    const filename = `budget_${budget.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Export budget summary
exports.exportBudgetSummary = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const userId = req.user._id;

    const csv = await exportToCSV.exportBudgetSummary(budgetId, userId);
    const filename = exportToCSV.generateFilename('budget_summary');

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export items
exports.exportItems = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { startDate, endDate, categoryId } = req.query;
    const userId = req.user._id;

    const options = {
      startDate,
      endDate,
      categoryId
    };

    const csv = await exportToCSV.exportItems(budgetId, userId, options);
    const filename = exportToCSV.generateFilename('items');

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export category breakdown
exports.exportCategoryBreakdown = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const userId = req.user._id;

    const csv = await exportToCSV.exportCategoryBreakdown(budgetId, userId);
    const filename = exportToCSV.generateFilename('category_breakdown');

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export comprehensive report
exports.exportComprehensiveReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const options = {
      startDate,
      endDate
    };

    const csv = await exportToCSV.exportComprehensiveReport(userId, options);
    const filename = exportToCSV.generateFilename('comprehensive_report');

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};