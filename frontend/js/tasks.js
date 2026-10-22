// ==========================================================
// tasks.js – Trang Nhiệm vụ
//  - Menu "Nhiệm vụ"            : tasks.html            → nhiệm vụ chung của mọi môn
//  - Bấm tab / thẻ một môn học  : tasks.html?subject=ID → chỉ nhiệm vụ của môn đó
//  - Lịch học bấm "Thêm"        : tasks.html?new=YYYY-MM-DD → mở sẵn form với ngày đó
// ==========================================================
(() => {
  const {
    tasks: TaskAPI, subjects: SubjectAPI, STATUS, STATUS_FLOW, PRIORITY, PRIORITY_RANK,
    todayKey, fmtDay, daysFromToday, subjectColor,
  } = SFData;

  const $ = id => document.getElementById(id);
  const STATUS_ICON = { todo: "fa-regular fa-circle", doing: "fa-solid fa-circle-half-stroke", done: "fa-solid fa-circle-check" };

  const params = new URLSearchParams(location.search);
  const filter = { q: "", date: "", priority: "", status: "all", subject: params.get("subject") || "" };

  let tasks = [];
  let subjects = [];
  let editingId = null;
  let deleteId = null;

  const dlg = $("dlg");
  const form = $("form");

  // Hộp thoại xác nhận xóa (tạo bằng JS)
  const confirmDlg = document.createElement("dialog");
  confirmDlg.className = "dlg";
  confirmDlg.innerHTML = `
    <div class="dlg-body">
      <h3>Xóa nhiệm vụ?</h3>
      <p>Bạn sắp xóa <strong id="confirmName"></strong>. Hành động này không thể hoàn tác.</p>
      <div class="dlg-actions">
        <button type="button" class="btn-soft" id="confirmCancel">Hủy</button>
        <button type="button" class="btn-danger" id="confirmOk"><i class="fa-solid fa-trash"></i> Xóa</button>
      </div>
    </div>`;
  document.body.append(confirmDlg);

  // ---------- Hiển thị ----------
  function dueInfo(t) {
    if (!t.due_date) return { text: "Chưa đặt hạn", cls: "" };
    const diff = daysFromToday(t.due_date);
    let tag = "", cls = "";
    if (t.status !== "done") {
      if (diff < 0) { tag = `Quá hạn ${-diff} ngày`; cls = "overdue"; }
      else if (diff === 0) { tag = "Hôm nay"; cls = "today"; }
      else if (diff === 1) { tag = "Ngày mai"; cls = "soon"; }
    }
    const text = [fmtDay(t.due_date), t.due_time, tag].filter(Boolean).join(" · ");
    return { text, cls };
  }

  function row(t, subjMap) {
    const s = subjMap[t.subject_id];
    const due = dueInfo(t);
    const status = STATUS[t.status] ? t.status : "todo";
    const prio = PRIORITY[t.priority] ? t.priority : "medium";
    return `
      <article class="tk-row ${status === "done" ? "done" : ""}">
        <button type="button" class="tk-status ${status}" data-action="cycle" data-id="${t.id}"
                title="Bấm để đổi trạng thái" aria-label="Trạng thái: ${STATUS[status]}. Bấm để đổi"><i class="${STATUS_ICON[status]}"></i></button>
        <div class="tk-main">
          <div class="tk-title">${esc(t.title)}</div>
          ${t.description ? `<div class="tk-desc">${esc(t.description)}</div>` : ""}
          <div class="tk-meta">
            <span class="tk-subj" style="--c:${s ? subjectColor(s.id) : "#b8aed8"}"><i class="dot"></i>${s ? esc(s.name) : "Chưa có môn"}</span>
            <span class="tk-due ${due.cls}"><i class="fa-regular fa-clock"></i> ${esc(due.text)}</span>
          </div>
        </div>
        <span class="tk-badge st-${status}">${STATUS[status]}</span>
        <span class="tk-badge pr-${prio}">${PRIORITY[prio]}</span>
        <div class="sj-actions">
          <button type="button" class="sj-icon-btn" data-action="edit" data-id="${t.id}" aria-label="Sửa ${esc(t.title)}"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="sj-icon-btn" data-action="delete" data-id="${t.id}" aria-label="Xóa ${esc(t.title)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`;
  }

  const byOrder = (a, b) =>
    (a.status === "done") - (b.status === "done") ||
    (a.due_date || "9999").localeCompare(b.due_date || "9999") ||
    (a.due_time || "99:99").localeCompare(b.due_time || "99:99") ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

  function render() {
    // Tab môn học không còn tồn tại → về "Tất cả"
    if (filter.subject && !subjects.some(s => String(s.id) === filter.subject)) filter.subject = "";

    const subjMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const q = filter.q.toLowerCase();

    const inTab = tasks.filter(t => !filter.subject || String(t.subject_id) === filter.subject);
    const scoped = inTab.filter(t =>
      (!q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)) &&
      (!filter.date || t.due_date === filter.date) &&
      (!filter.priority || t.priority === filter.priority)
    );
    const list = scoped.filter(t => filter.status === "all" || t.status === filter.status).sort(byOrder);

    // Banner
    const current = subjects.find(s => String(s.id) === filter.subject);
    $("tkTitle").textContent = current ? `Nhiệm vụ · ${current.name}` : "Nhiệm vụ & bài tập";
    $("tkSub").textContent = current
      ? `Tất cả nhiệm vụ và deadline của môn ${current.name}${current.code ? " (" + current.code + ")" : ""}.`
      : "Nhiệm vụ chung của tất cả môn học. Chọn một môn ở thanh bên dưới để lọc.";
    $("heroCount").textContent = inTab.filter(t => t.status !== "done").length;

    // Thống kê theo trạng thái
    const count = s => scoped.filter(t => t.status === s).length;
    const pct = scoped.length ? Math.round((count("done") / scoped.length) * 100) : 0;
    const stat = (key, icon, num, label, extra = "") => `
      <button type="button" class="tk-stat ${key} ${filter.status === key ? "on" : ""}" data-status="${key}" aria-pressed="${filter.status === key}">
        <span class="tk-stat-ico"><i class="${icon}"></i></span>
        <span class="tk-stat-body"><span class="tk-stat-num">${num}</span><span class="tk-stat-label">${label}</span>${extra}</span>
      </button>`;
    $("tkStats").innerHTML =
      stat("all", "fa-solid fa-layer-group", scoped.length, "Tổng nhiệm vụ", `<span class="tk-bar"><i style="width:${pct}%"></i></span>`) +
      stat("todo", "fa-regular fa-circle", count("todo"), "Chưa làm") +
      stat("doing", "fa-solid fa-circle-half-stroke", count("doing"), "Đang làm") +
      stat("done", "fa-solid fa-circle-check", count("done"), "Hoàn thành");

    // Tab môn học
    const tab = (id, label, n, color) => `
      <button type="button" class="tk-tab ${String(id) === filter.subject ? "on" : ""}" role="tab" data-subject="${id}" aria-selected="${String(id) === filter.subject}">
        ${color ? `<i class="dot" style="--dot:${color}"></i>` : ""}${esc(label)}<em>${n}</em>
      </button>`;
    $("tkTabs").innerHTML = tab("", "Tất cả", tasks.length) +
      subjects.map(s => tab(s.id, s.name, tasks.filter(t => t.subject_id === s.id).length, subjectColor(s.id))).join("");

    // Danh sách
    $("countText").textContent = `${list.length} nhiệm vụ`;
    $("btnClear").hidden = !(filter.q || filter.date || filter.priority || filter.status !== "all");

    if (list.length === 0) {
      const noData = inTab.length === 0;
      $("taskList").innerHTML = `
        <div class="sj-empty">
          <div class="sj-empty-mark" aria-hidden="true"></div>
          <h3>${noData ? "Chưa có nhiệm vụ nào" : "Không tìm thấy kết quả"}</h3>
          <p>${noData ? "Thêm nhiệm vụ đầu tiên để bắt đầu theo dõi deadline." : "Thử đổi bộ lọc hoặc từ khóa khác nhé."}</p>
          ${noData ? '<button type="button" class="btn-primary" data-add><i class="fa-solid fa-plus"></i> Thêm nhiệm vụ</button>' : ""}
        </div>`;
      return;
    }
    $("taskList").innerHTML = `<div class="tk-list">${list.map(t => row(t, subjMap)).join("")}</div>`;
  }

  async function load() {
    try {
      [tasks, subjects] = await Promise.all([TaskAPI.list(), SubjectAPI.list()]);
    } catch (err) {
      tasks = [];
      subjects = [];
      toast(err.message);
    }
    render();
  }

  // ---------- Thêm / sửa ----------
  function openForm(task, presetDate) {
    editingId = task ? task.id : null;
    $("dlg-title").textContent = task ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ";
    $("t-subject").innerHTML = '<option value="">Không chọn</option>' +
      subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");

    $("t-title").value = task ? task.title : "";
    $("t-desc").value = task ? task.description || "" : "";
    $("t-subject").value = task ? task.subject_id ?? "" : filter.subject;
    $("t-priority").value = task ? task.priority : "medium";
    $("t-date").value = task ? task.due_date || "" : presetDate || filter.date || todayKey();
    $("t-time").value = task ? task.due_time || "" : "";
    $("t-status").value = task ? task.status : "todo";

    $("t-error").textContent = "";
    ["t-title", "t-date"].forEach(id => $(id).classList.remove("invalid"));
    dlg.showModal();
    $("t-title").focus();
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const title = $("t-title").value.trim();
    const date = $("t-date").value;

    $("t-title").classList.toggle("invalid", !title);
    $("t-date").classList.toggle("invalid", !date);
    if (!title) { $("t-error").textContent = "Vui lòng nhập tên nhiệm vụ."; return $("t-title").focus(); }
    if (!date) { $("t-error").textContent = "Vui lòng chọn hạn nộp."; return $("t-date").focus(); }

    const body = {
      title,
      description: $("t-desc").value.trim(),
      subject_id: $("t-subject").value ? Number($("t-subject").value) : null,
      priority: $("t-priority").value,
      due_date: date,
      due_time: $("t-time").value || null,
      status: $("t-status").value,
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const wasEdit = editingId !== null;
      if (wasEdit) await TaskAPI.update(editingId, body);
      else await TaskAPI.create(body);
      dlg.close();
      await load();
      toast(wasEdit ? "Đã cập nhật nhiệm vụ" : "Đã thêm nhiệm vụ");
    } catch (err) {
      $("t-error").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Xóa ----------
  $("confirmCancel").addEventListener("click", () => confirmDlg.close());
  $("confirmOk").addEventListener("click", async () => {
    if (deleteId === null) return;
    try {
      await TaskAPI.remove(deleteId);
      confirmDlg.close();
      await load();
      toast("Đã xóa nhiệm vụ");
    } catch (err) {
      toast(err.message);
    }
    deleteId = null;
  });

  // ---------- Sự kiện ----------
  $("btnAdd").addEventListener("click", () => openForm(null));
  $("btn-cancel").addEventListener("click", () => dlg.close());
  [dlg, confirmDlg].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  let timer;
  $("searchInput").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => { filter.q = e.target.value.trim(); render(); }, 150);
  });
  $("filterDate").addEventListener("change", e => { filter.date = e.target.value; render(); });
  $("filterPriority").addEventListener("change", e => { filter.priority = e.target.value; render(); });
  $("btnClear").addEventListener("click", () => {
    Object.assign(filter, { q: "", date: "", priority: "", status: "all" });
    $("searchInput").value = "";
    $("filterDate").value = "";
    $("filterPriority").value = "";
    render();
  });

  // Chọn trạng thái từ thẻ thống kê (bấm lại để bỏ lọc)
  $("tkStats").addEventListener("click", e => {
    const card = e.target.closest("[data-status]");
    if (!card) return;
    filter.status = filter.status === card.dataset.status ? "all" : card.dataset.status;
    render();
  });

  // Chọn môn học bằng tab, cập nhật địa chỉ để chia sẻ / tải lại vẫn giữ tab
  $("tkTabs").addEventListener("click", e => {
    const tab = e.target.closest("[data-subject]");
    if (!tab) return;
    filter.subject = tab.dataset.subject;
    history.replaceState(null, "", filter.subject ? `?subject=${filter.subject}` : location.pathname);
    render();
  });

  $("taskList").addEventListener("click", async e => {
    if (e.target.closest("[data-add]")) return openForm(null);

    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const task = tasks.find(t => t.id === Number(btn.dataset.id));
    if (!task) return;

    if (btn.dataset.action === "edit") {
      openForm(task);
    } else if (btn.dataset.action === "delete") {
      deleteId = task.id;
      $("confirmName").textContent = task.title;
      confirmDlg.showModal();
    } else {
      try {
        await TaskAPI.update(task.id, { ...task, status: STATUS_FLOW[task.status] || "todo" });
        await load();
      } catch (err) {
        toast(err.message);
      }
    }
  });

  load().then(() => {
    // Từ trang Lịch học: ?new=YYYY-MM-DD → mở sẵn form
    const preset = params.get("new");
    if (preset) {
      history.replaceState(null, "", filter.subject ? `?subject=${filter.subject}` : location.pathname);
      openForm(null, preset);
    }
  });
})();