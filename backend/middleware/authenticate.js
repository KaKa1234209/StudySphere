const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// Gắn req.user = { id, role } cho các route cần đăng nhập.
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "studysphere-secret");
      req.user = { id: payload.id, role: payload.role || "user" };
      return next();
    } catch {
      if (process.env.DEV_NO_AUTH !== "true") {
        return next(new AppError(401, "Bạn cần đăng nhập"));
      }
    }
  }

  if (process.env.DEV_NO_AUTH === "true") {
    req.user = { id: 1, role: "user" };
    return next();
  }

  next(new AppError(401, "Bạn cần đăng nhập"));
};