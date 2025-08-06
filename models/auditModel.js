const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'user_register',
      'user_login',
      'user_logout',
      'user_update',
      'user_delete',
      'budget_create',
      'budget_update',
      'budget_delete',
      'budget_view',
      'item_create',
      'item_update',
      'item_delete',
      'item_batch_create',
      'category_create',
      'category_update',
      'category_delete',
      'export_data',
      'tip_view',
      'tip_helpful'
    ]
  },
  entityType: {
    type: String,
    enum: ['user', 'budget', 'item', 'category', 'tip', 'export'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  }
});

// Indexes for efficient querying
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });
auditSchema.index({ entityType: 1, entityId: 1 });
auditSchema.index({ timestamp: -1 });

// Static method to create audit log
auditSchema.statics.log = async function(data) {
  try {
    const audit = await this.create(data);
    return audit;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent disrupting main operations
    return null;
  }
};

// Static method to get user activity
auditSchema.statics.getUserActivity = async function(userId, options = {}) {
  const query = { userId };
  
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.timestamp.$lte = new Date(options.endDate);
    }
  }
  
  if (options.action) {
    query.action = options.action;
  }
  
  if (options.entityType) {
    query.entityType = options.entityType;
  }
  
  const limit = options.limit || 50;
  const skip = ((options.page || 1) - 1) * limit;
  
  const [audits, total] = await Promise.all([
    this.find(query)
      .sort('-timestamp')
      .limit(limit)
      .skip(skip)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    audits,
    total,
    page: options.page || 1,
    totalPages: Math.ceil(total / limit)
  };
};

// Static method to get system activity summary
auditSchema.statics.getActivitySummary = async function(options = {}) {
  const match = {};
  
  if (options.startDate || options.endDate) {
    match.timestamp = {};
    if (options.startDate) {
      match.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      match.timestamp.$lte = new Date(options.endDate);
    }
  }
  
  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          action: '$action',
          success: '$success'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        total: { $sum: '$count' },
        successful: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', true] }, '$count', 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', false] }, '$count', 0]
          }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  return summary;
};

// Method to clean old audit logs (retention policy)
auditSchema.statics.cleanOldLogs = async function(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

module.exports = mongoose.model('Audit', auditSchema);