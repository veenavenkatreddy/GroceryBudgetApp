const Audit = require('../models/auditModel');

// Middleware to log actions
const auditLogger = (action, entityType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      const userId = (req.user && req.user._id) || (data && data.user && data.user.id) || null;
      // Log the audit after successful response
      const auditData = {
        userId,
        action,
        entityType,
        entityId: req.params.id || (data && data.data && data.data._id) || null,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body ? Object.keys(req.body) : [], // Log only keys, not values for security
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: !data.error && data.success !== false,
        errorMessage: data.error || data.message || null
      };
      
      // Don't wait for audit to complete
      Audit.log(auditData).catch(err => 
        console.error('Audit logging failed:', err)
      );
      
      // Call original res.json
      originalJson.call(this, data);
    };
    
    next();
  };
};

// Specific audit loggers for different actions
const auditLoggers = {
  // User actions
  userRegister: auditLogger('user_register', 'user'),
  userLogin: auditLogger('user_login', 'user'),
  userLogout: auditLogger('user_logout', 'user'),
  userUpdate: auditLogger('user_update', 'user'),
  userDelete: auditLogger('user_delete', 'user'),
  
  // Budget actions
  budgetCreate: auditLogger('budget_create', 'budget'),
  budgetUpdate: auditLogger('budget_update', 'budget'),
  budgetDelete: auditLogger('budget_delete', 'budget'),
  budgetView: auditLogger('budget_view', 'budget'),
  
  // Item actions
  itemCreate: auditLogger('item_create', 'item'),
  itemUpdate: auditLogger('item_update', 'item'),
  itemDelete: auditLogger('item_delete', 'item'),
  itemBatchCreate: auditLogger('item_batch_create', 'item'),
  
  // Category actions
  categoryCreate: auditLogger('category_create', 'category'),
  categoryUpdate: auditLogger('category_update', 'category'),
  categoryDelete: auditLogger('category_delete', 'category'),
  
  // Export actions
  exportData: auditLogger('export_data', 'export'),
  
  // Tip actions
  tipView: auditLogger('tip_view', 'tip'),
  tipHelpful: auditLogger('tip_helpful', 'tip')
};

module.exports = auditLoggers;