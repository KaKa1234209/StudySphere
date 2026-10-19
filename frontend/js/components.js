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

// ===== Menu dọc dùng chung + chặn người chưa đăng nhập =====

// Khi chưa làm xong đăng nhập, để true để vào thẳng các trang mà không cần token.
// Khi Thành viên 3 làm xong auth, ĐỔI THÀNH false.
const DEV_NO_AUTH = true;

// Thêm/sửa trang trong menu: chỉ cần sửa mảng này, mọi trang tự cập nhật.
const MENU = [
  { key: "dashboard",  icon: "🏠", label: "Trang chủ", href: "dashboard.html" },
  { key: "subjects",   icon: "📚", label: "Môn học",   href: "subjects.html" },    // Thành viên 1
  { key: "tasks",      icon: "✅", label: "Nhiệm vụ",  href: "tasks.html" },       // Thành viên 1
  { key: "schedule",   icon: "🗓️", label: "Lịch học",  href: "schedule.html" },    // Thành viên 1
  { key: "notes",      icon: "📝", label: "Ghi chú",   href: "notes.html" },       // Thành viên 2
  { key: "goals",      icon: "🎯", label: "Mục tiêu",  href: "goals.html" },       // Thành viên 3
  { key: "statistics", icon: "📊", label: "Thống kê",  href: "statistics.html" },  // Thành viên 3
  { key: "profile",    icon: "👤", label: "Hồ sơ",     href: "profile.html" },     // Thành viên 3
];

// Chưa đăng nhập thì đưa về trang đăng nhập
function requireLogin() {
  if (!DEV_NO_AUTH && !localStorage.getItem("token")) location.replace("login.html");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "index.html";
}

// active = key của trang hiện tại, ví dụ renderNavbar("notes")
function renderNavbar(active) {
  requireLogin();
  const el = document.getElementById("navbar");
  if (!el) return;
  const user = JSON.parse(localStorage.getItem("user") || "null");   // auth.js lưu { name, email } khi đăng nhập

  document.body.classList.add("has-sidebar");
  el.className = "sidebar";
  el.innerHTML = `
    <a class="brand" href="dashboard.html">
      <img src="images/favicon.png" alt="" class="brand-icon">
      <span class="brand-name">Study<span>Sphere</span></span>
    </a>
    <nav aria-label="Menu chính">
      ${MENU.map(m => `<a href="${m.href}" class="${m.key === active ? "active" : ""}"><span>${m.icon}</span>${m.label}</a>`).join("")}
    </nav>
    <div class="user">
      <b>${esc(user ? user.name || user.email : "Khách")}</b>
      <button id="logoutBtn">Đăng xuất</button>
    </div>`;

  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Nút ☰ trên điện thoại
  const toggle = document.createElement("button");
  toggle.className = "side-toggle";
  toggle.textContent = "☰";
  toggle.setAttribute("aria-label", "Mở menu");
  toggle.addEventListener("click", () => el.classList.toggle("open"));
  document.body.append(toggle);
}