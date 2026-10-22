const express = require("express");
const path = require("path");
const errorHandler = require("./middleware/error-handler");

const app = express();
app.use(express.json());

// Phục vụ giao diện frontend và thư mục ảnh
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/images", express.static(path.join(__dirname, "..", "images")));

// Các module (mỗi thành viên thêm route của mình vào đây)
app.use("/api/notes", require("./routes/note.routes")); // Thành viên 2 – NoteHub

// Thành viên 3 – SkillTrack & Hệ thống (Auth, Goals, StudySessions, Dashboard)
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/goals", require("./routes/goal.routes"));
app.use("/api/study-sessions", require("./routes/study-session.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

app.use(errorHandler); // luôn đặt cuối cùng
module.exports = app;