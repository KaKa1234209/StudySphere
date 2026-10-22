// Truy vấn SQL cho bảng Subjects. Tên cột được đổi sang dạng frontend dùng (id, code, name...).
const { sql, getPool } = require("../config/db");
const AppError = require("../utils/AppError");

const COLUMNS = `
  SubjectId AS id, Code AS code, Name AS name, Teacher AS teacher, CreatedAt AS created_at`;

// userId = null nghĩa là chưa có đăng nhập: không lọc theo người dùng
const OWNER = "(@userId IS NULL OR UserId = @userId)";

async function list(userId, { q } = {}) {
  const pool = await getPool();
  const request = pool.request().input("userId", sql.Int, userId);

  let where = `WHERE ${OWNER}`;
  if (q) {
    request.input("q", sql.NVarChar(120), `%${q}%`);
    where += " AND (Name LIKE @q OR Code LIKE @q OR Teacher LIKE @q)";
  }
  const result = await request.query(`SELECT ${COLUMNS} FROM Subjects ${where} ORDER BY SubjectId`);
  return result.recordset;
}

async function getById(userId, id) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .query(`SELECT ${COLUMNS} FROM Subjects WHERE SubjectId = @id AND ${OWNER}`);

  if (result.recordset.length === 0) throw new AppError("Không tìm thấy môn học", 404);
  return result.recordset[0];
}

async function create(userId, { code, name, teacher }) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("code", sql.NVarChar(20), code)
    .input("name", sql.NVarChar(100), name)
    .input("teacher", sql.NVarChar(100), teacher)
    .query(`
      INSERT INTO Subjects (UserId, Code, Name, Teacher)
      OUTPUT INSERTED.SubjectId AS id
      VALUES (@userId, @code, @name, @teacher)`);

  return getById(userId, result.recordset[0].id);
}

async function update(userId, id, { code, name, teacher }) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .input("code", sql.NVarChar(20), code)
    .input("name", sql.NVarChar(100), name)
    .input("teacher", sql.NVarChar(100), teacher)
    .query(`
      UPDATE Subjects
      SET Code = @code, Name = @name, Teacher = @teacher
      WHERE SubjectId = @id AND ${OWNER}`);

  if (result.rowsAffected[0] === 0) throw new AppError("Không tìm thấy môn học", 404);
  return getById(userId, id);
}

// Xóa môn: các nhiệm vụ của môn vẫn còn, cột SubjectId tự chuyển về NULL (ON DELETE SET NULL)
async function remove(userId, id) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("id", sql.Int, id)
    .query(`DELETE FROM Subjects WHERE SubjectId = @id AND ${OWNER}`);

  if (result.rowsAffected[0] === 0) throw new AppError("Không tìm thấy môn học", 404);
}

module.exports = { list, getById, create, update, remove };