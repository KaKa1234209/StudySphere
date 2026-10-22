// ==========================================================
// goals.js – Quản lý danh sách mục tiêu học tập (SkillTrack)
// ==========================================================
(() => {
  renderLayout("goals", "SkillTrack / Mục tiêu");
  const $ = id => document.getElementById(id);

  const STATUS_LABEL = {
    active: "Đang thực hiện",
    completed: "Hoàn thành",
    paused: "Tạm dừng",
  };

  let allGoals = [];
  let editingId = null;
  let filterStatus = "";

  const dlg = $("goalDlg");
  const form = $("goalForm");

  const fmtShortDate = str => {
    if (!str) return "Chưa đặt";
    const parts = String(str).slice(0, 10).split("-");
    if (parts.length !== 3) return str;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  function renderStats() {
    const total = allGoals.length;
    const active = allGoals.filter(g => g.status === "active").length;
    const completed = allGoals.filter(g => g.status === "completed").length;
    const paused = allGoals.filter(g => g.status === "paused").length;
    const avg = total ? Math.round(allGoals.reduce((s, g) => s + (g.progress || 0), 0) / total) : 0;

    $("heroAvg").textContent = `${avg}%`;

    const cards = [
      { key: "", label: "Tất cả mục tiêu", num: total, ico: "fa-bullseye", cls: "" },
      { key: "active", label: "Đang thực hiện", num: active, ico: "fa-spinner", cls: "doing" },
      { key: "completed", label: "Đã hoàn thành", num: completed, ico: "fa-circle-check", cls: "done" },
      { key: "paused", label: "Tạm dừng", num: paused, ico: "fa-circle-pause", cls: "todo" },
    ];

    $("goalStats").innerHTML = cards
      .map(
        c => `
      <button type="button" class="tk-stat ${c.cls} ${filterStatus === c.key ? "on" : ""}" data-status="${c.key}">
        <span class="tk-stat-ico"><i class="fa-solid ${c.ico}"></i></span>
        <span class="tk-stat-body">
          <span class="tk-stat-num">${c.num}</span>
          <span class="tk-stat-label">${c.label}</span>
        </span>
      </button>`
      )
      .join("");
  }

  function renderList() {
    const q = $("searchInput").value.trim().toLowerCase();
    const list = allGoals.filter(
      g =>
        (!filterStatus || g.status === filterStatus) &&
        (!q || (g.title + " " + (g.description || "")).toLowerCase().includes(q))
    );

    $("goalCountText").textContent = `${list.length} mục tiêu`;

    if (list.length === 0) {
      $("goalList").innerHTML = `
        <div class="sj-empty">
          <div class="sj-empty-mark" aria-hidden="true"></div>
          <h3>${allGoals.length === 0 ? "Chưa có mục tiêu học tập nào" : "Không tìm thấy mục tiêu phù hợp"}</h3>
          <p>${allGoals.length === 0 ? "Hãy tạo mục tiêu đầu tiên và chia thành các bước nhỏ để theo dõi tiến độ." : "Thử đổi từ khóa hoặc bộ lọc trạng thái nhé."}</p>
        </div>`;
      return;
    }

    $("goalList").innerHTML = `
      <div class="gl-table-wrap">
        <table class="gl-table">
          <thead>
            <tr>
              <th>Mục tiêu</th>
              <th>Ngày bắt đầu &amp; Thời hạn</th>
              <th>Tiến độ</th>
              <th>Trạng thái</th>
              <th style="text-align:right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(g => {
                const pct = Number(g.progress || 0);
                const stepSummary = `${g.completed_steps || 0}/${g.total_steps || 0} bước`;
                return `
                <tr>
                  <td>
                    <a class="gl-title-link" href="goal_detail.html?id=${g.id}">${esc(g.title)}</a>
                    ${g.description ? `<div class="gl-desc">${esc(g.description)}</div>` : ""}
                  </td>
                  <td>
                    <div class="gl-dates">
                      <span><i class="fa-regular fa-flag"></i> Hạn: <strong>${esc(fmtShortDate(g.target_date))}</strong></span>
                      <small>Bắt đầu: ${esc(fmtShortDate(g.start_date))}</small>
                    </div>
                  </td>
                  <td class="gl-prog-cell">
                    <div class="st-progress-wrap">
                      <div class="st-progress-head">
                        <span>${stepSummary}</span>
                        <span>${pct}%</span>
                      </div>
                      <div class="st-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                        <div class="st-progress-fill ${pct === 100 ? "done" : ""}" style="width:${pct}%"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="st-badge ${esc(g.status)}">${esc(STATUS_LABEL[g.status] || "Đang thực hiện")}</span>
                  </td>
                  <td>
                    <div class="sj-actions" style="justify-content:flex-end">
                      <a class="sj-pill view" href="goal_detail.html?id=${g.id}" title="Xem chi tiết các bước">
                        <i class="fa-solid fa-list-check"></i> Chi tiết
                      </a>
                      <button type="button" class="sj-pill edit" data-action="edit" data-id="${g.id}">
                        <i class="fa-solid fa-pen"></i> Sửa
                      </button>
                      <button type="button" class="sj-pill del" data-action="delete" data-id="${g.id}">
                        <i class="fa-solid fa-trash"></i> Xóa
                      </button>
                    </div>
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  async function loadGoals() {
    try {
      allGoals = await Api.goals.list();
      renderStats();
      renderList();
    } catch (err) {
      toast(err.message);
    }
  }

  function openDialog(goal = null) {
    editingId = goal ? goal.id : null;
    $("dlgTitle").textContent = goal ? "Chỉnh sửa mục tiêu" : "Thêm mục tiêu mới";
    $("g-title").value = goal ? goal.title : "";
    $("g-desc").value = goal ? goal.description || "" : "";
    $("g-start").value = goal ? (goal.start_date || "").slice(0, 10) : new Date().toISOString().slice(0, 10);
    $("g-target").value = goal ? (goal.target_date || "").slice(0, 10) : "";
    $("g-status").value = goal ? goal.status || "active" : "active";
    $("g-steps").value = "";
    $("initialStepsWrap").hidden = Boolean(goal);
    $("g-error").textContent = "";
    dlg.showModal();
    $("g-title").focus();
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const title = $("g-title").value.trim();
    if (!title) {
      $("g-error").textContent = "Vui lòng nhập tên mục tiêu.";
      $("g-title").focus();
      return;
    }

    const payload = {
      title,
      description: $("g-desc").value.trim(),
      start_date: $("g-start").value || null,
      target_date: $("g-target").value || null,
      status: $("g-status").value,
    };

    if (!editingId) {
      const rawSteps = $("g-steps")
        .value.split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      if (rawSteps.length) payload.steps = rawSteps;
    }

    try {
      if (editingId) {
        await Api.goals.update(editingId, payload);
        toast("Đã cập nhật mục tiêu");
      } else {
        await Api.goals.create(payload);
        toast("Đã tạo mục tiêu mới");
      }
      dlg.close();
      await loadGoals();
    } catch (err) {
      $("g-error").textContent = err.message;
    }
  });

  $("btnAddGoal").addEventListener("click", () => openDialog(null));
  $("btnCancel").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => {
    if (e.target === dlg) dlg.close();
  });

  $("searchInput").addEventListener("input", renderList);
  $("filterStatus").addEventListener("change", e => {
    filterStatus = e.target.value;
    renderStats();
    renderList();
  });

  $("goalStats").addEventListener("click", e => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;
    filterStatus = btn.dataset.status;
    $("filterStatus").value = filterStatus;
    renderStats();
    renderList();
  });

  $("goalList").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const goal = allGoals.find(g => g.id === Number(btn.dataset.id));
    if (!goal) return;

    if (btn.dataset.action === "edit") {
      openDialog(goal);
    } else if (btn.dataset.action === "delete") {
      if (!confirm(`Bạn có chắc muốn xóa mục tiêu "${goal.title}"?`)) return;
      try {
        await Api.goals.remove(goal.id);
        toast("Đã xóa mục tiêu");
        await loadGoals();
      } catch (err) {
        toast(err.message);
      }
    }
  });

  loadGoals();
})();
