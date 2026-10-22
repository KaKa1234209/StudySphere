// ==========================================================
// schedule.js – Trang Lịch học: lịch tháng hiển thị deadline của nhiệm vụ
// ==========================================================
(() => {
  const {
    tasks: TaskAPI, subjects: SubjectAPI, STATUS, STATUS_FLOW, PRIORITY,
    pad2, todayKey, fmtDay, shiftDay, daysFromToday, subjectColor,
  } = SFData;

  const $ = id => document.getElementById(id);
  const STATUS_ICON = { todo: "fa-regular fa-circle", doing: "fa-solid fa-circle-half-stroke", done: "fa-solid fa-circle-check" };
  const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  let tasks = [];
  let subjects = [];
  let subjectFilter = "";
  let selected = todayKey();
  const cursor = new Date();
  cursor.setDate(1);

  const byTime = (a, b) => (a.due_date + (a.due_time || "99:99")).localeCompare(b.due_date + (b.due_time || "99:99"));
  const visible = () => tasks.filter(t => !subjectFilter || String(t.subject_id) === subjectFilter);

  // ---------- Lịch tháng ----------
  function renderCalendar() {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    $("monthTitle").textContent = `Tháng ${m + 1}, ${y}`;

    const list = visible().filter(t => t.due_date);
    const subjMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;        // Thứ Hai là cột đầu
    const total = new Date(y, m + 1, 0).getDate();
    const today = todayKey();

    let html = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => `<div class="sc-dow">${d}</div>`).join("");
    html += '<span class="sc-day blank"></span>'.repeat(lead);

    let monthCount = 0;
    for (let d = 1; d <= total; d++) {
      const key = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      const dayTasks = list.filter(t => t.due_date === key).sort(byTime);
      monthCount += dayTasks.length;
      const col = (lead + d - 1) % 7;

      const pills = dayTasks.slice(0, 3).map(t => {
        const s = subjMap[t.subject_id];
        return `<span class="sc-pill ${t.status === "done" ? "done" : ""}" style="--c:${s ? subjectColor(s.id) : "#b8aed8"}" title="${esc(t.title)}">${t.due_time ? esc(t.due_time) + " " : ""}${esc(t.title)}</span>`;
      }).join("");
      const more = dayTasks.length > 3 ? `<span class="sc-more">+${dayTasks.length - 3} việc</span>` : "";

      html += `
        <button type="button" class="sc-day ${key === today ? "today" : ""} ${key === selected ? "selected" : ""} ${col > 4 ? "weekend" : ""}"
                data-date="${key}" aria-label="Ngày ${d}, ${dayTasks.length} nhiệm vụ">
          <span class="sc-num">${d}</span>
          <span class="sc-items">${pills}${more}</span>
        </button>`;
    }
    $("calendar").innerHTML = html;
    $("heroCount").textContent = monthCount;
  }

  // ---------- Danh sách bên phải ----------
  function item(t, subjMap, withDate) {
    const s = subjMap[t.subject_id];
    const status = STATUS[t.status] ? t.status : "todo";
    const diff = daysFromToday(t.due_date);
    const when = diff === 0 ? "Hôm nay" : diff === 1 ? "Ngày mai" : fmtDay(t.due_date).slice(0, 5);
    return `
      <div class="sc-row ${status === "done" ? "done" : ""}">
        <button type="button" class="tk-status ${status}" data-action="cycle" data-id="${t.id}" title="Bấm để đổi trạng thái"
                aria-label="Trạng thái: ${STATUS[status]}. Bấm để đổi"><i class="${STATUS_ICON[status]}"></i></button>
        <div class="sc-row-main">
          <div class="sc-row-title">${esc(t.title)}</div>
          <div class="sc-row-sub">
            <i class="dot" style="--dot:${s ? subjectColor(s.id) : "#b8aed8"}"></i>${s ? esc(s.name) : "Chưa có môn"}
            ${t.due_time ? " · " + esc(t.due_time) : ""} · ${PRIORITY[t.priority] || "Trung bình"}
          </div>
        </div>
        ${withDate ? `<span class="sc-when">${when}</span>` : ""}
      </div>`;
  }

  function renderSide() {
    const subjMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const [y, m, d] = selected.split("-").map(Number);
    const dayName = WEEKDAYS[new Date(y, m - 1, d).getDay()];

    $("dayTitle").textContent = selected === todayKey() ? "Hôm nay" : `${dayName}, ${fmtDay(selected).slice(0, 5)}`;
    const day = visible().filter(t => t.due_date === selected).sort(byTime);
    $("dayCount").textContent = `${day.length} việc`;
    $("dayList").innerHTML = day.length
      ? day.map(t => item(t, subjMap, false)).join("")
      : '<div class="sc-empty">Không có nhiệm vụ trong ngày này.</div>';
    $("btnAddDay").href = `tasks.html?new=${selected}${subjectFilter ? "&subject=" + subjectFilter : ""}`;

    const end = shiftDay(7);
    const week = visible().filter(t => t.status !== "done" && t.due_date >= todayKey() && t.due_date <= end).sort(byTime);
    $("weekList").innerHTML = week.length
      ? week.map(t => item(t, subjMap, true)).join("")
      : '<div class="sc-empty">Không có deadline nào trong 7 ngày tới.</div>';
  }

  function render() {
    renderCalendar();
    renderSide();
  }

  async function load() {
    try {
      [tasks, subjects] = await Promise.all([TaskAPI.list(), SubjectAPI.list()]);
    } catch (err) {
      tasks = [];
      subjects = [];
      toast(err.message);
    }
    $("scSubject").innerHTML = '<option value="">Tất cả môn học</option>' +
      subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
    $("scSubject").value = subjectFilter;
    render();
  }

  // ---------- Sự kiện ----------
  $("btnPrev").addEventListener("click", () => { cursor.setMonth(cursor.getMonth() - 1); renderCalendar(); });
  $("btnNext").addEventListener("click", () => { cursor.setMonth(cursor.getMonth() + 1); renderCalendar(); });
  $("btnToday").addEventListener("click", () => {
    const now = new Date();
    cursor.setFullYear(now.getFullYear(), now.getMonth(), 1);
    selected = todayKey();
    render();
  });
  $("scSubject").addEventListener("change", e => { subjectFilter = e.target.value; render(); });

  $("calendar").addEventListener("click", e => {
    const day = e.target.closest("[data-date]");
    if (!day) return;
    selected = day.dataset.date;
    render();
  });

  document.addEventListener("click", async e => {
    const btn = e.target.closest('button[data-action="cycle"]');
    if (!btn) return;
    const task = tasks.find(t => t.id === Number(btn.dataset.id));
    if (!task) return;
    try {
      await TaskAPI.update(task.id, { ...task, status: STATUS_FLOW[task.status] || "todo" });
      await load();
    } catch (err) {
      toast(err.message);
    }
  });

  load();
})();