// ==========================================================
// dashboard.js – Trang Tổng quan
// Lịch, nhiệm vụ hôm nay, biểu đồ tuần, Pomodoro, danh sách chặn.
// Dữ liệu tạm lưu localStorage:
//   sf_tasks      – dùng chung với trang Nhiệm vụ
//   sf_subjects   – dùng chung với trang Môn học
//   sf_pomodoro   – các phiên học đã hoàn thành
//   sf_blocklist  – ứng dụng muốn tránh khi học
// ==========================================================
(() => {
  const TASK_KEY = "sf_tasks";
  const SUBJECT_KEY = "sf_subjects";
  const POMO_KEY = "sf_pomodoro";
  const BLOCK_KEY = "sf_blocklist";

  const $ = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => dateKey(new Date());

  const read = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const CATEGORIES = {
    Work: { label: "Work", cls: "tag-work" },
    Study: { label: "Study", cls: "tag-study" },
    Personal: { label: "Personal", cls: "tag-personal" },
  };

  let tasks = read(TASK_KEY, []);
  let sessions = read(POMO_KEY, []);
  let blocked = read(BLOCK_KEY, ["Telegram", "Instagram", "X"]);

  // ---------- Banner ----------
  function renderBanner() {
    const h = new Date().getHours();
    const part = h < 12 ? "Chào buổi sáng" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
    const user = currentUser();
    const first = (user.name || user.full_name || "").trim().split(" ").pop();
    $("banner-hello").textContent = first ? `${part}, ${first}!` : `${part}!`;

    const open = todayTasks().filter(t => t.status !== "done").length;
    $("banner-text").textContent = todayTasks().length === 0
      ? "Hôm nay bạn chưa có nhiệm vụ nào. Thêm kế hoạch bên phải để bắt đầu nhé."
      : open === 0
        ? "Tuyệt vời! Bạn đã hoàn thành mọi nhiệm vụ hôm nay."
        : `Hôm nay bạn còn ${open} nhiệm vụ cần hoàn thành.`;
  }

  // ---------- Lịch nhỏ ----------
  function renderCalendar() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    $("calendar-month-title").textContent = `Tháng ${m + 1}, ${y}`;

    const lead = (new Date(y, m, 1).getDay() + 6) % 7;     // Thứ 2 là cột đầu
    const total = new Date(y, m + 1, 0).getDate();
    const withTask = new Set(tasks.map(t => t.due_date));

    let html = '<span class="cal-day empty"></span>'.repeat(lead);
    for (let d = 1; d <= total; d++) {
      const key = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      const cls = ["cal-day", d === now.getDate() ? "today" : d < now.getDate() ? "past" : "", withTask.has(key) ? "has-task" : ""].join(" ");
      html += `<span class="${cls}">${d}</span>`;
    }
    $("calendar-days").innerHTML = html;
  }

  // ---------- Nhiệm vụ hôm nay ----------
  const subjectName = id => {
    const list = read(SUBJECT_KEY, []);
    const s = list.find(x => x.id === id);
    return s ? s.name : "";
  };

  const todayTasks = () => tasks
    .filter(t => t.due_date === todayKey())
    .sort((a, b) => (a.due_time || "99:99").localeCompare(b.due_time || "99:99") || a.id - b.id);

  function renderTasks() {
    const list = todayTasks();
    if (list.length === 0) {
      $("task-list").innerHTML = '<li class="task-empty">Chưa có nhiệm vụ nào hôm nay.</li>';
    } else {
      $("task-list").innerHTML = list.map(t => {
        const cat = CATEGORIES[t.category];
        const label = cat ? cat.label : (subjectName(t.subject_id) || "Study");
        const cls = cat ? cat.cls : "tag-study";
        return `
        <li class="task-item ${t.status === "done" ? "done" : ""}" data-id="${t.id}">
          <label class="task-check">
            <input type="checkbox" ${t.status === "done" ? "checked" : ""} aria-label="Hoàn thành: ${esc(t.title)}">
            <span class="check-box"><i class="fa-solid fa-check"></i></span>
          </label>
          <div class="task-info">
            <div class="task-title">${esc(t.title)}</div>
            <div class="task-tag ${cls}"><i class="dot"></i>${esc(label)}</div>
          </div>
          ${t.due_time ? `<span class="task-time">${esc(t.due_time)}</span>` : ""}
          <button type="button" class="task-del" aria-label="Xóa nhiệm vụ"><i class="fa-solid fa-trash"></i></button>
        </li>`;
      }).join("");
    }
    renderBanner();
    renderPerformance();
    renderCalendar();
  }

  function saveTasks() { write(TASK_KEY, tasks); }

  function addTask() {
    const input = $("task-input");
    const title = input.value.trim();
    if (!title) { input.focus(); return; }

    tasks.push({
      id: Math.max(0, ...tasks.map(t => t.id)) + 1,
      title,
      description: "",
      subject_id: null,
      category: $("task-category").value,
      due_date: todayKey(),
      due_time: $("task-time").hidden ? null : ($("task-time").value || null),
      priority: "medium",
      status: "todo",
      created_at: new Date().toISOString(),
    });
    saveTasks();

    input.value = "";
    $("task-time").value = "";
    $("task-time").hidden = true;
    $("btn-task-time").classList.remove("on");
    renderTasks();
    input.focus();
  }

  $("btn-add-task").addEventListener("click", addTask);
  $("task-input").addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

  $("btn-task-time").addEventListener("click", () => {
    const box = $("task-time");
    box.hidden = !box.hidden;
    $("btn-task-time").classList.toggle("on", !box.hidden);
    if (!box.hidden) box.focus();
  });
  $("btn-task-tag").addEventListener("click", () => {
    const sel = $("task-category");
    sel.focus();
    if (sel.showPicker) { try { sel.showPicker(); } catch { /* bỏ qua */ } }
  });

  $("task-list").addEventListener("change", e => {
    const li = e.target.closest(".task-item");
    if (!li || e.target.type !== "checkbox") return;
    const t = tasks.find(x => x.id === Number(li.dataset.id));
    if (!t) return;
    t.status = e.target.checked ? "done" : "todo";
    saveTasks();
    renderTasks();
  });
  $("task-list").addEventListener("click", e => {
    const btn = e.target.closest(".task-del");
    if (!btn) return;
    const id = Number(btn.closest(".task-item").dataset.id);
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    toast("Đã xóa nhiệm vụ");
  });

  // ---------- Hiệu suất hôm nay ----------
  function renderPerformance() {
    const list = todayTasks();
    const done = list.filter(t => t.status === "done").length;
    const pct = list.length ? Math.round((done / list.length) * 100) : 0;

    const svg = document.querySelector(".progress-ring");
    if (svg && !svg.getAttribute("viewBox")) svg.setAttribute("viewBox", "0 0 120 120");

    const circumference = 2 * Math.PI * 48;
    $("ring").style.strokeDasharray = circumference;
    $("ring").style.strokeDashoffset = circumference * (1 - pct / 100);
    $("ring-pct").textContent = pct + "%";
    $("ring-legend").textContent = list.length
      ? `${done}/${list.length} nhiệm vụ đã hoàn thành`
      : "Chưa có nhiệm vụ hôm nay";
  }

  // ---------- Biểu đồ tuần ----------
  function renderChart() {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return dateKey(d);
    });
    const minutes = days.map(k => sessions.filter(s => s.date === k).reduce((sum, s) => sum + s.minutes, 0));
    const maxHours = Math.max(1, Math.ceil(Math.max(...minutes) / 60));
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const today = todayKey();

    $("chart-max").textContent = maxHours + "h";
    $("bar-chart").innerHTML = days.map((k, i) => {
      const pct = minutes[i] ? Math.max(7, (minutes[i] / (maxHours * 60)) * 100) : 0;
      return `
      <div class="bar-col ${k === today ? "today" : ""}" title="${labels[i]}: ${minutes[i]} phút">
        <div class="bar-track"><div class="bar-fill" style="height:${pct}%"></div></div>
        <span class="bar-label">${labels[i]}</span>
      </div>`;
    }).join("");
  }

  // ---------- Pomodoro ----------
  const DEFAULT_SUBJECTS = ["Toán học", "Ngôn ngữ lập trình", "Cơ sở dữ liệu", "Mạng máy tính", "Thiết kế web", "Tiếng Anh"];
  const pomo = { minutes: 25, running: false, startedAt: 0, endAt: 0, timer: null };

  function renderPomoSubjects() {
    const stored = read(SUBJECT_KEY, null);
    const names = stored ? stored.map(s => s.name) : DEFAULT_SUBJECTS;
    $("pomo-subject").innerHTML = ['<option value="Tự học">Tự học</option>']
      .concat(names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`)).join("");
  }

  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
  }

  function renderPomoTotal() {
    const total = sessions.filter(s => s.date === todayKey()).reduce((sum, s) => sum + s.minutes, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    $("pomo-total").textContent = total === 0
      ? "Hôm nay bạn chưa học phút nào"
      : `Hôm nay: ${h ? h + " giờ " : ""}${m ? m + " phút" : ""} tập trung`.trim();
  }

  function recordSession(minutes) {
    if (minutes < 1) return;
    sessions.push({ date: todayKey(), minutes, subject: $("pomo-subject").value });
    write(POMO_KEY, sessions);
    renderChart();
    renderPomoTotal();
  }

  function setRunningUi(running) {
    pomo.running = running;
    $("pomo-card").classList.toggle("running", running);
    $("btn-pomo-start").textContent = running ? "Dừng" : "Bắt đầu";
    $("btn-minus").disabled = running;
    $("btn-plus").disabled = running;
    $("pomo-subject").disabled = running;
    if (!running) document.title = "StudySphere - Tổng quan";
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .8);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + .8);
    } catch { /* trình duyệt không cho phát âm thanh */ }
  }

  function tick() {
    const left = pomo.endAt - Date.now();
    if (left <= 0) {
      clearInterval(pomo.timer);
      recordSession(pomo.minutes);
      setRunningUi(false);
      $("pomo-time").textContent = fmtClock(pomo.minutes * 60000);
      toast("Hết giờ! Bạn đã hoàn thành một phiên học 🎉");
      beep();
      return;
    }
    $("pomo-time").textContent = fmtClock(left);
    document.title = `${fmtClock(left)} · StudySphere`;
  }

  function startPomo() {
    pomo.startedAt = Date.now();
    pomo.endAt = pomo.startedAt + pomo.minutes * 60000;
    setRunningUi(true);
    tick();
    pomo.timer = setInterval(tick, 250);
  }

  function stopPomo() {
    clearInterval(pomo.timer);
    recordSession(Math.floor((Date.now() - pomo.startedAt) / 60000));
    setRunningUi(false);
    $("pomo-time").textContent = fmtClock(pomo.minutes * 60000);
  }

  $("btn-pomo-start").addEventListener("click", () => (pomo.running ? stopPomo() : startPomo()));
  $("btn-minus").addEventListener("click", () => {
    pomo.minutes = Math.max(5, pomo.minutes - 5);
    $("pomo-time").textContent = fmtClock(pomo.minutes * 60000);
  });
  $("btn-plus").addEventListener("click", () => {
    pomo.minutes = Math.min(120, pomo.minutes + 5);
    $("pomo-time").textContent = fmtClock(pomo.minutes * 60000);
  });

  // Nút "Ready!" – cuộn tới Pomodoro và bắt đầu học
  $("btn-ready").addEventListener("click", () => {
    $("pomo-card").scrollIntoView({ behavior: "smooth", block: "center" });
    if (!pomo.running) startPomo();
  });

  // ---------- Danh sách chặn ----------
  const BRANDS = {
    telegram: ["fa-brands fa-telegram", "#229ed9"],
    instagram: ["fa-brands fa-instagram", "#e1306c"],
    x: ["fa-brands fa-x-twitter", "#111111"],
    twitter: ["fa-brands fa-x-twitter", "#111111"],
    facebook: ["fa-brands fa-facebook", "#1877f2"],
    messenger: ["fa-brands fa-facebook-messenger", "#0084ff"],
    tiktok: ["fa-brands fa-tiktok", "#111111"],
    youtube: ["fa-brands fa-youtube", "#ff0000"],
    discord: ["fa-brands fa-discord", "#5865f2"],
    reddit: ["fa-brands fa-reddit", "#ff4500"],
    whatsapp: ["fa-brands fa-whatsapp", "#25d366"],
    snapchat: ["fa-brands fa-snapchat", "#f5c400"],
    twitch: ["fa-brands fa-twitch", "#9146ff"],
    spotify: ["fa-brands fa-spotify", "#1db954"],
    pinterest: ["fa-brands fa-pinterest", "#e60023"],
  };
  const FALLBACK_COLORS = ["#8c7ad0", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#4f46e5"];

  function renderBlocked() {
    if (blocked.length === 0) {
      $("block-icons-container").innerHTML = '<p class="app-empty">Chưa có ứng dụng nào. Bấm + để thêm.</p>';
      return;
    }
    $("block-icons-container").innerHTML = blocked.map((name, i) => {
      const brand = BRANDS[name.trim().toLowerCase()];
      const icon = brand ? `<i class="${brand[0]}"></i>` : esc(name.trim().charAt(0).toUpperCase());
      const color = brand ? brand[1] : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      return `
      <div class="app-item">
        <span class="app-tile" style="--c:${color}" aria-hidden="true">${icon}</span>
        <span class="app-name" title="${esc(name)}">${esc(name)}</span>
        <button type="button" class="app-remove" data-name="${esc(name)}" aria-label="Bỏ ${esc(name)} khỏi danh sách"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
    }).join("");
  }

  // Hộp thoại thêm ứng dụng (tạo bằng JS)
  const blockDlg = document.createElement("dialog");
  blockDlg.className = "dlg";
  blockDlg.innerHTML = `
    <form id="block-form" novalidate>
      <h3>Thêm ứng dụng cần tránh</h3>
      <label>Tên ứng dụng hoặc trang web
        <input id="block-name" class="field" maxlength="30" placeholder="VD: Facebook, TikTok, YouTube">
      </label>
      <p class="form-error" id="block-error" role="alert"></p>
      <div class="dlg-actions">
        <button type="button" class="btn-soft" id="block-cancel">Hủy</button>
        <button type="submit" class="btn-primary">Thêm</button>
      </div>
    </form>`;
  document.body.append(blockDlg);

  $("btn-add-block").addEventListener("click", () => {
    $("block-name").value = "";
    $("block-error").textContent = "";
    blockDlg.showModal();
    $("block-name").focus();
  });
  $("block-cancel").addEventListener("click", () => blockDlg.close());
  blockDlg.addEventListener("click", e => { if (e.target === blockDlg) blockDlg.close(); });

  $("block-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("block-name").value.trim();
    if (!name) { $("block-error").textContent = "Vui lòng nhập tên ứng dụng."; return; }
    if (blocked.some(b => b.toLowerCase() === name.toLowerCase())) { $("block-error").textContent = "Ứng dụng này đã có trong danh sách."; return; }
    if (blocked.length >= 12) { $("block-error").textContent = "Danh sách tối đa 12 ứng dụng."; return; }
    blocked.push(name);
    write(BLOCK_KEY, blocked);
    blockDlg.close();
    renderBlocked();
    toast("Đã thêm vào danh sách");
  });

  $("block-icons-container").addEventListener("click", e => {
    const btn = e.target.closest(".app-remove");
    if (!btn) return;
    blocked = blocked.filter(b => b !== btn.dataset.name);
    write(BLOCK_KEY, blocked);
    renderBlocked();
  });

  // ---------- Khởi động ----------
  renderPomoSubjects();
  $("pomo-time").textContent = fmtClock(pomo.minutes * 60000);
  setRunningUi(false);
  renderTasks();
  renderChart();
  renderPomoTotal();
  renderBlocked();
})();