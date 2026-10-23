// ==========================================================
// data.js – Dữ liệu dùng chung cho TẤT CẢ các trang
// USE_MOCK = true  : lưu tạm bằng localStorage (mỗi tài khoản một kho riêng)
// USE_MOCK = false : gọi API backend
//
// Cách dùng trong trang:
//   const { tasks, subjects, goals, steps, sessions, summary } = SFData;
//   const list = await tasks.list();      // lấy danh sách
//   await tasks.create({ ... });          // thêm
//   await tasks.update(id, { ... });      // sửa
//   await tasks.remove(id);               // xóa
//
// Môn học : { id, code, name, teacher, created_at }
// Nhiệm vụ: { id, title, description, subject_id, due_date, due_time, priority, status, created_at }
// Mục tiêu: { id, title, description, start_date, target_date, status, created_at }
// Bước    : { id, goal_id, title, done, position }
// Phiên học: { id, goal_id, duration_minutes, started_at, notes }
// ==========================================================
const SFData = (() => {
  const USE_MOCK = true;
  const API = {
    subjects: "/api/subjects",
    tasks: "/api/tasks",
    goals: "/api/goals",
    sessions: "/api/study-sessions",
    summary: "/api/dashboard/summary",
  };
  const KEYS = {
    subjects: "sf_subjects", tasks: "sf_tasks",
    goals: "sf_goals", steps: "sf_goal_steps", sessions: "sf_sessions",
  };

  const STATUS = { todo: "Chưa làm", doing: "Đang làm", done: "Hoàn thành" };
  const STATUS_FLOW = { todo: "doing", doing: "done", done: "todo" };
  const PRIORITY = { high: "Cao", medium: "Trung bình", low: "Thấp" };
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const COLORS = ["#8c7ad0", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#4f46e5", "#64748b"];

  // ==========================================================
  // A. NGÀY GIỜ (luôn tính theo giờ máy, không bị lệch múi giờ)
  // ==========================================================
  const pad2 = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  const fmtDay = k => (k ? k.split("-").reverse().join("/") : "");
  const shiftDay = n => { const d = new Date(); d.setDate(d.getDate() + n); return dateKey(d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12); };

  // Số ngày từ hôm nay đến ngày k (âm = đã qua)
  function daysFromToday(k) {
    const [y, m, d] = k.split("-").map(Number);
    const t = new Date();
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
  }

  const subjectColor = id => COLORS[(Number(id) || 0) % COLORS.length];
  const now = () => new Date().toISOString();

  // ==========================================================
  // B. MÁY LÀM CRUD DÙNG CHUNG
  // ==========================================================

  // ---------- Dữ liệu mẫu (chỉ dùng lần mở đầu tiên của mỗi tài khoản) ----------
  const SEED_SUBJECTS = [
    ["MATH101", "Toán học"], ["PROG201", "Ngôn ngữ lập trình"], ["DB301", "Cơ sở dữ liệu"],
    ["NET201", "Mạng máy tính"], ["WEB301", "Thiết kế web"], ["ENG201", "Tiếng Anh"],
  ].map(([code, name], i) => ({ id: i + 1, code, name, teacher: "", created_at: now() }));

  const seedTasks = () => [
    [3, "Làm bài tập chương 3", "Bài 1 đến bài 8 trong giáo trình", "high", 0, "08:00", "doing"],
    [2, "Viết chương trình quản lý sinh viên", "", "high", 2, "23:59", "todo"],
    [3, "Thiết kế sơ đồ ERD", "Gồm 6 bảng chính", "medium", 1, "17:00", "todo"],
    [5, "Hoàn thiện giao diện trang chủ", "", "medium", 4, "", "doing"],
    [6, "Nộp bài viết Unit 5", "Writing task 2", "high", -1, "20:00", "todo"],
    [4, "Cấu hình mạng LAN trên Packet Tracer", "", "low", 6, "", "todo"],
    [1, "Ôn tập giữa kỳ", "", "medium", -2, "", "done"],
  ].map(([subject_id, title, description, priority, offset, due_time, status], i) => ({
    id: i + 1, title, description, subject_id, priority, status,
    due_date: shiftDay(offset), due_time: due_time || null, created_at: now(),
  }));

  // ---------- Đọc / ghi localStorage (khóa luôn gắn tên tài khoản) ----------
  function readLocal(key, seed = () => []) {
    try {
      const raw = localStorage.getItem(userKey(key));
      if (raw === null) {                       // tài khoản này chưa có dữ liệu → tạo mẫu
        const s = seed();
        localStorage.setItem(userKey(key), JSON.stringify(s));
        return s;
      }
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }
  const writeLocal = (key, list) => localStorage.setItem(userKey(key), JSON.stringify(list));

  // ---------- Gọi API thật ----------
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
  const send = (method, body) => ({ method, body: JSON.stringify(body) });

  // ---------- Bộ CRUD cho localStorage ----------
  function mockCrud(key, seed) {
    const all = () => readLocal(key, seed);
    return {
      list: async () => all(),
      create: async body => {
        const list = all();
        const item = { ...body, id: Math.max(0, ...list.map(x => x.id)) + 1, created_at: now() };
        writeLocal(key, [...list, item]);
        return item;
      },
      update: async (id, body) => {
        writeLocal(key, all().map(x => (x.id === Number(id) ? { ...x, ...body, id: Number(id) } : x)));
      },
      remove: async id => writeLocal(key, all().filter(x => x.id !== Number(id))),
    };
  }

  // ---------- Bộ CRUD cho API ----------
  const apiCrud = url => ({
    list: () => http(url),
    create: body => http(url, send("POST", body)),
    update: (id, body) => http(`${url}/${id}`, send("PUT", body)),
    remove: id => http(`${url}/${id}`, { method: "DELETE" }),
  });

  const crud = (key, seed, url) => (USE_MOCK ? mockCrud(key, seed) : apiCrud(url));

  // ---------- Nhiệm vụ & Môn học ----------
  const tasks = crud(KEYS.tasks, seedTasks, API.tasks);
  const subjects = crud(KEYS.subjects, () => SEED_SUBJECTS, API.subjects);

  // ==========================================================
  // C. MỤC TIÊU, CÁC BƯỚC, PHIÊN HỌC, THỐNG KÊ
  // ==========================================================
  const goalStore = crud(KEYS.goals, () => [], API.goals);
  const stepStore = mockCrud(KEYS.steps, () => []);          // chỉ dùng khi USE_MOCK
  const sessionStore = crud(KEYS.sessions, () => [], API.sessions);

  // Gắn thêm tiến độ cho mục tiêu: số bước, số bước xong, phần trăm
  function withProgress(goal, allSteps) {
    const mine = allSteps.filter(s => s.goal_id === goal.id);
    const done = mine.filter(s => s.done).length;
    return {
      ...goal,
      total_steps: mine.length,
      completed_steps: done,
      progress: mine.length ? Math.round((done / mine.length) * 100) : 0,
    };
  }

  const requireTitle = body => {
    const title = (body.title || "").trim();
    if (!title) throw new Error("Vui lòng nhập tên mục tiêu.");
    return title;
  };

  // ---------- Mục tiêu ----------
  const goals = USE_MOCK ? {
    async list() {
      const allSteps = await stepStore.list();
      return (await goalStore.list()).map(g => withProgress(g, allSteps)).sort((a, b) => b.id - a.id);
    },
    async get(id) {
      const goal = (await goalStore.list()).find(g => g.id === Number(id));
      if (!goal) throw new Error("Không tìm thấy mục tiêu");
      return withProgress(goal, await stepStore.list());
    },
    async create(body) {
      const goal = await goalStore.create({
        title: requireTitle(body),
        description: body.description || "",
        start_date: body.start_date || null,
        target_date: body.target_date || null,
        status: body.status || "active",
      });
      // Các bước nhập sẵn khi tạo mục tiêu (mỗi dòng một bước)
      for (const [i, title] of (body.steps || []).entries()) {
        await stepStore.create({ goal_id: goal.id, title, done: false, position: i });
      }
      return goal;
    },
    async update(id, body) {
      await goalStore.update(id, {
        title: requireTitle(body),
        description: body.description || "",
        start_date: body.start_date || null,
        target_date: body.target_date || null,
        status: body.status || "active",
      });
    },
    async remove(id) {
      id = Number(id);
      await goalStore.remove(id);
      // Xóa các bước của mục tiêu
      for (const s of (await stepStore.list()).filter(s => s.goal_id === id)) await stepStore.remove(s.id);
      // Phiên học vẫn giữ lại, chỉ mất liên kết với mục tiêu
      for (const s of (await sessionStore.list()).filter(s => s.goal_id === id)) {
        await sessionStore.update(s.id, { goal_id: null });
      }
    },
  } : {
    list: () => http(API.goals),
    get: id => http(`${API.goals}/${id}`),
    create: body => http(API.goals, send("POST", body)),
    update: (id, body) => http(`${API.goals}/${id}`, send("PUT", body)),
    remove: id => http(`${API.goals}/${id}`, { method: "DELETE" }),
  };

  // ---------- Các bước nhỏ của mục tiêu (dùng ở trang chi tiết mục tiêu) ----------
  const steps = USE_MOCK ? {
    async list(goalId) {
      return (await stepStore.list())
        .filter(s => s.goal_id === Number(goalId))
        .sort((a, b) => a.position - b.position || a.id - b.id);
    },
    async create(goalId, title) {
      title = (title || "").trim();
      if (!title) throw new Error("Vui lòng nhập tên bước.");
      const mine = (await stepStore.list()).filter(s => s.goal_id === Number(goalId));
      return stepStore.create({
        goal_id: Number(goalId), title, done: false,
        position: Math.max(-1, ...mine.map(s => s.position)) + 1,
      });
    },
    update: (id, patch) => stepStore.update(id, patch),
    remove: id => stepStore.remove(id),
  } : {
    list: goalId => http(`${API.goals}/${goalId}/steps`),
    create: (goalId, title) => http(`${API.goals}/${goalId}/steps`, send("POST", { title })),
    update: (id, patch) => http(`/api/steps/${id}`, send("PUT", patch)),
    remove: id => http(`/api/steps/${id}`, { method: "DELETE" }),
  };

  // ---------- Phiên học ----------
  const sessions = {
    list: async () => (await sessionStore.list()).sort((a, b) => b.started_at.localeCompare(a.started_at)),
    async create(body) {
      const minutes = Number(body.duration_minutes);
      if (!minutes || minutes <= 0) throw new Error("Thời lượng học phải lớn hơn 0 phút.");
      return sessionStore.create({
        goal_id: body.goal_id ? Number(body.goal_id) : null,
        duration_minutes: minutes,
        started_at: body.started_at || now(),
        notes: body.notes || "",
      });
    },
    remove: id => sessionStore.remove(id),
  };

  // ---------- Thống kê tổng hợp cho trang Thống kê ----------
  async function summary() {
    if (!USE_MOCK) return http(API.summary);

    const goalList = await goals.list();
    const allSessions = await sessions.list();
    const titleOf = Object.fromEntries(goalList.map(g => [g.id, g.title]));

    // Những ngày có học (theo giờ máy)
    const studyDays = new Set(allSessions.map(s => dateKey(new Date(s.started_at))));
    const today = new Date();

    // Chuỗi ngày hiện tại: đếm lùi từ hôm nay (hôm nay chưa học thì đếm từ hôm qua)
    let cursor = studyDays.has(dateKey(today)) ? today : addDays(today, -1);
    let currentStreak = 0;
    while (studyDays.has(dateKey(cursor))) { currentStreak++; cursor = addDays(cursor, -1); }

    // Chuỗi dài nhất từ trước đến nay
    const sorted = [...studyDays].sort();
    let bestStreak = 0, run = 0;
    sorted.forEach((k, i) => {
      run = i > 0 && dateKey(addDays(parseKey(sorted[i - 1]), 1)) === k ? run + 1 : 1;
      bestStreak = Math.max(bestStreak, run);
    });

    // Số phút học trong 7 ngày gần nhất
    const LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const daily = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      const key = dateKey(d);
      const minutes = allSessions
        .filter(s => dateKey(new Date(s.started_at)) === key)
        .reduce((sum, s) => sum + s.duration_minutes, 0);
      return { date: key, label: LABELS[d.getDay()], minutes };
    });

    const totalMinutes = allSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    return {
      goals: {
        total: goalList.length,
        completed: goalList.filter(g => g.status === "completed").length,
        avg_progress: goalList.length ? Math.round(goalList.reduce((s, g) => s + g.progress, 0) / goalList.length) : 0,
        items: goalList,
      },
      study: {
        current_streak: currentStreak,
        best_streak: bestStreak,
        total_minutes: totalMinutes,
        total_hours: Math.round(totalMinutes / 6) / 10,
        daily_7_days: daily,
        recent_sessions: allSessions.slice(0, 10).map(s => ({ ...s, goal_title: titleOf[s.goal_id] || "" })),
      },
    };
  }

  return {
    tasks, subjects, goals, steps, sessions, summary,
    STATUS, STATUS_FLOW, PRIORITY, PRIORITY_RANK, COLORS,
    pad2, dateKey, todayKey, fmtDay, shiftDay, daysFromToday, subjectColor,
  };
})();