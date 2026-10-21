// ==========================================================
// components.js – Menu trái + thanh trên + tiện ích dùng chung
// Tự chạy khi tải trang, không cần gọi hàm nào.
// Cần trong HTML:  <aside id="sidebar"></aside>  và  <header id="topbar"></header>
// ==========================================================

// ---------- Tiện ích ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date) ? "" : date.toLocaleDateString("vi-VN");
}

let toastTimer;
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

// ---------- Menu ----------
const NAV = [
  { label: "Học tập", items: [
    { href: "dashboard.html", icon: "fa-table-cells-large", text: "Tổng quan" },
    { href: "subjects.html", icon: "fa-book-open", text: "Môn học" },
    { href: "tasks.html", icon: "fa-list-check", text: "Nhiệm vụ" },
    { href: "schedule.html", icon: "fa-calendar-days", text: "Lịch học" },
  ]},
  { label: "Phát triển", items: [
    { href: "notes.html", icon: "fa-note-sticky", text: "Ghi chú" },
    { href: "goals.html", icon: "fa-bullseye", text: "Mục tiêu" },
    { href: "statistics.html", icon: "fa-chart-simple", text: "Thống kê" },
  ]},
  { label: "Tài khoản", items: [
    { href: "profile.html", icon: "fa-user", text: "Hồ sơ cá nhân" },
  ]},
];

function renderSidebar() {
  const box = document.getElementById("sidebar");
  if (!box) return;

  const page = location.pathname.split("/").pop() || "dashboard.html";

  box.setAttribute("aria-label", "Menu chính");
  box.innerHTML = `
    <div class="sb-head">
      <a class="sb-brand" href="dashboard.html">
        <span class="sb-logo"><img src="images/favicon.png" alt="StudySphere"></span>
        <span>Study<b>Sphere</b></span>
      </a>
      <button type="button" class="sb-close" id="btnCloseMenu" aria-label="Đóng menu"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <nav class="sb-nav">
      ${NAV.map(g => `
        <p class="sb-label">${g.label}</p>
        ${g.items.map(i => `
          <a class="sb-link ${i.href === page ? "active" : ""}" href="${i.href}" ${i.href === page ? 'aria-current="page"' : ""}>
            <i class="fa-solid ${i.icon}"></i><span>${i.text}</span>
          </a>`).join("")}
      `).join("")}
    </nav>
    <div class="sb-bottom">
      <a class="sb-link" href="#" id="btnLogout"><i class="fa-solid fa-right-from-bracket"></i><span>Đăng xuất</span></a>
    </div>`;

  const overlay = document.createElement("div");
  overlay.className = "sb-overlay";
  document.body.append(overlay);

  const setOpen = open => document.body.classList.toggle("nav-open", open);
  overlay.addEventListener("click", () => setOpen(false));
  document.getElementById("btnCloseMenu").addEventListener("click", () => setOpen(false));
  document.getElementById("btnLogout").addEventListener("click", e => {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.href = "login.html";
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });

  return setOpen;
}

function renderTopbar(setOpen) {
  const box = document.getElementById("topbar");
  if (!box) return;

  const page = location.pathname.split("/").pop() || "dashboard.html";
  const current = NAV.flatMap(g => g.items).find(i => i.href === page);
  const title = current ? current.text : "StudyFlow";

  const user = currentUser();
  const name = user.name || user.full_name || "Sinh viên";
  const dateText = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
  });

  box.innerHTML = `
    <div class="th-left">
      <button type="button" class="th-menu" id="btnMenu" aria-label="Mở menu"><i class="fa-solid fa-bars"></i></button>
      <div class="th-crumb">StudyFlow <span>/</span> <strong>${esc(title)}</strong></div>
    </div>
    <div class="th-right">
      <span class="th-date">${esc(dateText)}</span>
      <div class="th-user">
        <span class="th-name">${esc(name)}</span>
        <span class="th-avatar" aria-hidden="true">${esc(name.trim().charAt(0).toUpperCase() || "S")}</span>
      </div>
    </div>`;

  document.getElementById("btnMenu").addEventListener("click", () => setOpen && setOpen(true));
}

renderTopbar(renderSidebar());