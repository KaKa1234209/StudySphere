const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// Gắn req.user = { id } cho các route cần đăng nhập.
// (Nếu Thành viên 1 đã có bản chính thức thì dùng bản của họ.)
module.exports = (req, res, next) => {
  if (process.env.DEV_NO_AUTH === "true") {
    req.user = { id: 1 };
    return next();
  }
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch {
    next(new AppError(401, "Bạn cần đăng nhập"));
  }
};