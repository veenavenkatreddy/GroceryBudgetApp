// Default tips for the budget app
const defaultTips = {
  threshold: {
    50: [
      {
        title: "Budget Alert: 50% Used",
        content: "You've used half of your budget. Time to review your spending and plan for the rest of the period.",
        category: "budget",
        priority: "medium"
      },
      {
        title: "Mid-Budget Check",
        content: "Consider meal planning for the rest of the month to avoid overspending.",
        category: "planning",
        priority: "medium"
      }
    ],
    75: [
      {
        title: "Warning: 75% Budget Used",
        content: "You're approaching your budget limit. Focus on essential items only for the remaining period.",
        category: "budget",
        priority: "high"
      },
      {
        title: "Stretch Your Budget",
        content: "Try these tips: Buy generic brands, use coupons, and check for student discounts.",
        category: "savings",
        priority: "high"
      }
    ],
    90: [
      {
        title: "Critical: 90% Budget Used",
        content: "You're very close to your budget limit! Only buy absolute necessities until your next budget period.",
        category: "budget",
        priority: "critical"
      },
      {
        title: "Emergency Budget Mode",
        content: "Consider using pantry items, buying only essentials, and looking for free food events on campus.",
        category: "emergency",
        priority: "critical"
      }
    ]
  },
  
  seasonal: {
    spring: [
      {
        title: "Spring Savings",
        content: "Look for seasonal produce like asparagus, strawberries, and leafy greens - they're cheaper in spring!",
        category: "seasonal",
        priority: "low"
      }
    ],
    summer: [
      {
        title: "Summer Produce",
        content: "Take advantage of summer fruits and vegetables - tomatoes, corn, and berries are at their cheapest!",
        category: "seasonal",
        priority: "low"
      }
    ],
    autumn: [
      {
        title: "Autumn Harvest",
        content: "Stock up on apples, pumpkins, and root vegetables - they're in season and budget-friendly!",
        category: "seasonal",
        priority: "low"
      }
    ],
    winter: [
      {
        title: "Winter Warmth",
        content: "Save money with hearty soups and stews using affordable root vegetables and dried beans.",
        category: "seasonal",
        priority: "low"
      }
    ]
  },
  
  general: [
    {
      title: "Bulk Buying Tip",
      content: "Consider buying non-perishables in bulk when on sale. Split with roommates to save even more!",
      category: "savings",
      priority: "medium"
    },
    {
      title: "Store Brand Savings",
      content: "Generic or store brands can save you 25-30% compared to name brands with similar quality.",
      category: "savings",
      priority: "medium"
    },
    {
      title: "Meal Prep Sunday",
      content: "Dedicate time on Sunday to meal prep. This reduces impulse purchases and food waste during the week.",
      category: "planning",
      priority: "medium"
    },
    {
      title: "Student Discounts",
      content: "Always ask about student discounts! Many grocery stores offer 5-10% off with a valid student ID.",
      category: "discounts",
      priority: "medium"
    },
    {
      title: "Price Comparison",
      content: "Use apps like Honey or Flipp to compare prices across different stores before shopping.",
      category: "technology",
      priority: "low"
    },
    {
      title: "Reduce Food Waste",
      content: "Plan meals around what you already have. Check your fridge before shopping to avoid duplicate purchases.",
      category: "waste-reduction",
      priority: "medium"
    },
    {
      title: "Shop the Perimeter",
      content: "Fresh produce, dairy, and proteins around the store perimeter are usually healthier and more economical than processed foods in the aisles.",
      category: "health",
      priority: "low"
    },
    {
      title: "Loyalty Programs",
      content: "Sign up for free loyalty programs at your regular stores. The points and exclusive deals add up!",
      category: "savings",
      priority: "low"
    }
  ],
  
  category: {
    produce: [
      {
        title: "Produce Savings",
        content: "Buy fruits and vegetables that are in season. Frozen options are also nutritious and often cheaper!",
        category: "produce",
        priority: "medium"
      }
    ],
    dairy: [
      {
        title: "Dairy Smart Shopping",
        content: "Check expiration dates and buy the furthest out. Consider plant-based alternatives if they're on sale.",
        category: "dairy",
        priority: "low"
      }
    ],
    meat: [
      {
        title: "Protein Alternatives",
        content: "Beans, lentils, and eggs are excellent protein sources that cost much less than meat.",
        category: "meat",
        priority: "medium"
      }
    ],
    snacks: [
      {
        title: "Snack Smarter",
        content: "Make your own snacks! Popcorn, homemade granola bars, and cut vegetables are healthier and cheaper.",
        category: "snacks",
        priority: "low"
      }
    ]
  }
};

module.exports = defaultTips;