exports.generateAlerts = (percentage) => {
  if (percentage >= 90) return [{ type: 'critical', message: 'Critical: 90% used', percentage }];
  if (percentage >= 75) return [{ type: 'warning', message: 'Warning: 75% used', percentage }];
  if (percentage >= 50) return [{ type: 'info', message: 'Info: 50% used', percentage }];
  return [];
};
