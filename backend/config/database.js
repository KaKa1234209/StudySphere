const Database = require("better-sqlite3");
const db = new Database(process.env.DB_FILE || "studysphere.db");
db.pragma("foreign_keys = ON");

// Bảng của module NoteHub: Notes, Tags, NoteTags
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

module.exports = db;