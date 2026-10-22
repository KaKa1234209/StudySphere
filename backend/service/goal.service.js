const db = require("../config/database");
const AppError = require("../utils/AppError");

const VALID_STATUS = ["active", "completed", "paused"];

// Tính tiến độ dựa trên số bước đã hoàn thành:
// Ví dụ 5 bước, 2 bước hoàn thành => 2/5 * 100% = 40%
function attachProgress(goal) {
  if (!goal) return null;
  const steps = db
    .prepare("SELECT * FROM GoalTasks WHERE goal_id = ? ORDER BY sort_order ASC, id ASC")
    .all(goal.id);

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.is_completed === 1 || s.is_completed === true).length;

  let progress = 0;
  if (totalSteps > 0) {
    progress = Math.round((completedSteps / totalSteps) * 100);
  } else if (goal.status === "completed") {
    progress = 100;
  }

  return {
    ...goal,
    total_steps: totalSteps,
    completed_steps: completedSteps,
    progress,
    steps,
  };
}

// Tự động đồng bộ trạng thái mục tiêu khi bước thay đổi (nếu không đang tạm dừng)
function syncGoalStatusFromSteps(goalId) {
  const goal = db.prepare("SELECT * FROM Goals WHERE id = ?").get(goalId);
  if (!goal || goal.status === "paused") return;

  const steps = db.prepare("SELECT is_completed FROM GoalTasks WHERE goal_id = ?").all(goalId);
  if (steps.length === 0) return;

  const allDone = steps.every(s => s.is_completed === 1);
  const nextStatus = allDone ? "completed" : "active";
  if (goal.status !== nextStatus) {
    db.prepare("UPDATE Goals SET status = ? WHERE id = ?").run(nextStatus, goalId);
  }
}

exports.list = (userId, query = {}) => {
  let sql = "SELECT * FROM Goals WHERE user_id = ?";
  const args = [userId];

  if (query.status && VALID_STATUS.includes(query.status)) {
    sql += " AND status = ?";
    args.push(query.status);
  }
  if (query.q && String(query.q).trim()) {
    const kw = `%${String(query.q).trim()}%`;
    sql += " AND (title LIKE ? OR description LIKE ?)";
    args.push(kw, kw);
  }

  sql += " ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, COALESCE(target_date, '9999-12-31') ASC, id DESC";
  return db.prepare(sql).all(...args).map(attachProgress);
};

exports.getOne = (userId, id) => {
  const goal = db.prepare("SELECT * FROM Goals WHERE id = ? AND user_id = ?").get(Number(id), userId);
  if (!goal) throw new AppError(404, "Không tìm thấy mục tiêu");
  return attachProgress(goal);
};

