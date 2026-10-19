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

// ===== Thanh menu dùng chung cho mọi trang =====
// Thêm/sửa trang: chỉ cần sửa mảng MENU này, tất cả trang tự cập nhật.
const MENU = [
  { key: "home",       label: "Trang chủ", href: "index.html" },
  { key: "subjects",   label: "Môn học",   href: "subjects.html" },     // Thành viên 1
  { key: "tasks",      label: "Nhiệm vụ",  href: "tasks.html" },        // Thành viên 1
  { key: "schedule",   label: "Lịch học",  href: "schedule.html" },     // Thành viên 1
  { key: "notes",      label: "Ghi chú",   href: "notes.html" },        // Thành viên 2
  { key: "goals",      label: "Mục tiêu",  href: "goals.html" },        // Thành viên 3
  { key: "statistics", label: "Thống kê",  href: "statistics.html" },   // Thành viên 3
];

function renderNavbar(active) {
  const el = document.getElementById("navbar");
  if (!el) return;
  const loggedIn = !!localStorage.getItem("token");

  el.className = "top";
  el.innerHTML = `
    <a class="brand" href="index.html">
      <img src="images/favicon.png" alt="" class="brand-icon">
      <span class="brand-name">Study<span>Sphere</span></span>
    </a>
    <nav class="menu" id="menu" aria-label="Menu chính">
      ${MENU.map(m => `<a href="${m.href}" class="${m.key === active ? "active" : ""}">${m.label}</a>`).join("")}
    </nav>
    <div class="auth">
      ${loggedIn
        ? `<a class="btn ghost" href="profile.html">Hồ sơ</a><button class="btn" id="logout">Đăng xuất</button>`
        : `<a class="btn ghost" href="login.html">Đăng nhập</a><a class="btn" href="register.html">Đăng ký</a>`}
    </div>
    <button class="menu-toggle" id="menuToggle" aria-label="Mở menu" aria-expanded="false">☰</button>`;

  // Nút ☰ trên điện thoại: mở/đóng menu
  const toggle = document.getElementById("menuToggle");
  toggle.addEventListener("click", () => {
    const open = document.getElementById("menu").classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  // Đăng xuất: xóa token rồi về trang chủ
  const logout = document.getElementById("logout");
  if (logout) logout.addEventListener("click", () => {
    localStorage.removeItem("token");
    location.href = "index.html";
  });
}