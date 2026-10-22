const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const AppError = require("../utils/AppError");

const hashPassword = raw => crypto.createHash("sha256").update(String(raw)).digest("hex");
const signToken = user =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "studysphere-secret",
    { expiresIn: "7d" }
  );

const publicUser = u =>
  u && {
    id: u.id,
    full_name: u.full_name,
    name: u.full_name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  };

exports.register = ({ full_name, name, email, password }) => {
  const fullName = String(full_name || name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const rawPass = String(password || "");

  if (!fullName) throw new AppError(400, "Vui lòng nhập họ và tên");
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new AppError(400, "Email không hợp lệ");
  }
  if (rawPass.length < 6) throw new AppError(400, "Mật khẩu phải có ít nhất 6 ký tự");

  const existing = db.prepare("SELECT id FROM Users WHERE LOWER(email) = ?").get(cleanEmail);
  if (existing) throw new AppError(409, "Email này đã được sử dụng");

  const info = db
    .prepare("INSERT INTO Users(full_name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(fullName, cleanEmail, hashPassword(rawPass));

  const user = db.prepare("SELECT * FROM Users WHERE id = ?").get(info.lastInsertRowid);
  return { token: signToken(user), user: publicUser(user) };
};

exports.login = ({ email, password }) => {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const rawPass = String(password || "");

  if (!cleanEmail || !rawPass) throw new AppError(400, "Vui lòng nhập email và mật khẩu");

  const user = db.prepare("SELECT * FROM Users WHERE LOWER(email) = ?").get(cleanEmail);
  if (!user || user.password_hash !== hashPassword(rawPass)) {
    throw new AppError(401, "Email hoặc mật khẩu không chính xác");
  }

  return { token: signToken(user), user: publicUser(user) };
};

exports.getProfile = userId => {
  const user = db.prepare("SELECT * FROM Users WHERE id = ?").get(userId);
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");
  return publicUser(user);
};

exports.updateProfile = (userId, { full_name, name, email }) => {
  const current = db.prepare("SELECT * FROM Users WHERE id = ?").get(userId);
  if (!current) throw new AppError(404, "Không tìm thấy người dùng");

  const nextName = String(full_name ?? name ?? current.full_name).trim();
  const nextEmail = String(email ?? current.email).trim().toLowerCase();

  if (!nextName) throw new AppError(400, "Họ và tên không được để trống");
  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    throw new AppError(400, "Email không hợp lệ");
  }

  const conflict = db
    .prepare("SELECT id FROM Users WHERE LOWER(email) = ? AND id != ?")
    .get(nextEmail, userId);
  if (conflict) throw new AppError(409, "Email này đã thuộc về tài khoản khác");

  db.prepare("UPDATE Users SET full_name = ?, email = ? WHERE id = ?").run(nextName, nextEmail, userId);
  return exports.getProfile(userId);
};

exports.changePassword = (userId, { current_password, new_password }) => {
  const user = db.prepare("SELECT * FROM Users WHERE id = ?").get(userId);
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");

  if (!current_password || user.password_hash !== hashPassword(current_password)) {
    throw new AppError(400, "Mật khẩu hiện tại không đúng");
  }
  if (!new_password || String(new_password).length < 6) {
    throw new AppError(400, "Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  db.prepare("UPDATE Users SET password_hash = ? WHERE id = ?").run(hashPassword(new_password), userId);
  return { message: "Đổi mật khẩu thành công" };
};
