// ==========================================================
// statistics.js – Biểu đồ tiến độ, thời gian học và chuỗi ngày học
// ==========================================================
(() => {
  renderLayout("statistics", "SkillTrack / Thống kê");
  const $ = id => document.getElementById(id);
  const { summary: loadSummary, sessions: SessionAPI, todayKey } = SFData;   // ĐỔI: lấy từ SFData

  const dlg = $("sessionDlg");
  const form = $("sessionForm");

  function renderSummary(data) {
    const { goals, study } = data;
    $("heroStreak").textContent = study.current_streak || 0;

    const cards = [
      {
        num: `${study.current_streak || 0} ngày`,
        label: `Chuỗi ngày học (Kỷ lục: ${study.best_streak || 0})`,
        ico: "fa-fire",
        cls: "doing",
      },
      {
        num: `${study.total_hours || 0}h`,
        label: `Tổng thời lượng (${study.total_minutes || 0} phút)`,
        ico: "fa-clock",
        cls: "todo",
      },
      {
        num: `${goals.avg_progress || 0}%`,
        label: "Tiến độ mục tiêu trung bình",
        ico: "fa-chart-line",
        cls: "done",
      },
      {
        num: `${goals.completed || 0}/${goals.total || 0}`,
        label: "Mục tiêu đã hoàn thành",
        ico: "fa-trophy",
        cls: "done",
      },
    ];

    $("statCards").innerHTML = cards
      .map(
        c => `
      <div class="tk-stat ${c.cls}" style="cursor:default">
        <span class="tk-stat-ico"><i class="fa-solid ${c.ico}"></i></span>
        <span class="tk-stat-body">
          <span class="tk-stat-num">${c.num}</span>
          <span class="tk-stat-label">${c.label}</span>
        </span>
      </div>`
      )
      .join("");

    // Biểu đồ cột 7 ngày gần nhất
    const daily = study.daily_7_days || [];
    const maxMins = Math.max(60, ...daily.map(d => d.minutes || 0));
    const todayStr = todayKey();                                // ĐỔI: không lệch ngày

    $("weeklyChart").innerHTML = daily
      .map(d => {
        const pct = d.minutes ? Math.max(8, Math.round((d.minutes / maxMins) * 100)) : 0;
        const isToday = d.date === todayStr;
        return `
        <div class="st-bar-col ${isToday ? "today" : ""}" title="${d.date}: ${d.minutes} phút">
          <span class="st-bar-val">${d.minutes ? d.minutes + "p" : ""}</span>
          <div class="st-bar-rail">
            <div class="st-bar-fill" style="height:${pct}%"></div>
          </div>
          <span class="st-bar-lbl">${esc(d.label)}</span>
        </div>`;
      })
      .join("");

    // Thanh tiến độ từng mục tiêu
    const items = goals.items || [];
    if (!items.length) {
      $("goalProgressBars").innerHTML = `<p class="sc-empty">Chưa có mục tiêu nào.</p>`;
    } else {
      $("goalProgressBars").innerHTML = items
        .map(g => {
          const pct = Number(g.progress || 0);
          return `
          <div class="st-progress-wrap">
            <div class="st-progress-head">
              <a href="goal_detail.html?id=${g.id}" style="text-decoration:none;color:inherit">
                ${esc(g.title)} <small style="color:var(--muted);font-weight:500">(${g.completed_steps || 0}/${g.total_steps || 0} bước)</small>
              </a>
              <span>${pct}%</span>
            </div>
            <div class="st-progress-track">
              <div class="st-progress-fill ${pct === 100 ? "done" : ""}" style="width:${pct}%"></div>
            </div>
          </div>`;
        })
        .join("");
    }

    // Lịch sử phiên học
    const recent = study.recent_sessions || [];
    if (!recent.length) {
      $("sessionHistory").innerHTML = `<p class="sc-empty">Chưa có phiên học nào được ghi nhận.</p>`;
    } else {
      $("sessionHistory").innerHTML = recent
        .map(
          s => `
        <div class="session-item">
          <div class="session-info">
            <strong>${esc(s.notes || "Phiên học tập trung")}</strong>
            <small>
              <i class="fa-regular fa-calendar"></i> ${fmtDate(s.started_at)}
              ${s.goal_title ? ` · <i class="fa-solid fa-bullseye"></i> ${esc(s.goal_title)}` : ""}
            </small>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="session-mins">${s.duration_minutes} phút</span>
            <button type="button" class="sj-pill del" data-del-session="${s.id}" title="Xóa phiên học">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>`
        )
        .join("");
    }

    // Đổ danh sách mục tiêu vào hộp thoại ghi nhận phiên học
    $("f-goal").innerHTML =
      `<option value="">-- Tự học / Không gắn mục tiêu --</option>` +
      items.map(g => `<option value="${g.id}">${esc(g.title)}</option>`).join("");
  }

  async function loadAll() {
    try {
      renderSummary(await loadSummary());                       // ĐỔI
    } catch (err) {
      toast(err.message);
    }
  }

  $("btnLogSession").addEventListener("click", () => {
    $("f-minutes").value = 45;
    $("f-date").value = todayKey();                             // ĐỔI: không lệch ngày
    $("f-notes").value = "";
    $("f-error").textContent = "";
    dlg.showModal();
    $("f-minutes").focus();
  });

  $("btnCancelSession").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => {
    if (e.target === dlg) dlg.close();
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const duration_minutes = Number($("f-minutes").value);
    if (!duration_minutes || duration_minutes <= 0) {
      $("f-error").textContent = "Thời lượng học phải lớn hơn 0 phút.";
      return;
    }
    const dateVal = $("f-date").value;
    const started_at = dateVal ? new Date(dateVal + "T09:00:00").toISOString() : new Date().toISOString();

    try {
      await SessionAPI.create({                                 // ĐỔI
        goal_id: $("f-goal").value || null,
        duration_minutes,
        started_at,
        notes: $("f-notes").value.trim(),
      });
      dlg.close();
      toast("Đã ghi nhận phiên học!");
      await loadAll();
    } catch (err) {
      $("f-error").textContent = err.message;
    }
  });

  $("sessionHistory").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-del-session]");
    if (!btn) return;
    if (!confirm("Xóa phiên học này?")) return;
    try {
      await SessionAPI.remove(btn.dataset.delSession);          // ĐỔI
      toast("Đã xóa phiên học");
      await loadAll();
    } catch (err) {
      toast(err.message);
    }
  });

  loadAll();
})();