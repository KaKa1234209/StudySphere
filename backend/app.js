const express = require("express");
const path = require("path");
const errorHandler = require("./middleware/error-handler");

const app = express();
app.use(express.json());

// Phục vụ giao diện frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Các module (mỗi thành viên thêm route của mình vào đây)
app.use("/api/notes", require("./routes/note.routes")); // Thành viên 2 – NoteHub

app.use(errorHandler); // luôn đặt cuối cùng
module.exports = app;