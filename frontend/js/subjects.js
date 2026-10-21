// ==========================================================
// subjects.js – Trang Môn học (thêm / sửa / xóa / tìm kiếm)
// Dữ liệu: tạm lưu localStorage (USE_MOCK = true).
// Khi backend xong: đặt USE_MOCK = false để gọi /api/subjects.
// Môn học: { id, code, name, teacher, created_at }
// ==========================================================
(() => {
  const USE_MOCK = true;
  const API = "/api/subjects";
  const KEY = "sf_subjects";
  const COLORS = ["#8c7ad0", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#4f46e5", "#64748b"];

  // Dữ liệu mẫu cho lần mở đầu tiên
  const SEED = [
    ["MATH101", "Toán học", ""],
    ["PROG201", "Ngôn ngữ lập trình", ""],
    ["DB301", "Cơ sở dữ liệu", ""],
    ["NET201", "Mạng máy tính", ""],
    ["WEB301", "Thiết kế web", ""],
    ["ENG201", "Tiếng Anh", ""],
  ].map(([code, name, teacher], i) => ({ id: i + 1, code, name, teacher, created_at: new Date().toISOString() }));

  const $ = id => document.getElementById(id);

  // ---------- Lấy / lưu dữ liệu ----------
  async function http(url, options = {}) {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || "Có lỗi xảy ra, vui lòng thử lại");
    return json.data !== undefined ? json.data : json;
  }

  const readLocal = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) { writeLocal(SEED); return [...SEED]; }
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  };
  const writeLocal = list => localStorage.setItem(KEY, JSON.stringify(list));

  const Data = USE_MOCK ? {
    list: async () => readLocal(),
    create: async body => {
      const list = readLocal();
      const item = { ...body, id: Math.max(0, ...list.map(s => s.id)) + 1, created_at: new Date().toISOString() };
      writeLocal([...list, item]);
      return item;
    },
    update: async (id, body) => writeLocal(readLocal().map(s => (s.id === Number(id) ? { ...s, ...body } : s))),
    remove: async id => writeLocal(readLocal().filter(s => s.id !== Number(id))),
  } : {
    list: () => http(API),
    create: body => http(API, { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => http(`${API}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: id => http(`${API}/${id}`, { method: "DELETE" }),
  };

  // ---------- Trạng thái ----------
  let subjects = [];
  let editingId = null;
  let deleteId = null;

  const dlg = $("dlg");
  const form = $("form");

  // Hộp thoại xác nhận xóa (tạo bằng JS để không phải sửa HTML)
  const confirmDlg = document.createElement("dialog");
  confirmDlg.className = "dlg";
  confirmDlg.innerHTML = `
    <div class="dlg-body">
      <h3>Xóa môn học?</h3>
      <p>Bạn sắp xóa môn <strong id="confirmName"></strong>. Hành động này không thể hoàn tác.</p>
      <div class="dlg-actions">
        <button type="button" class="btn-soft" id="confirmCancel">Hủy</button>
        <button type="button" class="btn-danger" id="confirmOk"><i class="fa-solid fa-trash"></i> Xóa</button>
      </div>
    </div>`;
  document.body.append(confirmDlg);

  // ---------- Hiển thị ----------
  function card(s) {
    const color = COLORS[s.id % COLORS.length];
    return `
      <article class="sj-card" style="--c:${color}">
        <div class="sj-card-top">
          <span class="sj-avatar">${esc(s.name.trim().charAt(0).toUpperCase())}</span>
          <div class="sj-info">
            <div class="sj-name">${esc(s.name)}</div>
            ${s.code ? `<span class="sj-code">${esc(s.code)}</span>` : ""}
          </div>
        </div>
        <div class="sj-line ${s.teacher ? "" : "muted"}">
          <i class="fa-solid fa-chalkboard-user"></i>
          <span>${s.teacher ? esc(s.teacher) : "Chưa có giáo viên"}</span>
        </div>
        <div class="sj-card-foot">
          <span class="sj-date"><i class="fa-regular fa-calendar"></i> ${fmtDate(s.created_at)}</span>
          <div class="sj-actions">
            <button type="button" class="sj-pill edit" data-action="edit" data-id="${s.id}" aria-label="Sửa môn ${esc(s.name)}"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button type="button" class="sj-pill del" data-action="delete" data-id="${s.id}" aria-label="Xóa môn ${esc(s.name)}"><i class="fa-solid fa-trash"></i> Xóa</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const q = $("searchInput").value.trim().toLowerCase();
    const list = subjects.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q) ||
      (s.teacher || "").toLowerCase().includes(q)
    );

    $("heroCount").textContent = subjects.length;
    $("countText").textContent = `${list.length} môn học`;

    if (list.length === 0) {
      const noData = subjects.length === 0;
      $("subjectList").innerHTML = `
        <div class="sj-empty">
          <div class="sj-empty-mark" aria-hidden="true"></div>
          <h3>${noData ? "Chưa có môn học nào" : "Không tìm thấy kết quả"}</h3>
          <p>${noData ? "Hãy thêm môn học đầu tiên của bạn để bắt đầu sắp xếp việc học." : "Thử tìm bằng từ khóa khác nhé."}</p>
          ${noData ? '<button type="button" class="btn-primary" data-add><i class="fa-solid fa-plus"></i> Thêm môn học</button>' : ""}
        </div>`;
      return;
    }

    // Ô "Thêm môn học" nằm cuối lưới (ẩn khi đang tìm kiếm)
    const addTile = q ? "" : `<button type="button" class="sj-add-tile" data-add><i class="fa-solid fa-plus"></i>Thêm môn học</button>`;
    $("subjectList").innerHTML = `<div class="sj-grid">${list.map(card).join("")}${addTile}</div>`;
  }

  async function load() {
    try {
      subjects = await Data.list();
    } catch (err) {
      subjects = [];
      toast(err.message);
    }
    render();
  }

  // ---------- Thêm / sửa ----------
  function openForm(subject) {
    editingId = subject ? subject.id : null;
    $("dlg-title").textContent = subject ? "Sửa môn học" : "Thêm môn học";
    $("f-code").value = subject ? subject.code || "" : "";
    $("f-name").value = subject ? subject.name : "";
    $("f-teacher").value = subject ? subject.teacher || "" : "";
    $("f-error").textContent = "";
    ["f-code", "f-name", "f-teacher"].forEach(id => $(id).classList.remove("invalid"));
    dlg.showModal();
    $("f-name").focus();
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const code = $("f-code").value.trim().toUpperCase();
    const name = $("f-name").value.trim();
    const teacher = $("f-teacher").value.trim();

    $("f-name").classList.toggle("invalid", !name);
    $("f-code").classList.remove("invalid");
    if (!name) {
      $("f-error").textContent = "Vui lòng nhập tên môn học.";
      return $("f-name").focus();
    }
    if (code && subjects.some(s => s.id !== editingId && (s.code || "").toUpperCase() === code)) {
      $("f-code").classList.add("invalid");
      $("f-error").textContent = "Mã môn này đã tồn tại.";
      return $("f-code").focus();
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const body = { code, name, teacher };
      const wasEdit = editingId !== null;
      if (wasEdit) await Data.update(editingId, body);
      else await Data.create(body);
      dlg.close();
      $("searchInput").value = "";
      await load();
      toast(wasEdit ? "Đã cập nhật môn học" : "Đã thêm môn học");
    } catch (err) {
      $("f-error").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Xóa ----------
  $("confirmCancel").addEventListener("click", () => confirmDlg.close());
  $("confirmOk").addEventListener("click", async () => {
    if (deleteId === null) return;
    try {
      await Data.remove(deleteId);
      confirmDlg.close();
      await load();
      toast("Đã xóa môn học");
    } catch (err) {
      toast(err.message);
    }
    deleteId = null;
  });

  // ---------- Sự kiện ----------
  $("btnAddHero").addEventListener("click", () => openForm(null));
  $("btn-cancel").addEventListener("click", () => dlg.close());
  $("searchInput").addEventListener("input", render);

  // Bấm ra ngoài hộp thoại để đóng
  [dlg, confirmDlg].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  $("subjectList").addEventListener("click", e => {
    if (e.target.closest("[data-add]")) return openForm(null);

    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const subject = subjects.find(s => s.id === Number(btn.dataset.id));
    if (!subject) return;

    if (btn.dataset.action === "edit") {
      openForm(subject);
    } else {
      deleteId = subject.id;
      $("confirmName").textContent = subject.name;
      confirmDlg.showModal();
    }
  });

  load();
})();