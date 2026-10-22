const db = require("../config/database");
const goalService = require("./goal.service");
const AppError = require("../utils/AppError");

const pad2 = n => String(n).padStart(2, "0");
const dateKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Tính chuỗi ngày học liên tiếp (Streak) từ danh sách ngày có phiên học
function calculateStreak(sessions) {
  const uniqueDays = [...new Set(
    sessions
      .map(s => String(s.started_at || "").slice(0, 10))
      .filter(Boolean)
  )].sort().reverse();

  if (uniqueDays.length === 0) return { current_streak: 0, best_streak: 0 };

  const today = dateKey(new Date());
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yesterday = dateKey(yestDate);

  const daySet = new Set(uniqueDays);
  let currentStreak = 0;

  let cursor = new Date();
  if (!daySet.has(today) && daySet.has(yesterday)) {
    cursor = yestDate;
  }

  if (daySet.has(dateKey(cursor))) {
    while (daySet.has(dateKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Tính chuỗi dài nhất lịch sử
  const ascDays = [...uniqueDays].reverse();
  let bestStreak = 1;
  let run = 1;
  for (let i = 1; i < ascDays.length; i++) {
    const prev = new Date(ascDays[i - 1] + "T00:00:00");
    const curr = new Date(ascDays[i] + "T00:00:00");
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else if (diff > 1) {
      run = 1;
    }
  }

  return { current_streak: currentStreak, best_streak: Math.max(bestStreak, currentStreak) };
}

exports.listSessions = (userId, query = {}) => {
  let sql = `
    SELECT s.*, g.title AS goal_title
    FROM StudySessions s
    LEFT JOIN Goals g ON g.id = s.goal_id
    WHERE s.user_id = ?
  `;
  const args = [userId];

  if (query.goalId) {
    sql += " AND s.goal_id = ?";
    args.push(Number(query.goalId));
  }

  sql += " ORDER BY s.started_at DESC, s.id DESC";
  return db.prepare(sql).all(...args);
};

exports.createSession = (userId, body = {}) => {
  const duration = Number(body.duration_minutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new AppError(400, "Thời lượng học phải lớn hơn 0 phút");
  }

  const goalId = body.goal_id ? Number(body.goal_id) : null;
  if (goalId) {
    goalService.getOne(userId, goalId); // đảm bảo mục tiêu thuộc user
  }

  const startedAt = body.started_at || new Date().toISOString();
  const notes = String(body.notes || "").trim();

  const info = db
    .prepare(
      `INSERT INTO StudySessions(user_id, goal_id, started_at, duration_minutes, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, goalId, startedAt, Math.round(duration), notes);

  return db
    .prepare(
      `SELECT s.*, g.title AS goal_title
       FROM StudySessions s
       LEFT JOIN Goals g ON g.id = s.goal_id
       WHERE s.id = ?`
    )
    .get(info.lastInsertRowid);
};

exports.removeSession = (userId, sessionId) => {
  const existing = db
    .prepare("SELECT id FROM StudySessions WHERE id = ? AND user_id = ?")
    .get(Number(sessionId), userId);
  if (!existing) throw new AppError(404, "Không tìm thấy phiên học");

  db.prepare("DELETE FROM StudySessions WHERE id = ? AND user_id = ?").run(Number(sessionId), userId);
};

// Tổng hợp dữ liệu cho Dashboard & Trang Thống kê (Statistics)
exports.getSummary = userId => {
  const goals = goalService.list(userId, {});
  const sessions = exports.listSessions(userId, {});

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed" || g.progress === 100).length;
  const activeGoals = goals.filter(g => g.status === "active" && g.progress < 100).length;
  const avgProgress = totalGoals
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals)
    : 0;

  const totalMinutes = sessions.reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
  const { current_streak, best_streak } = calculateStreak(sessions);

  // Thống kê thời gian học 7 ngày gần nhất (Biểu đồ tuần)
  const daily7 = [];
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const mins = sessions
      .filter(s => String(s.started_at || "").slice(0, 10) === key)
      .reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
    daily7.push({
      date: key,
      label: dayNames[d.getDay()],
      minutes: mins,
    });
  }

  // Thống kê số lượng ghi chú (NoteHub)
  const notesCount = db
    .prepare("SELECT COUNT(*) AS c FROM Notes WHERE user_id = ?")
    .get(userId).c;

  return {
    goals: {
      total: totalGoals,
      completed: completedGoals,
      active: activeGoals,
      avg_progress: avgProgress,
      items: goals,
    },
    study: {
      total_sessions: sessions.length,
      total_minutes: totalMinutes,
      total_hours: +(totalMinutes / 60).toFixed(1),
      current_streak,
      best_streak,
      daily_7_days: daily7,
      recent_sessions: sessions.slice(0, 10),
    },
    notes_count: notesCount,
  };
};
