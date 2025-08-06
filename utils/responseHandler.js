exports.success = (res, data = {}, message = 'Success') => {
  res.status(200).json({ success: true, message, ...data });
};

exports.fail = (res, error, code = 400) => {
  res.status(code).json({
    success: false,
    message: error.message || 'Error',
    error: error.stack || undefined
  });
};
