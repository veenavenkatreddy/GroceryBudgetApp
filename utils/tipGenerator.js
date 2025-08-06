const Item = require('../models/itemModel');
const Budget = require('../models/budgetModel');
const Tips = require('../models/tipsModel');
const defaultTips = require('./defaultTips');

class TipGenerator {
  constructor() {
    this.thresholds = {
      warning: 50,
      critical: 75,
      danger: 90
    };
  }

  // Generate tips based on budget usage
  async generateBudgetThresholdTips(budgetId) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) return [];

      const percentageUsed = budget.percentageSpent;
      const tips = [];

      // Use default tips based on percentage
      if (percentageUsed >= this.thresholds.danger) {
        tips.push(...defaultTips.threshold[90]);
      } else if (percentageUsed >= this.thresholds.critical) {
        tips.push(...defaultTips.threshold[75]);
      } else if (percentageUsed >= this.thresholds.warning) {
        tips.push(...defaultTips.threshold[50]);
      }

      return tips;
    } catch (error) {
      console.error('Error generating threshold tips:', error);
      return [];
    }
  }

  // Analyze spending patterns
  async analyzeSpendingPatterns(userId, budgetId) {
    try {
      const items = await Item.find({ userId, budgetId })
        .populate('categoryId')
        .sort('-purchaseDate');

      const patterns = {
        duplicatePurchases: this.findDuplicatePurchases(items),
        categoryOverspend: await this.analyzeCategorySpending(budgetId),
        frequentItems: this.findFrequentItems(items),
        priceIncreases: this.detectPriceIncreases(items)
      };

      return patterns;
    } catch (error) {
      console.error('Error analyzing spending patterns:', error);
      return {};
    }
  }

  // Find duplicate purchases
  findDuplicatePurchases(items) {
    const itemFrequency = {};
    const duplicates = [];

    items.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!itemFrequency[key]) {
        itemFrequency[key] = [];
      }
      itemFrequency[key].push(item);
    });

    Object.entries(itemFrequency).forEach(([name, purchases]) => {
      if (purchases.length >= 3) {
        duplicates.push({
          name,
          count: purchases.length,
          totalSpent: purchases.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          averagePrice: purchases.reduce((sum, item) => sum + item.price, 0) / purchases.length
        });
      }
    });

    return duplicates.sort((a, b) => b.count - a.count);
  }

  // Analyze category spending
  async analyzeCategorySpending(budgetId) {
    try {
      const budget = await Budget.findById(budgetId).populate('categories.categoryId');
      const items = await Item.find({ budgetId }).populate('categoryId');

      const categorySpending = {};
      const totalSpent = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Calculate spending per category
      items.forEach(item => {
        const categoryName = item.categoryId.name;
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = {
            spent: 0,
            count: 0,
            percentage: 0
          };
        }
        categorySpending[categoryName].spent += item.price * item.quantity;
        categorySpending[categoryName].count += 1;
      });

      // Calculate percentages and check against limits
      const overspendCategories = [];
      Object.entries(categorySpending).forEach(([category, data]) => {
        data.percentage = (data.spent / totalSpent) * 100;
        
        // Check if category has a limit in budget
        const categoryBudget = budget.categories.find(
          cat => cat.categoryId.name === category
        );
        
        if (categoryBudget && categoryBudget.limit) {
          const categoryPercentage = (data.spent / categoryBudget.limit) * 100;
          if (categoryPercentage > 80) {
            overspendCategories.push({
              category,
              spent: data.spent,
              limit: categoryBudget.limit,
              percentage: categoryPercentage
            });
          }
        }
      });

      return {
        breakdown: categorySpending,
        overspending: overspendCategories
      };
    } catch (error) {
      console.error('Error analyzing category spending:', error);
      return { breakdown: {}, overspending: [] };
    }
  }

  // Find frequently purchased items
  findFrequentItems(items) {
    const itemFrequency = {};
    
    items.forEach(item => {
      const key = `${item.name.toLowerCase()}_${item.categoryId}`;
      if (!itemFrequency[key]) {
        itemFrequency[key] = {
          name: item.name,
          category: item.categoryId,
          purchases: 0,
          totalQuantity: 0,
          averagePrice: 0,
          prices: []
        };
      }
      itemFrequency[key].purchases += 1;
      itemFrequency[key].totalQuantity += item.quantity;
      itemFrequency[key].prices.push(item.price);
    });

    // Calculate average prices and filter frequent items
    const frequentItems = Object.values(itemFrequency)
      .filter(item => item.purchases >= 2)
      .map(item => {
        item.averagePrice = item.prices.reduce((a, b) => a + b, 0) / item.prices.length;
        return item;
      })
      .sort((a, b) => b.purchases - a.purchases);

    return frequentItems;
  }

  // Detect price increases
  detectPriceIncreases(items) {
    const priceHistory = {};
    
    items.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!priceHistory[key]) {
        priceHistory[key] = [];
      }
      priceHistory[key].push({
        price: item.price,
        date: item.purchaseDate
      });
    });

    const priceIncreases = [];
    Object.entries(priceHistory).forEach(([name, history]) => {
      if (history.length >= 2) {
        // Sort by date
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const firstPrice = history[0].price;
        const lastPrice = history[history.length - 1].price;
        const percentageIncrease = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        if (percentageIncrease > 10) {
          priceIncreases.push({
            name,
            firstPrice,
            lastPrice,
            increase: percentageIncrease.toFixed(2),
            purchases: history.length
          });
        }
      }
    });

    return priceIncreases.sort((a, b) => b.increase - a.increase);
  }

  // Generate pattern-based tips
  async generatePatternTips(patterns) {
    const tips = [];

    try {
      // Tips for duplicate purchases
      if (patterns.duplicatePurchases && patterns.duplicatePurchases.length > 0) {
        const duplicateTip = await Tips.findOne({
          triggerType: 'pattern',
          'triggerValue.type': 'duplicate_purchases',
          isActive: true
        });
        if (duplicateTip) {
          tips.push({
            tip: duplicateTip,
            context: {
              items: patterns.duplicatePurchases.slice(0, 3).map(d => d.name)
            }
          });
        }
      }

      // Tips for category overspending
      if (patterns.categoryOverspend && patterns.categoryOverspend.overspending.length > 0) {
        for (const overspend of patterns.categoryOverspend.overspending) {
          const categoryTip = await Tips.findOne({
            category: overspend.category.toLowerCase(),
            triggerType: 'pattern',
            isActive: true
          });
          if (categoryTip) {
            tips.push({
              tip: categoryTip,
              context: {
                category: overspend.category,
                percentage: overspend.percentage.toFixed(0)
              }
            });
          }
        }
      }

      // Tips for price increases
      if (patterns.priceIncreases && patterns.priceIncreases.length > 0) {
        tips.push({
          tip: {
            content: `Price alert: ${patterns.priceIncreases[0].name} has increased by ${patterns.priceIncreases[0].increase}%. Consider alternatives or buying in bulk.`,
            category: 'general',
            tags: ['price-alert', 'savings']
          },
          context: {
            item: patterns.priceIncreases[0].name,
            increase: patterns.priceIncreases[0].increase
          }
        });
      }

      return tips;
    } catch (error) {
      console.error('Error generating pattern tips:', error);
      return [];
    }
  }

  // Get seasonal tips
  async getSeasonalTips() {
    const currentMonth = new Date().getMonth();
    let season;

    if (currentMonth >= 2 && currentMonth <= 4) season = 'spring';
    else if (currentMonth >= 5 && currentMonth <= 7) season = 'summer';
    else if (currentMonth >= 8 && currentMonth <= 10) season = 'autumn';
    else season = 'winter';

    try {
      return defaultTips.seasonal[season] || [];
    } catch (error) {
      console.error('Error getting seasonal tips:', error);
      return [];
    }
  }

  // Generate all tips for a user
  async generateTipsForUser(userId, budgetId) {
    try {
      const tips = [];

      // Get threshold tips if budget exists
      if (budgetId) {
        const thresholdTips = await this.generateBudgetThresholdTips(budgetId);
        tips.push(...thresholdTips);

        // Analyze patterns and get pattern tips
        const patterns = await this.analyzeSpendingPatterns(userId, budgetId);
        const patternTips = await this.generatePatternTips(patterns);
        tips.push(...patternTips);
      }

      // Get seasonal tips
      const seasonalTips = await this.getSeasonalTips();
      tips.push(...seasonalTips);

      // If no tips yet, add some general tips
      if (tips.length === 0) {
        // Randomly select 3-5 general tips
        const generalTipsCopy = [...defaultTips.general];
        const selectedTips = [];
        const numTips = Math.floor(Math.random() * 3) + 3; // 3-5 tips
        
        for (let i = 0; i < numTips && generalTipsCopy.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * generalTipsCopy.length);
          selectedTips.push(generalTipsCopy.splice(randomIndex, 1)[0]);
        }
        
        tips.push(...selectedTips);
      }

      // Remove duplicates and limit
      const uniqueTips = this.removeDuplicateTips(tips);
      return uniqueTips.slice(0, 8); // Show up to 8 tips
    } catch (error) {
      console.error('Error generating tips for user:', error);
      // Return some default tips even on error
      return defaultTips.general.slice(0, 5);
    }
  }

  // Remove duplicate tips
  removeDuplicateTips(tips) {
    const seen = new Set();
    return tips.filter(tipObj => {
      const tip = tipObj.tip || tipObj;
      const key = tip._id ? tip._id.toString() : tip.content;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

module.exports = new TipGenerator();