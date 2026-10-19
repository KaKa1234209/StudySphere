const AppError = require("../utils/AppError");

// validate(fn): fn nhận req và trả về mảng lỗi. Mảng rỗng = hợp lệ.
module.exports = fn => (req, res, next) => {
  const errors = fn(req);
  if (errors.length) return next(new AppError(400, errors.join("; ")));
  next();
};