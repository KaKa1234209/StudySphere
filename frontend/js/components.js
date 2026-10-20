/* ===== Hàm tiện ích ===== */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

// Danh sách môn học tạm cho NoteHub (sau này lấy từ Api.subjects)
const SUBJECTS = [
  { id: 1, name: "Toán" }, { id: 2, name: "Ngữ văn" },
  { id: 3, name: "Tiếng Anh" }, { id: 4, name: "Lập trình" },
];

// Lấy môn học người dùng đã tạo ở trang Môn học; chưa có thì dùng danh sách mẫu
function getSubjects() {
  try {
    const saved = JSON.parse(localStorage.getItem("studysphere.subjects"));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return SUBJECTS;
}
function fillSubjects(select, withAll) {
  select.innerHTML =
    `<option value="">${withAll ? "Tất cả môn học" : "Không chọn"}</option>` +
    getSubjects().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
}

/* ===== Đăng nhập ===== */
// Để true khi chưa có đăng nhập. Thành viên 3 làm xong auth thì ĐỔI THÀNH false.
const DEV_NO_AUTH = true;

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user")) || { name: "Khách" }; }
  catch { return { name: "Khách" }; }
};

function requireLogin() {
  if (!DEV_NO_AUTH && !localStorage.getItem("token")) location.replace("login.html");
}
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "index.html";
}

// Ảnh đại diện mặc định: vòng tròn tím có chữ cái đầu của tên
function avatarFor(name) {
  const letter = esc((name || "?").trim().charAt(0).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#8c7ad0"/>` +
    `<text x="40" y="53" font-size="36" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/* ===== Menu: CHỈ sửa mảng này khi thêm/bớt trang ===== */
const MENU_GROUPS = [
  { title: "HỌC TẬP", items: [
    { key: "overview",   icon: "fa-solid fa-chart-pie",       label: "Tổng quan", href: "dashboard.html" },
    { key: "subjects",   icon: "fa-solid fa-book",            label: "Môn học",   href: "subjects.html" },
    { key: "tasks",      icon: "fa-solid fa-list-check",      label: "Nhiệm vụ",  href: "tasks.html" },
    { key: "schedule",   icon: "fa-regular fa-calendar-days", label: "Lịch học",  href: "schedule.html" },
  ]},
  { title: "PHÁT TRIỂN", items: [
    { key: "notes",      icon: "fa-regular fa-note-sticky",   label: "Ghi chú",   href: "notes.html" },
    { key: "goals",      icon: "fa-solid fa-bullseye",        label: "Mục tiêu",  href: "goals.html" },
    { key: "statistics", icon: "fa-solid fa-chart-line",      label: "Thống kê",  href: "statistics.html" },
  ]},
  { title: "TÀI KHOẢN", items: [
    { key: "profile",    icon: "fa-regular fa-user",          label: "Hồ sơ cá nhân", href: "profile.html" },
  ]},
];

/* ===== Sidebar + Header dùng chung ===== */
function renderSidebar(active) {
  const el = document.getElementById("sidebar");
  if (!el) return console.error('Thiếu khung <aside class="sidebar" id="sidebar"></aside> trong trang này');
  el.innerHTML = `
    <div class="logo-section">
      <img src="../images/favicon.png" alt="StudySphere" class="logo-img">
      <span class="logo-text">StudySphere</span>
    </div>
    <nav class="sidebar-nav">
      ${MENU_GROUPS.map(g => `
        <div class="nav-group">
          <span class="group-title">${g.title}</span>
          ${g.items.map(i => `<a href="${i.href}" class="nav-item ${i.key === active ? "active" : ""}">
            <i class="${i.icon}"></i><span>${i.label}</span></a>`).join("")}
        </div>`).join("")}
      <div class="nav-group">
        <a href="#" class="nav-item" id="logoutLink"><i class="fa-solid fa-right-from-bracket"></i><span>Đăng xuất</span></a>
      </div>
    </nav>`;
  document.getElementById("logoutLink").addEventListener("click", e => { e.preventDefault(); logout(); });
}

function renderTopbar(title) {
  const el = document.getElementById("topbar");
  if (!el) return console.error('Thiếu khung <header class="top-header" id="topbar"></header> trong trang này');
  const user = getUser();
  el.innerHTML = `
    <div class="header-title"><h2>${esc(title)}</h2></div>
    <div class="header-actions">
      <div class="focus-toggle-wrapper">
        <span>Focus Mode</span>
        <label class="switch"><input type="checkbox" id="focusToggle"><span class="slider round"></span></label>
      </div>
      <button class="icon-btn bell-btn" aria-label="Thông báo"><i class="fa-regular fa-bell"></i></button>
      <a class="user-profile" href="profile.html">
        <img src="${user.avatar || avatarFor(user.name)}" alt="Ảnh đại diện">
        <div class="user-info"><span class="name">${esc(user.name)}</span><span class="role">Sinh viên</span></div>
      </a>
    </div>`;
}

/* ===== Focus Mode ===== */
const FOCUS_KEY = "studysphere.focus";

function setupFocusMode() {
  const toggle = document.getElementById("focusToggle");
  if (!toggle) return;
  const on = localStorage.getItem(FOCUS_KEY) === "1";
  document.body.classList.toggle("focus-mode", on);
  toggle.checked = on;
  toggle.addEventListener("change", () => {
    document.body.classList.toggle("focus-mode", toggle.checked);
    localStorage.setItem(FOCUS_KEY, toggle.checked ? "1" : "0");
    toast(toggle.checked ? "Đã bật Focus Mode" : "Đã tắt Focus Mode");
  });
}

// Mỗi trang chỉ cần gọi 1 dòng này. Tự chờ trang tải xong nếu gọi quá sớm.
function renderLayout(active, title) {
  requireLogin();
  const run = () => { renderSidebar(active); renderTopbar(title); setupFocusMode(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}