exports.create = (userId, body = {}) => {
  const title = String(body.title || "").trim();
  if (!title) throw new AppError(400, "Vui lòng nhập tên mục tiêu");
  if (title.length > 200) throw new AppError(400, "Tên mục tiêu tối đa 200 ký tự");

  const description = String(body.description || "").trim();
  const startDate = body.start_date || new Date().toISOString().slice(0, 10);
  const targetDate = body.target_date || null;
  const status = VALID_STATUS.includes(body.status) ? body.status : "active";

  const info = db
    .prepare(
      `INSERT INTO Goals(user_id, title, description, start_date, target_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, title, description, startDate, targetDate, status);

  const goalId = info.lastInsertRowid;

  // Nếu tạo kèm danh sách các bước ban đầu
  if (Array.isArray(body.steps) && body.steps.length > 0) {
    const ins = db.prepare(
      "INSERT INTO GoalTasks(goal_id, title, is_completed, sort_order, completed_at) VALUES (?, ?, ?, ?, ?)"
    );
    body.steps.forEach((st, idx) => {
      const stTitle = String(typeof st === "string" ? st : st?.title || "").trim();
      if (!stTitle) return;
      const done = typeof st === "object" && st?.is_completed ? 1 : 0;
      ins.run(goalId, stTitle, done, idx + 1, done ? new Date().toISOString() : null);
    });
    syncGoalStatusFromSteps(goalId);
  }

  return exports.getOne(userId, goalId);
};

exports.update = (userId, id, body = {}) => {
  const current = exports.getOne(userId, id);

  const title = body.title !== undefined ? String(body.title).trim() : current.title;
  if (!title) throw new AppError(400, "Vui lòng nhập tên mục tiêu");
  if (title.length > 200) throw new AppError(400, "Tên mục tiêu tối đa 200 ký tự");

  const description = body.description !== undefined ? String(body.description).trim() : current.description;
  const startDate = body.start_date !== undefined ? body.start_date || null : current.start_date;
  const targetDate = body.target_date !== undefined ? body.target_date || null : current.target_date;
  const status = body.status && VALID_STATUS.includes(body.status) ? body.status : current.status;

  db.prepare(
    `UPDATE Goals
     SET title = ?, description = ?, start_date = ?, target_date = ?, status = ?
     WHERE id = ? AND user_id = ?`
  ).run(title, description, startDate, targetDate, status, Number(id), userId);

  return exports.getOne(userId, id);
};

exports.remove = (userId, id) => {
  exports.getOne(userId, id);
  db.prepare("DELETE FROM Goals WHERE id = ? AND user_id = ?").run(Number(id), userId);
};

// ==================== QUẢN LÝ CÁC BƯỚC NHỎ (GoalTasks) ====================

exports.addStep = (userId, goalId, body = {}) => {
  exports.getOne(userId, goalId);
  const title = String(body.title || "").trim();
  if (!title) throw new AppError(400, "Vui lòng nhập nội dung bước thực hiện");
  if (title.length > 200) throw new AppError(400, "Tên bước tối đa 200 ký tự");

  const maxSort = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM GoalTasks WHERE goal_id = ?")
    .get(Number(goalId)).m;

  db.prepare(
    "INSERT INTO GoalTasks(goal_id, title, is_completed, sort_order, completed_at) VALUES (?, ?, 0, ?, NULL)"
  ).run(Number(goalId), title, maxSort + 1);

  syncGoalStatusFromSteps(Number(goalId));
  return exports.getOne(userId, goalId);
};

exports.updateStep = (userId, goalId, stepId, body = {}) => {
  exports.getOne(userId, goalId);
  const step = db
    .prepare("SELECT * FROM GoalTasks WHERE id = ? AND goal_id = ?")
    .get(Number(stepId), Number(goalId));
  if (!step) throw new AppError(404, "Không tìm thấy bước thực hiện");

  const nextTitle = body.title !== undefined ? String(body.title).trim() : step.title;
  if (!nextTitle) throw new AppError(400, "Nội dung bước không được để trống");

  let nextDone = step.is_completed;
  if (body.is_completed !== undefined) {
    nextDone = body.is_completed ? 1 : 0;
  }
  const completedAt = nextDone ? step.completed_at || new Date().toISOString() : null;

  db.prepare(
    "UPDATE GoalTasks SET title = ?, is_completed = ?, completed_at = ? WHERE id = ? AND goal_id = ?"
  ).run(nextTitle, nextDone, completedAt, Number(stepId), Number(goalId));

  syncGoalStatusFromSteps(Number(goalId));
  return exports.getOne(userId, goalId);
};

exports.toggleStep = (userId, goalId, stepId) => {
  exports.getOne(userId, goalId);
  const step = db
    .prepare("SELECT * FROM GoalTasks WHERE id = ? AND goal_id = ?")
    .get(Number(stepId), Number(goalId));
  if (!step) throw new AppError(404, "Không tìm thấy bước thực hiện");

  const nextDone = step.is_completed ? 0 : 1;
  const completedAt = nextDone ? new Date().toISOString() : null;

  db.prepare("UPDATE GoalTasks SET is_completed = ?, completed_at = ? WHERE id = ?").run(
    nextDone,
    completedAt,
    Number(stepId)
  );

  syncGoalStatusFromSteps(Number(goalId));
  return exports.getOne(userId, goalId);
};

exports.removeStep = (userId, goalId, stepId) => {
  exports.getOne(userId, goalId);
  const step = db
    .prepare("SELECT * FROM GoalTasks WHERE id = ? AND goal_id = ?")
    .get(Number(stepId), Number(goalId));
  if (!step) throw new AppError(404, "Không tìm thấy bước thực hiện");

  db.prepare("DELETE FROM GoalTasks WHERE id = ?").run(Number(stepId));
  syncGoalStatusFromSteps(Number(goalId));
  return exports.getOne(userId, goalId);
};
