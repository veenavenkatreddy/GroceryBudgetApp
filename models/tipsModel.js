const mongoose = require('mongoose');

const tipsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Tip content is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['general', 'produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 
           'beverages', 'snacks', 'household', 'personal_care', 'seasonal', 'savings'],
    default: 'general'
  },
  triggerType: {
    type: String,
    enum: ['threshold', 'pattern', 'seasonal'],
    required: true
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
tipsSchema.index({ category: 1, isActive: 1 });
tipsSchema.index({ triggerType: 1, isActive: 1 });
tipsSchema.index({ tags: 1 });

// Static method to create default tips
tipsSchema.statics.createDefaultTips = async function() {
  const defaultTips = [
    // Threshold-based tips
    {
      content: 'You\'ve used 50% of your budget. Consider planning meals for the rest of the period to avoid overspending.',
      category: 'general',
      triggerType: 'threshold',
      triggerValue: 50,
      tags: ['budget', 'planning']
    },
    {
      content: 'Warning: You\'ve used 75% of your budget! Focus on essential items only for the remaining period.',
      category: 'general',
      triggerType: 'threshold',
      triggerValue: 75,
      tags: ['budget', 'warning']
    },
    {
      content: 'Critical: 90% of budget used! Consider using pantry items and avoiding non-essential purchases.',
      category: 'general',
      triggerType: 'threshold',
      triggerValue: 90,
      tags: ['budget', 'critical']
    },
    
    // Pattern-based tips
    {
      content: 'You\'re buying similar items frequently. Consider buying in bulk to save money.',
      category: 'general',
      triggerType: 'pattern',
      triggerValue: { type: 'duplicate_purchases', threshold: 3 },
      tags: ['savings', 'bulk']
    },
    {
      content: 'Your produce spending is high. Consider seasonal vegetables which are usually cheaper.',
      category: 'produce',
      triggerType: 'pattern',
      triggerValue: { type: 'category_overspend', percentage: 40 },
      tags: ['produce', 'seasonal']
    },
    {
      content: 'You\'re spending a lot on snacks. Try making homemade alternatives for better value.',
      category: 'snacks',
      triggerType: 'pattern',
      triggerValue: { type: 'category_overspend', percentage: 20 },
      tags: ['snacks', 'homemade']
    },
    
    // Seasonal tips
    {
      content: 'Winter tip: Root vegetables like potatoes and carrots are in season and budget-friendly.',
      category: 'seasonal',
      triggerType: 'seasonal',
      triggerValue: { season: 'winter' },
      tags: ['winter', 'produce']
    },
    {
      content: 'Summer tip: Local fruits are abundant. Stock up and freeze extras for later use.',
      category: 'seasonal',
      triggerType: 'seasonal',
      triggerValue: { season: 'summer' },
      tags: ['summer', 'produce', 'freezing']
    },
    
    // Category-specific tips
    {
      content: 'Dairy tip: Check expiration dates and buy only what you\'ll use to reduce waste.',
      category: 'dairy',
      triggerType: 'pattern',
      triggerValue: { type: 'general' },
      tags: ['dairy', 'waste-reduction']
    },
    {
      content: 'Meat tip: Consider less expensive cuts that can be slow-cooked for tender results.',
      category: 'meat',
      triggerType: 'pattern',
      triggerValue: { type: 'general' },
      tags: ['meat', 'cooking', 'savings']
    },
    {
      content: 'Bakery tip: Day-old bread is often discounted and perfect for toast or sandwiches.',
      category: 'bakery',
      triggerType: 'pattern',
      triggerValue: { type: 'general' },
      tags: ['bakery', 'discounts']
    }
  ];

  try {
    for (const tip of defaultTips) {
      await this.findOneAndUpdate(
        { content: tip.content },
        tip,
        { upsert: true, new: true }
      );
    }
    console.log('Default tips created successfully');
  } catch (error) {
    console.error('Error creating default tips:', error);
  }
};

// Method to get relevant tips for a user
tipsSchema.statics.getRelevantTips = async function(filters) {
  const query = { isActive: true };
  
  if (filters.category) {
    query.category = { $in: [filters.category, 'general'] };
  }
  
  if (filters.triggerType) {
    query.triggerType = filters.triggerType;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  return await this.find(query)
    .sort('-helpfulCount -viewCount')
    .limit(filters.limit || 5);
};

// Method to increment view count
tipsSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  return await this.save();
};

// Method to increment helpful count
tipsSchema.methods.incrementHelpfulCount = async function() {
  this.helpfulCount += 1;
  return await this.save();
};

module.exports = mongoose.model('Tips', tipsSchema);