// ==========================================================
// goal_detail.js – Chi tiết mục tiêu & Quản lý các bước nhỏ (GoalTasks)
// Khi thêm/sửa/xóa/đánh dấu bước: gọi API và tải lại dữ liệu tiến độ từ Backend.
// ==========================================================
(() => {
  renderLayout("goals", "SkillTrack / Chi tiết mục tiêu");
  const $ = id => document.getElementById(id);
  const useSF = typeof SFData !== "undefined" && SFData.goals && SFData.steps;

  const params = new URLSearchParams(location.search);
  const goalId = Number(params.get("id")) || 1;

  const STATUS_LABEL = {
    active: "Đang thực hiện",
    completed: "Hoàn thành",
    paused: "Tạm dừng",
  };

  let currentGoal = null;
  let editingStepId = null;

  const editDlg = $("editStepDlg");
  const editForm = $("editStepForm");

  const fmtDateStr = str => {
    if (!str) return "Chưa đặt";
    const p = String(str).slice(0, 10).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : str;
  };

  function renderGoal(goal) {
    currentGoal = goal;
    const total = Number(goal.total_steps || 0);
    const done = Number(goal.completed_steps || 0);
    const pct = Number(goal.progress || 0);

    $("goalTitle").textContent = `MỤC TIÊU: ${goal.title}`;
    $("goalDesc").textContent = goal.description || "Chia mục tiêu thành các bước nhỏ để hoàn thành đúng thời hạn.";
    $("goalPct").textContent = `${pct}%`;
    $("goalStepRatio").textContent = `${done}/${total} bước`;

    const badge = $("goalStatusBadge");
    badge.className = `st-badge ${goal.status || "active"}`;
    badge.textContent = STATUS_LABEL[goal.status] || "Đang thực hiện";

    $("progFormula").textContent =
      total > 0
        ? `Tiến độ: ${done}/${total} × 100% = ${pct}%`
        : "Chưa có bước thực hiện nào (0%)";
    $("progPercentText").textContent = `${pct}%`;

    const bar = $("progBar");
    bar.style.width = `${pct}%`;
    bar.classList.toggle("done", pct === 100);

    $("metaStart").textContent = fmtDateStr(goal.start_date);
    $("metaTarget").textContent = fmtDateStr(goal.target_date);
    $("metaDoneSteps").textContent = `${done} / ${total} bước`;

    const steps = Array.isArray(goal.steps) ? goal.steps : [];
    if (steps.length === 0) {
      $("stepList").innerHTML = `
        <li class="sc-empty">Chưa có bước thực hiện nào. Hãy thêm bước đầu tiên ở ô bên trên!</li>`;
      return;
    }

    $("stepList").innerHTML = steps
      .map(s => {
        const isDone = s.is_completed === 1 || s.is_completed === true;
        return `
        <li class="step-item ${isDone ? "done" : ""}" data-step-id="${s.id}">
          <button type="button" class="step-check" data-action="toggle" aria-label="Đánh dấu hoàn thành">
            <i class="fa-solid fa-check"></i>
          </button>
          <span class="step-title">${esc(s.title)}</span>
          <div class="step-actions">
            <button type="button" class="sj-pill edit" data-action="edit" title="Sửa bước">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="sj-pill del" data-action="delete" title="Xóa bước">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </li>`;
      })
      .join("");
  }

  async function loadGoalFromApi() {
    try {
      let freshGoal;
      if (useSF) {
        freshGoal = await SFData.goals.get(goalId);
        const rawSteps = await SFData.steps.list(goalId);
        freshGoal.steps = rawSteps.map(s => ({
          ...s,
          is_completed: s.done !== undefined ? (s.done ? 1 : 0) : s.is_completed,
        }));
      } else {
        freshGoal = await Api.goals.get(goalId);
      }
      renderGoal(freshGoal);
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadGoalSessions() {
    try {
      let list;
      if (useSF && SFData.sessions) {
        const all = await SFData.sessions.list();
        list = all.filter(s => Number(s.goal_id) === goalId);
      } else {
        list = await Api.studySessions.list({ goalId });
      }
      if (!list.length) {
        $("goalSessionList").innerHTML = `<p class="sc-empty">Chưa có phiên học nào cho mục tiêu này.</p>`;
        return;
      }
      $("goalSessionList").innerHTML = list
        .map(
          s => `
        <div class="session-item">
          <div class="session-info">
            <strong>${esc(s.notes || "Phiên học tập trung")}</strong>
            <small><i class="fa-regular fa-calendar"></i> ${fmtDate(s.started_at)}</small>
          </div>
          <span class="session-mins">${s.duration_minutes} phút</span>
        </div>`
        )
        .join("");
    } catch (err) {
      toast(err.message);
    }
  }

  // Thêm bước mới -> gọi API -> tải lại dữ liệu tiến độ từ API
  $("addStepForm").addEventListener("submit", async e => {
    e.preventDefault();
    const input = $("newStepTitle");
    const title = input.value.trim();
    if (!title) {
      input.focus();
      return;
    }
    try {
      if (useSF) await SFData.steps.create(goalId, title);
      else await Api.goals.addStep(goalId, { title });
      input.value = "";
      await loadGoalFromApi();
      toast("Đã thêm bước thực hiện");
    } catch (err) {
      toast(err.message);
    }
  });

  // Đánh dấu hoàn thành / Sửa / Xóa bước -> gọi API -> tải lại dữ liệu tiến độ từ API
  $("stepList").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest(".step-item");
    if (!li) return;
    const stepId = Number(li.dataset.stepId);
    const step = (currentGoal?.steps || []).find(s => s.id === stepId);
    if (!step) return;

    const action = btn.dataset.action;
    if (action === "toggle") {
      try {
        if (useSF) {
          const nextDone = !(step.is_completed === 1 || step.is_completed === true || step.done === true);
          await SFData.steps.update(stepId, { done: nextDone, is_completed: nextDone ? 1 : 0 });
        } else {
          await Api.goals.toggleStep(goalId, stepId);
        }
        await loadGoalFromApi();
      } catch (err) {
        toast(err.message);
      }
    } else if (action === "edit") {
      editingStepId = stepId;
      $("editStepInput").value = step.title;
      $("editStepError").textContent = "";
      editDlg.showModal();
      $("editStepInput").focus();
    } else if (action === "delete") {
      if (!confirm(`Xóa bước "${step.title}"?`)) return;
      try {
        if (useSF) await SFData.steps.remove(stepId);
        else await Api.goals.removeStep(goalId, stepId);
        await loadGoalFromApi();
        toast("Đã xóa bước thực hiện");
      } catch (err) {
        toast(err.message);
      }
    }
  });

  editForm.addEventListener("submit", async e => {
    e.preventDefault();
    const title = $("editStepInput").value.trim();
    if (!title) {
      $("editStepError").textContent = "Nội dung bước không được để trống.";
      return;
    }
    try {
      if (useSF) await SFData.steps.update(editingStepId, { title });
      else await Api.goals.updateStep(goalId, editingStepId, { title });
      editDlg.close();
      await loadGoalFromApi();
      toast("Đã cập nhật bước thực hiện");
    } catch (err) {
      $("editStepError").textContent = err.message;
    }
  });

  $("btnCancelStep").addEventListener("click", () => editDlg.close());
  editDlg.addEventListener("click", e => {
    if (e.target === editDlg) editDlg.close();
  });

  // Ghi nhận phiên học cho mục tiêu
  $("sessionForm").addEventListener("submit", async e => {
    e.preventDefault();
    const duration_minutes = Number($("s-minutes").value);
    const notes = $("s-notes").value.trim();
    try {
      if (useSF && SFData.sessions) {
        await SFData.sessions.create({ goal_id: goalId, duration_minutes, notes });
      } else {
        await Api.studySessions.create({ goal_id: goalId, duration_minutes, notes });
      }
      $("s-notes").value = "";
      toast("Đã ghi nhận phiên học!");
      await loadGoalSessions();
    } catch (err) {
      toast(err.message);
    }
  });

  loadGoalFromApi();
  loadGoalSessions();
})();
