const db = require("../config/database");

// Repository chỉ chứa SQL, không chứa logic nghiệp vụ.
const tagsOf = noteId =>
  db.prepare("SELECT t.name FROM Tags t JOIN NoteTags nt ON nt.tag_id=t.id WHERE nt.note_id=?")
    .all(noteId).map(r => r.name);
const withTags = n => n && { ...n, tags: tagsOf(n.id) };

exports.findAll = (userId, { q, tag, subjectId }) => {
  let sql = `SELECT DISTINCT n.* FROM Notes n
             LEFT JOIN NoteTags nt ON nt.note_id=n.id
             LEFT JOIN Tags t ON t.id=nt.tag_id
             WHERE n.user_id=?`;
  const args = [userId];
  if (q) {                                    // tìm theo tiêu đề, nội dung, tên thẻ
    sql += " AND (n.title LIKE ? OR n.content LIKE ? OR t.name LIKE ?)";
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (tag) {                                  // lọc theo 1 thẻ
    sql += ` AND n.id IN (SELECT x.note_id FROM NoteTags x JOIN Tags y ON y.id=x.tag_id WHERE y.name=?)`;
    args.push(tag);
  }
  if (subjectId) { sql += " AND n.subject_id=?"; args.push(subjectId); }
  sql += " ORDER BY n.pinned DESC, n.updated_at DESC";   // ghim lên đầu
  return db.prepare(sql).all(...args).map(withTags);
};

exports.findById = (userId, id) =>
  withTags(db.prepare("SELECT * FROM Notes WHERE id=? AND user_id=?").get(id, userId));

exports.insert = (userId, d) =>
  db.prepare(`INSERT INTO Notes(user_id,subject_id,task_id,title,content,pinned) VALUES(?,?,?,?,?,?)`)
    .run(userId, d.subject_id || null, d.task_id || null, d.title || "", d.content || "", d.pinned ? 1 : 0)
    .lastInsertRowid;

exports.update = (userId, id, d) =>
  db.prepare(`UPDATE Notes SET subject_id=?,task_id=?,title=?,content=?,pinned=?,updated_at=CURRENT_TIMESTAMP
              WHERE id=? AND user_id=?`)
    .run(d.subject_id || null, d.task_id || null, d.title || "", d.content || "", d.pinned ? 1 : 0, id, userId);

exports.togglePin = (userId, id) =>
  db.prepare("UPDATE Notes SET pinned=1-pinned WHERE id=? AND user_id=?").run(id, userId);

exports.remove = (userId, id) =>
  db.prepare("DELETE FROM Notes WHERE id=? AND user_id=?").run(id, userId);

// Xóa hết thẻ cũ của ghi chú rồi gắn lại danh sách mới (trong 1 transaction)
exports.replaceTags = db.transaction((userId, noteId, names) => {
  db.prepare("DELETE FROM NoteTags WHERE note_id=?").run(noteId);
  for (const name of names) {
    db.prepare("INSERT OR IGNORE INTO Tags(user_id,name) VALUES(?,?)").run(userId, name);
    const tag = db.prepare("SELECT id FROM Tags WHERE user_id=? AND name=?").get(userId, name);
    db.prepare("INSERT OR IGNORE INTO NoteTags(note_id,tag_id) VALUES(?,?)").run(noteId, tag.id);
  }
});

exports.findAllTags = userId =>
  db.prepare("SELECT name FROM Tags WHERE user_id=? ORDER BY name").all(userId).map(r => r.name);