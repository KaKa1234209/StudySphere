const Database = require("better-sqlite3");
const crypto = require("crypto");
const db = new Database(process.env.DB_FILE || "studysphere.db");
db.pragma("foreign_keys = ON");

// 1. Bảng Users (Hệ thống & Xác thực – Thành viên 3)
db.exec(`
CREATE TABLE IF NOT EXISTS Users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Đảm bảo có sẵn User mẫu id = 1 (cho chế độ DEV_NO_AUTH và tài khoản demo)
const defaultPassHash = crypto.createHash("sha256").update("123456").digest("hex");
db.prepare(`
  INSERT OR IGNORE INTO Users(id, full_name, email, password_hash, role)
  VALUES (1, 'Sinh viên StudySphere', 'sinhvien@studysphere.vn', ?, 'user')
`).run(defaultPassHash);

// 2. Bảng của module StudyFlow (Subjects, Tasks) – dùng cho thống kê Dashboard & liên kết
db.exec(`
CREATE TABLE IF NOT EXISTS Subjects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  teacher TEXT DEFAULT '',
  color TEXT DEFAULT '#8c7ad0',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  subject_id INTEGER,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  due_time TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// 3. Bảng của module NoteHub: Notes, Tags, NoteTags (Thành viên 2)
db.exec(`
CREATE TABLE IF NOT EXISTS Notes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject_id INTEGER,
  task_id INTEGER,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Tags(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS NoteTags(
  note_id INTEGER NOT NULL REFERENCES Notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES Tags(id)  ON DELETE CASCADE,
  PRIMARY KEY(note_id, tag_id)
);`);

// 4. Bảng của module SkillTrack: Goals, GoalTasks, StudySessions (Thành viên 3)
db.exec(`
CREATE TABLE IF NOT EXISTS Goals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS GoalTasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES Goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS StudySessions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_id INTEGER REFERENCES Goals(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  notes TEXT NOT NULL DEFAULT ''
);
`);

// Khởi tạo dữ liệu mẫu cho Goals & StudySessions nếu bảng đang trống
const goalCount = db.prepare("SELECT COUNT(*) AS c FROM Goals WHERE user_id = 1").get().c;
if (goalCount === 0) {
  const insGoal = db.prepare(`
    INSERT INTO Goals(user_id, title, description, start_date, target_date, status)
    VALUES (1, ?, ?, ?, ?, ?)
  `);
  const insStep = db.prepare(`
    INSERT INTO GoalTasks(goal_id, title, is_completed, sort_order, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const g1 = insGoal.run(
    "Hoàn thành StudySphere",
    "Xây dựng ứng dụng web quản lý học tập nhóm 3 thành viên (StudyFlow, NoteHub, SkillTrack)",
    "2026-10-01",
    "2026-11-30",
    "active"
  ).lastInsertRowid;
  [
    ["Thiết kế database", 1],
    ["Hoàn thiện CRUD môn học", 1],
    ["Hoàn thiện quản lý ghi chú", 0],
    ["Hoàn thiện dashboard", 0],
    ["Kiểm thử toàn hệ thống", 0],
  ].forEach(([title, done], idx) =>
    insStep.run(g1, title, done, idx + 1, done ? new Date().toISOString() : null)
  );

  const g2 = insGoal.run(
    "Học JavaScript",
    "Nắm vững ES6+, DOM, Fetch API và bất đồng bộ để làm chủ Frontend & Node.js",
    "2026-10-05",
    "2026-11-15",
    "active"
  ).lastInsertRowid;
  [
    ["Ôn tập biến, hàm, mảng và object", 1],
    ["Thực hành DOM & Sự kiện", 1],
    ["Làm việc với Fetch API & JSON", 0],
    ["Async/Await và Promise", 0],
    ["Xây dựng mini project hoàn chỉnh", 0],
  ].forEach(([title, done], idx) =>
    insStep.run(g2, title, done, idx + 1, done ? new Date().toISOString() : null)
  );

  const g3 = insGoal.run(
    "Ôn tập SQL",
    "Thành thạo truy vấn SELECT, JOIN, GROUP BY và thiết kế cơ sở dữ liệu quan hệ",
    "2026-10-01",
    "2026-10-25",
    "completed"
  ).lastInsertRowid;
  [
    ["Tạo bảng và ràng buộc khóa ngoại (PK, FK)", 1],
    ["Viết truy vấn INNER JOIN / LEFT JOIN", 1],
    ["Hàm tổng hợp COUNT, SUM, AVG và GROUP BY", 1],
    ["Tối ưu hóa truy vấn và kiểm thử dữ liệu mẫu", 1],
  ].forEach(([title, done], idx) =>
    insStep.run(g3, title, done, idx + 1, done ? new Date().toISOString() : null)
  );

  // Phiên học mẫu trong 7 ngày gần nhất để biểu đồ & chuỗi ngày học hiển thị sinh động
  const insSession = db.prepare(`
    INSERT INTO StudySessions(user_id, goal_id, started_at, duration_minutes, notes)
    VALUES (1, ?, ?, ?, ?)
  `);
  const dayOffset = n => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };
  insSession.run(g1, dayOffset(-4), 45, "Thiết kế bảng Goals, GoalTasks và StudySessions");
  insSession.run(g2, dayOffset(-3), 60, "Thực hành Fetch API kết nối Backend");
  insSession.run(g3, dayOffset(-2), 50, "Hoàn thành bài tập truy vấn JOIN nâng cao");
  insSession.run(g1, dayOffset(-1), 90, "Xây dựng giao diện SkillTrack và tính phần trăm tiến độ");
  insSession.run(g1, dayOffset(0), 60, "Kiểm thử tích hợp API mục tiêu và thống kê");
}

module.exports = db;