const $ = id => document.getElementById(id);

// Lời chào theo giờ trong ngày
const user = JSON.parse(localStorage.getItem("user") || "null");
const hour = new Date().getHours();
const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
$("hello").textContent = `${greeting}${user && user.name ? ", " + user.name : ""}!`;
$("today").textContent = new Date().toLocaleDateString("vi-VN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// Ghi chú: ưu tiên ghi chú đã ghim (API đã sắp ghim lên trước), lấy tối đa 4
async function loadNotes() {
  try {
    const notes = (await Api.notes.list({})).slice(0, 4);
    $("notesBox").innerHTML = notes.length
      ? notes.map(n => `<a class="item" href="note-editor.html?id=${n.id}">
          <span>${n.pinned ? "★ " : ""}${esc(n.title || "Chưa đặt tiêu đề")}</span>
          <small>${n.tags.map(esc).join(", ")}</small></a>`).join("")
      : `<p class="hint">Bạn chưa có ghi chú nào.</p>`;
  } catch (err) {
    $("notesBox").innerHTML = `<p class="hint">${esc(err.message)}</p>`;
  }
}

// Nhiệm vụ: chờ Thành viên 1 thêm Api.tasks.list vào api.js
async function loadTasks() {
  if (!Api.tasks || !Api.tasks.list) {
    $("tasksBox").innerHTML = `<p class="hint">Nhiệm vụ của bạn sẽ hiển thị ở đây.</p>`;
    return;
  }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await Api.tasks.list({ date: today });
    $("tasksBox").innerHTML = tasks.length
      ? tasks.slice(0, 5).map(t => `<div class="item"><span>${esc(t.title)}</span><small>${esc(t.status || "")}</small></div>`).join("")
      : `<p class="hint">Hôm nay bạn không có nhiệm vụ nào.</p>`;
  } catch (err) {
    $("tasksBox").innerHTML = `<p class="hint">${esc(err.message)}</p>`;
  }
}

loadNotes();
loadTasks();