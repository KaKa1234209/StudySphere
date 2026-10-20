renderLayout("overview", "Tổng quan");

(function () {
  const $ = id => document.getElementById(id);

  /* ===== Tiện ích đọc/ghi dữ liệu và ngày ===== */
  const read = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;   // theo giờ máy, không lệch múi giờ
  const today = () => dateKey(new Date());

  const TASKS_KEY = "studysphere.tasks";
  const SESSIONS_KEY = "studysphere.sessions";
  const BLOCKS_KEY = "studysphere.blocklist";

  /* ========== 1. LỊCH ========== */
  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth(), todayNum = now.getDate();
    $("calendar-month-title").textContent = `Tháng ${month + 1}, ${year}`;

    const box = $("calendar-days");
    box.innerHTML = "";
    const first = (new Date(year, month, 1).getDay() + 6) % 7;      // thứ 2 là cột đầu
    const total = new Date(year, month + 1, 0).getDate();
    const prevTotal = new Date(year, month, 0).getDate();
    for (let i = first; i > 0; i--) box.insertAdjacentHTML("beforeend", `<span class="fade">${prevTotal - i + 1}</span>`);
    for (let d = 1; d <= total; d++) box.insertAdjacentHTML("beforeend", `<span class="${d === todayNum ? "active-day" : ""}">${d}</span>`);
  }

  /* ========== 2. NHIỆM VỤ HÔM NAY ==========
     Mỗi nhiệm vụ: { id, title, tag, done, date, time }
     Lưu ở khóa studysphere.tasks để trang Nhiệm vụ (Thành viên 1) dùng chung. */
  let tasks = read(TASKS_KEY, []);
  const saveTasks = () => write(TASKS_KEY, tasks);
  const todayTasks = () => tasks.filter(t => t.date === today());

  function renderTasks() {
    const list = todayTasks().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.id - b.id);
    $("task-list").innerHTML = list.length
      ? list.map(t => `
        <li class="task-item ${t.done ? "done" : ""}">
          <input type="checkbox" id="t${t.id}" data-id="${t.id}" ${t.done ? "checked" : ""}>
          <label for="t${t.id}"><span class="task-name">${esc(t.title)}</span><span class="task-tag">• ${esc(t.tag)}</span></label>
          <span class="task-time">${t.time ? esc(t.time) : "Hôm nay"}</span>
          <button class="task-del" data-del="${t.id}" aria-label="Xóa nhiệm vụ ${esc(t.title)}"><i class="fa-regular fa-trash-can"></i></button>
        </li>`).join("")
      : `<li class="task-empty">Hôm nay chưa có nhiệm vụ nào. Hãy thêm nhiệm vụ đầu tiên bên dưới.</li>`;
    renderStats();
  }

  function addTask() {
    const title = $("task-input").value.trim();
    if (!title) return;
    const id = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    tasks.push({ id, title, tag: $("task-category").value, done: false, date: today(), time: $("task-time").value || "" });
    saveTasks();
    $("task-input").value = "";
    $("task-time").value = "";
    $("task-time").hidden = true;
    renderTasks();
  }

  $("btn-add-task").addEventListener("click", addTask);
  $("task-input").addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

  // Tick hoàn thành
  $("task-list").addEventListener("change", e => {
    const box = e.target.closest("[data-id]");
    if (!box) return;
    const t = tasks.find(x => x.id === Number(box.dataset.id));
    if (t) { t.done = box.checked; saveTasks(); renderTasks(); }
  });

  // Xóa nhiệm vụ
  $("task-list").addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if (!del) return;
    tasks = tasks.filter(x => x.id !== Number(del.dataset.del));
    saveTasks();
    renderTasks();
  });

  // Nút đồng hồ: hiện/ẩn ô chọn giờ. Nút nhãn: mở danh sách nhãn.
  $("btn-task-time").addEventListener("click", () => {
    const input = $("task-time");
    input.hidden = !input.hidden;
    if (!input.hidden) input.focus();
  });
  $("btn-task-tag").addEventListener("click", () => {
    const select = $("task-category");
    select.focus();
    try { select.showPicker(); } catch {}
  });

  /* ========== 3. THỐNG KÊ NHIỆM VỤ (vòng tròn % + banner) ========== */
  function renderStats() {
    const list = todayTasks();
    const total = list.length, done = list.filter(t => t.done).length;
    const pct = total ? Math.round(done / total * 100) : 0;

    $("ring").style.strokeDashoffset = 301.59 * (1 - pct / 100);   // 301.59 = chu vi vòng tròn r=48
    $("ring-pct").textContent = pct + "%";
    $("ring-legend").textContent = total ? ` ${done}/${total} nhiệm vụ hoàn thành` : " Chưa có nhiệm vụ";

    const left = total - done;
    $("banner-text").textContent = !total
      ? "Hôm nay bạn chưa có nhiệm vụ nào. Hãy thêm một nhiệm vụ để bắt đầu!"
      : left
        ? `Bạn còn ${left} nhiệm vụ cần hoàn thành hôm nay.`
        : "Tuyệt vời! Bạn đã hoàn thành mọi nhiệm vụ hôm nay.";
  }

  /* ========== 4. BIỂU ĐỒ TUẦN (từ các phiên Pomodoro) ========== */
  const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  function renderChart() {
    const sessions = read(SESSIONS_KEY, []);
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    const secs = DAY_LABELS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const k = dateKey(d);
      return sessions.filter(s => s.date === k).reduce((sum, s) => sum + s.seconds, 0);
    });

    const scale = Math.max(3600, Math.ceil(Math.max(...secs) / 3600) * 3600);   // trần biểu đồ, tối thiểu 1h
    $("chart-max").textContent = scale / 3600 + "h";
    $("bar-chart").innerHTML = secs.map((s, i) => `
      <div class="bar-col" title="${DAY_LABELS[i]}: ${Math.floor(s / 60)} phút">
        <div class="bar-track"><div class="bar-fill" style="height:${Math.round(s / scale * 100)}%"></div></div>
        <span>${DAY_LABELS[i]}</span>
      </div>`).join("");

    const todayMin = Math.floor(secs[(now.getDay() + 6) % 7] / 60);
    $("pomo-total").textContent = `Hôm nay bạn đã tập trung ${todayMin} phút`;
  }

  /* ========== 5. POMODORO ========== */
  const DEFAULT_SECONDS = 25 * 60;
  let remaining = DEFAULT_SECONDS;   // số giây còn lại
  let runStartRemaining = 0;         // số giây còn lại lúc bấm Start (để tính đã học bao lâu)
  let endAt = 0, ticker = null;
  const startBtn = $("btn-pomo-start");

  const showTime = () => { $("pomo-time").textContent = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`; };

  // Ô chọn môn lấy từ trang Môn học
  function renderPomoSubjects() {
    const subjects = read("studysphere.subjects", []);
    $("pomo-subject").innerHTML = subjects.length
      ? subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")
      : `<option value="">Chưa có môn học</option>`;
  }

  // Ghi lại thời gian đã học của lần chạy này
  function logSession(seconds) {
    if (seconds < 1) return;
    const sessions = read(SESSIONS_KEY, []);
    sessions.push({ date: today(), seconds, subjectId: $("pomo-subject").value || null });
    write(SESSIONS_KEY, sessions);
    renderChart();
  }

  function stopTimer(finished) {
    clearInterval(ticker);
    ticker = null;
    logSession(runStartRemaining - remaining);
    startBtn.textContent = "Start";
    startBtn.classList.remove("running");
    if (finished) {
      remaining = DEFAULT_SECONDS;
      showTime();
      toast("Hoàn thành phiên Pomodoro! Hãy nghỉ ngơi một chút.");
    }
  }

  startBtn.addEventListener("click", () => {
    if (ticker) return stopTimer(false);                      // đang chạy -> tạm dừng
    if (remaining <= 0) remaining = DEFAULT_SECONDS;
    runStartRemaining = remaining;
    endAt = Date.now() + remaining * 1000;                    // tính theo đồng hồ thật, tab ở nền vẫn đúng
    startBtn.textContent = "Pause";
    startBtn.classList.add("running");
    ticker = setInterval(() => {
      remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      showTime();
      if (remaining <= 0) stopTimer(true);
    }, 250);
  });

  $("btn-plus").addEventListener("click", () => { if (!ticker) { remaining += 300; showTime(); } });
  $("btn-minus").addEventListener("click", () => { if (!ticker && remaining > 300) { remaining -= 300; showTime(); } });

  // Rời trang khi đang chạy thì vẫn lưu phần đã học
  window.addEventListener("pagehide", () => { if (ticker) logSession(runStartRemaining - remaining); });

  // Nút "Ready!" trên banner: cuộn xuống Pomodoro và bắt đầu
  $("btn-ready").addEventListener("click", () => {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("pomo-card").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    if (!ticker) startBtn.click();
  });

  /* ========== 6. BLOCK LIST ========== */
  const DEFAULT_BLOCKS = [{ id: 1, name: "Telegram" }, { id: 2, name: "Instagram" }, { id: 3, name: "X (Twitter)" }];
  const BLOCK_ICONS = {
    telegram: "fa-brands fa-telegram", instagram: "fa-brands fa-instagram",
    x: "fa-brands fa-x-twitter", twitter: "fa-brands fa-x-twitter", "x (twitter)": "fa-brands fa-x-twitter",
    facebook: "fa-brands fa-facebook", tiktok: "fa-brands fa-tiktok", youtube: "fa-brands fa-youtube",
    discord: "fa-brands fa-discord", reddit: "fa-brands fa-reddit",
  };
  const iconFor = name => BLOCK_ICONS[name.trim().toLowerCase()] || "fa-solid fa-ban";

  let blocks = read(BLOCKS_KEY, DEFAULT_BLOCKS);
  const saveBlocks = () => write(BLOCKS_KEY, blocks);

  function renderBlocks() {
    $("block-icons-container").innerHTML = blocks.map(b => `
      <div class="app-icon" title="${esc(b.name)}">
        <i class="${iconFor(b.name)}"></i>
        <button class="app-del" data-del-block="${b.id}" aria-label="Xóa ${esc(b.name)}">×</button>
      </div>`).join("");
  }

  $("btn-add-block").addEventListener("click", () => {
    const name = (prompt("Nhập tên ứng dụng hoặc trang web bạn muốn tránh:") || "").trim().slice(0, 30);
    if (!name) return;
    if (blocks.some(b => b.name.toLowerCase() === name.toLowerCase())) return toast("Ứng dụng này đã có trong danh sách");
    const id = blocks.length ? Math.max(...blocks.map(b => b.id)) + 1 : 1;
    blocks.push({ id, name });
    saveBlocks();
    renderBlocks();
  });

  $("block-icons-container").addEventListener("click", e => {
    const del = e.target.closest("[data-del-block]");
    if (!del) return;
    blocks = blocks.filter(b => b.id !== Number(del.dataset.delBlock));
    saveBlocks();
    renderBlocks();
  });

  /* ========== KHỞI TẠO ========== */
  $("banner-hello").textContent = `Good morning, ${getUser().name}!`;
  renderCalendar();
  renderTasks();
  renderChart();
  renderPomoSubjects();
  renderBlocks();
  showTime();
})();