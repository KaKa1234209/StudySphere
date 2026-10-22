// Truy vấn SQL cho bảng Tasks. Ngày và giờ được chuyển sang chuỗi để tránh lệch múi giờ khi gửi JSON.
const { sql, getPool } = require("../config/db");
const AppError = require("../utils/AppError");

const COLUMNS = `
  t.TaskId AS id,
  t.Title AS title,
  t.Description AS description,
  t.SubjectId AS subject_id,
  CONVERT(VARCHAR(10), t.DueDate, 23) AS due_date,
  CONVERT(VARCHAR(5), t.DueTime, 108) AS due_time,
  t.Priority AS priority,
  t.Status AS status,
  t.CreatedAt AS created_at`;

const OWNER = "(@userId IS NULL OR t.UserId = @userId)";

// Chưa xong lên trước → hạn gần nhất → ưu tiên cao trước
const ORDER = `
  ORDER BY CASE WHEN t.Status = 'done' THEN 1 ELSE 0 END,
           t.DueDate, t.DueTime,
           CASE t.Priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.TaskId`;

// Dựng điều kiện WHERE từ các tham số lọc (?subject_id=&status=&priority=&date=&from=&to=&q=)
function buildFilter(request, userId, filter = {}) {
  request.input("userId", sql.Int, userId);
  let where = `WHERE ${OWNER}`;

  if (filter.subject_id) { request.input("subjectId", sql.Int, filter.subject_id); where += " AND t.SubjectId = @subjectId"; }
  if (filter.status)     { request.input("status", sql.VarChar(10), filter.status); where += " AND t.Status = @status"; }
  if (filter.priority)   { request.input("priority", sql.VarChar(10), filter.priority); where += " AND t.Priority = @priority"; }
  if (filter.date)       { request.input("date", sql.VarChar(10), filter.date); where += " AND t.DueDate = CAST(@date AS DATE)"; }
  if (filter.from)       { request.input("from", sql.VarChar(10), filter.from); where += " AND t.DueDate >= CAST(@from AS DATE)"; }
  if (filter.to)         { request.input("to", sql.VarChar(10), filter.to); where += " AND t.DueDate <= CAST(@to AS DATE)"; }
  if (filter.q) {
    request.input("q", sql.NVarChar(160), `%${filter.q}%`);
    where += " AND (t.Title LIKE @q OR t.Description LIKE @q)";
  }
  return where;
}

async function list(userId, filter) {
  const pool = await getPool();
  const request = pool.request();
  const where = buildFilter(request, userId, filter);
  const result = await request.query(`SELECT ${COLUMNS} FROM Tasks t ${where} ${ORDER}`);
  return result.recordset;
}

// Thống kê số nhiệm vụ theo trạng thái (có thể lọc theo môn)
async function stats(userId, filter) {
  const pool = await getPool();
  const request = pool.request();
  const where = buildFilter(request, userId, filter);
  const result = await request.query(`
    SELECT
      COUNT(*) AS total,
      ISNULL(SUM(CASE WHEN t.Status = 'todo'  THEN 1 ELSE 0 END), 0) AS todo,
      ISNULL(SUM(CASE WHEN t.Status = 'doing' THEN 1 ELSE 0 END), 0) AS doing,
      ISNULL(SUM(CASE WHEN t.Status = 'done'  THEN 1 ELSE 0 END), 0) AS done,
      ISNULL(SUM(CASE WHEN t.Status <> 'done' AND t.DueDate < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) AS overdue
    FROM Tasks t ${where}`);
  return result.recordset[0];
}

async function getById(userId, id) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .query(`SELECT ${COLUMNS} FROM Tasks t WHERE t.TaskId = @id AND ${OWNER}`);

  if (result.recordset.length === 0) throw new AppError("Không tìm thấy nhiệm vụ", 404);
  return result.recordset[0];
}

// Môn học được chọn phải tồn tại (và thuộc người dùng này)
async function assertSubjectExists(userId, subjectId) {
  if (!subjectId) return;
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("subjectId", sql.Int, subjectId)
    .query("SELECT 1 AS ok FROM Subjects WHERE SubjectId = @subjectId AND (@userId IS NULL OR UserId = @userId)");

  if (result.recordset.length === 0) throw new AppError("Môn học không tồn tại", 400);
}

async function create(userId, t) {
  await assertSubjectExists(userId, t.subject_id);

  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("subjectId", sql.Int, t.subject_id)
    .input("title", sql.NVarChar(150), t.title)
    .input("description", sql.NVarChar(500), t.description)
    .input("dueDate", sql.VarChar(10), t.due_date)
    .input("dueTime", sql.VarChar(5), t.due_time)
    .input("priority", sql.VarChar(10), t.priority)
    .input("status", sql.VarChar(10), t.status)
    .query(`
      INSERT INTO Tasks (UserId, SubjectId, Title, Description, DueDate, DueTime, Priority, Status)
      OUTPUT INSERTED.TaskId AS id
      VALUES (@userId, @subjectId, @title, @description,
              CAST(@dueDate AS DATE), CAST(@dueTime AS TIME(0)), @priority, @status)`);

  return getById(userId, result.recordset[0].id);
}

async function update(userId, id, t) {
  await assertSubjectExists(userId, t.subject_id);

  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .input("subjectId", sql.Int, t.subject_id)
    .input("title", sql.NVarChar(150), t.title)
    .input("description", sql.NVarChar(500), t.description)
    .input("dueDate", sql.VarChar(10), t.due_date)
    .input("dueTime", sql.VarChar(5), t.due_time)
    .input("priority", sql.VarChar(10), t.priority)
    .input("status", sql.VarChar(10), t.status)
    .query(`
      UPDATE Tasks
      SET SubjectId = @subjectId, Title = @title, Description = @description,
          DueDate = CAST(@dueDate AS DATE), DueTime = CAST(@dueTime AS TIME(0)),
          Priority = @priority, Status = @status, UpdatedAt = SYSDATETIME()
      WHERE TaskId = @id AND (@userId IS NULL OR UserId = @userId)`);

  if (result.rowsAffected[0] === 0) throw new AppError("Không tìm thấy nhiệm vụ", 404);
  return getById(userId, id);
}

async function remove(userId, id) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .query("DELETE FROM Tasks WHERE TaskId = @id AND (@userId IS NULL OR UserId = @userId)");

  if (result.rowsAffected[0] === 0) throw new AppError("Không tìm thấy nhiệm vụ", 404);
}

module.exports = { list, stats, getById, create, update, remove };