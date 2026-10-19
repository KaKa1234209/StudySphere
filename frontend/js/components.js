// Chống chèn mã HTML khi hiển thị nội dung người dùng nhập
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Thông báo nhỏ ở cuối màn hình
function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

// Danh sách môn học tạm (sau này lấy từ Api của module Subjects)
const SUBJECTS = [
  { id: 1, name: "Toán" }, { id: 2, name: "Ngữ văn" },
  { id: 3, name: "Tiếng Anh" }, { id: 4, name: "Lập trình" },
];
function fillSubjects(select, withAll) {
  select.innerHTML =
    `<option value="">${withAll ? "Tất cả môn học" : "Không chọn"}</option>` +
    SUBJECTS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}
