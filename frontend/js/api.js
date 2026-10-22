// Báo hiệu "chưa có server" (khác với lỗi nhập liệu do server trả về)
class ApiUnavailable extends Error {}

async function request(url, options = {}) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiUnavailable("Không kết nối được máy chủ");
  }

  if (res.status === 401 && typeof DEV_NO_AUTH === "undefined") {
    localStorage.removeItem("token");
    location.href = "login.html";
    return;
  }
  if (res.status === 204) return null;

  // Live Server trả về trang HTML thay vì JSON => backend chưa chạy
  if (!(res.headers.get("content-type") || "").includes("application/json")) {
    throw new ApiUnavailable("Máy chủ chưa chạy");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

// Thử gọi server; nếu server chưa chạy thì dùng bản lưu trong trình duyệt
const withFallback = (remote, local) => async (...args) => {
  try { return await remote(...args); }
  catch (err) { if (err instanceof ApiUnavailable) return local(...args); throw err; }
};

/* ===== Ghi chú lưu tạm trong trình duyệt (NoteHub) ===== */
const NOTE_KEY = "studysphere.notes";
const noteStore = {
  all: () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY)) || []; } catch { return []; } },
  save: list => localStorage.setItem(NOTE_KEY, JSON.stringify(list)),
};
const cleanTags = (tags = []) => [...new Set(tags.map(t => String(t).trim()).filter(Boolean))];

const localNotes = {
  list(p = {}) {
    const q = (p.q || "").toLowerCase();
    return noteStore.all()
      .filter(n =>
        (!q || (n.title + " " + n.content + " " + n.tags.join(" ")).toLowerCase().includes(q)) &&
        (!p.tag || n.tags.includes(p.tag)) &&
        (!p.subjectId || n.subject_id == p.subjectId))
      .sort((a, b) => b.pinned - a.pinned || b.updated_at.localeCompare(a.updated_at));
  },
  get(id) {
    const n = noteStore.all().find(x => x.id === Number(id));
    if (!n) throw new Error("Không tìm thấy ghi chú");
    return n;
  },
  create(note) {
    if (!(note.title || "").trim() && !(note.content || "").trim()) throw new Error("Cần có tiêu đề hoặc nội dung");
    const all = noteStore.all(), now = new Date().toISOString();
    const n = {
      id: all.length ? Math.max(...all.map(x => x.id)) + 1 : 1,
      title: note.title || "", content: note.content || "",
      subject_id: note.subject_id ? Number(note.subject_id) : null,
      task_id: note.task_id ? Number(note.task_id) : null,
      pinned: note.pinned ? 1 : 0, tags: cleanTags(note.tags),
      created_at: now, updated_at: now,
    };
    all.push(n); noteStore.save(all);
    return n;
  },
  update(id, note) {
    const all = noteStore.all(), n = all.find(x => x.id === Number(id));
    if (!n) throw new Error("Không tìm thấy ghi chú");
    Object.assign(n, {
      title: note.title || "", content: note.content || "",
      subject_id: note.subject_id ? Number(note.subject_id) : null,
      task_id: note.task_id ? Number(note.task_id) : null,
      pinned: note.pinned ? 1 : 0, tags: cleanTags(note.tags),
      updated_at: new Date().toISOString(),
    });
    noteStore.save(all);
    return n;
  },
  pin(id) {
    const all = noteStore.all(), n = all.find(x => x.id === Number(id));
    if (n) { n.pinned = n.pinned ? 0 : 1; noteStore.save(all); }
    return n;
  },
  remove(id) { noteStore.save(noteStore.all().filter(x => x.id !== Number(id))); return null; },
  tags() { return [...new Set(noteStore.all().flatMap(n => n.tags))].sort(); },
};

/* ===== Dữ liệu mẫu & lưu tạm trong trình duyệt cho SkillTrack (Thành viên 3) ===== */
const GOAL_KEY = "studysphere.goals";
const SESSION_KEY = "studysphere.sessions";
const USER_KEY = "user";

const defaultGoalsSeed = () => [
  {
    id: 1,
    title: "Hoàn thành StudySphere",
    description: "Xây dựng ứng dụng web quản lý học tập nhóm 3 thành viên (StudyFlow, NoteHub, SkillTrack)",
    start_date: "2026-10-01",
    target_date: "2026-11-30",
    status: "active",
    steps: [
      { id: 1, goal_id: 1, title: "Thiết kế database", is_completed: 1, sort_order: 1 },
      { id: 2, goal_id: 1, title: "Hoàn thiện CRUD môn học", is_completed: 1, sort_order: 2 },
      { id: 3, goal_id: 1, title: "Hoàn thiện quản lý ghi chú", is_completed: 0, sort_order: 3 },
      { id: 4, goal_id: 1, title: "Hoàn thiện dashboard", is_completed: 0, sort_order: 4 },
      { id: 5, goal_id: 1, title: "Kiểm thử toàn hệ thống", is_completed: 0, sort_order: 5 },
    ],
  },
  {
    id: 2,
    title: "Học JavaScript",
    description: "Nắm vững ES6+, DOM, Fetch API và bất đồng bộ để làm chủ Frontend & Node.js",
    start_date: "2026-10-05",
    target_date: "2026-11-15",
    status: "active",
    steps: [
      { id: 6, goal_id: 2, title: "Ôn tập biến, hàm, mảng và object", is_completed: 1, sort_order: 1 },
      { id: 7, goal_id: 2, title: "Thực hành DOM & Sự kiện", is_completed: 1, sort_order: 2 },
      { id: 8, goal_id: 2, title: "Làm việc với Fetch API & JSON", is_completed: 0, sort_order: 3 },
      { id: 9, goal_id: 2, title: "Async/Await và Promise", is_completed: 0, sort_order: 4 },
      { id: 10, goal_id: 2, title: "Xây dựng mini project hoàn chỉnh", is_completed: 0, sort_order: 5 },
    ],
  },
  {
    id: 3,
    title: "Ôn tập SQL",
    description: "Thành thạo truy vấn SELECT, JOIN, GROUP BY và thiết kế cơ sở dữ liệu quan hệ",
    start_date: "2026-10-01",
    target_date: "2026-10-25",
    status: "completed",
    steps: [
      { id: 11, goal_id: 3, title: "Tạo bảng và ràng buộc khóa ngoại (PK, FK)", is_completed: 1, sort_order: 1 },
      { id: 12, goal_id: 3, title: "Viết truy vấn INNER JOIN / LEFT JOIN", is_completed: 1, sort_order: 2 },
      { id: 13, goal_id: 3, title: "Hàm tổng hợp COUNT, SUM, AVG và GROUP BY", is_completed: 1, sort_order: 3 },
      { id: 14, goal_id: 3, title: "Tối ưu hóa truy vấn và kiểm thử dữ liệu mẫu", is_completed: 1, sort_order: 4 },
    ],
  },
];

const computeGoalProgress = g => {
  const steps = Array.isArray(g.steps) ? g.steps : [];
  const total = steps.length;
  const completed = steps.filter(s => s.is_completed === 1 || s.is_completed === true).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : (g.status === "completed" ? 100 : 0);
  return { ...g, total_steps: total, completed_steps: completed, progress, steps };
};

const goalStore = {
  all() {
    try {
      const raw = localStorage.getItem(GOAL_KEY);
      if (!raw) {
        const seed = defaultGoalsSeed();
        localStorage.setItem(GOAL_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  },
  save(list) {
    localStorage.setItem(GOAL_KEY, JSON.stringify(list));
  },
};

const localGoals = {
  list(p = {}) {
    const q = String(p.q || "").trim().toLowerCase();
    return goalStore
      .all()
      .map(computeGoalProgress)
      .filter(g => (!p.status || g.status === p.status) && (!q || (g.title + " " + (g.description || "")).toLowerCase().includes(q)));
  },
  get(id) {
    const g = goalStore.all().find(x => x.id === Number(id));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    return computeGoalProgress(g);
  },
  create(body) {
    if (!String(body.title || "").trim()) throw new Error("Vui lòng nhập tên mục tiêu");
    const all = goalStore.all();
    const nextId = all.length ? Math.max(...all.map(x => x.id)) + 1 : 1;
    const steps = Array.isArray(body.steps)
      ? body.steps
          .map((s, i) => ({
            id: Date.now() + i,
            goal_id: nextId,
            title: String(typeof s === "string" ? s : s?.title || "").trim(),
            is_completed: typeof s === "object" && s?.is_completed ? 1 : 0,
            sort_order: i + 1,
          }))
          .filter(s => s.title)
      : [];
    const item = {
      id: nextId,
      title: String(body.title).trim(),
      description: String(body.description || "").trim(),
      start_date: body.start_date || new Date().toISOString().slice(0, 10),
      target_date: body.target_date || null,
      status: body.status || "active",
      steps,
    };
    all.push(item);
    goalStore.save(all);
    return computeGoalProgress(item);
  },
  update(id, body) {
    const all = goalStore.all();
    const g = all.find(x => x.id === Number(id));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    Object.assign(g, {
      title: body.title !== undefined ? String(body.title).trim() : g.title,
      description: body.description !== undefined ? String(body.description).trim() : g.description,
      start_date: body.start_date !== undefined ? body.start_date : g.start_date,
      target_date: body.target_date !== undefined ? body.target_date : g.target_date,
      status: body.status || g.status,
    });
    goalStore.save(all);
    return computeGoalProgress(g);
  },
  remove(id) {
    goalStore.save(goalStore.all().filter(x => x.id !== Number(id)));
    return null;
  },
  addStep(goalId, body) {
    const all = goalStore.all();
    const g = all.find(x => x.id === Number(goalId));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    const title = String(body.title || "").trim();
    if (!title) throw new Error("Vui lòng nhập nội dung bước");
    g.steps = Array.isArray(g.steps) ? g.steps : [];
    const nextStepId = g.steps.length ? Math.max(...g.steps.map(s => s.id)) + 1 : Date.now();
    g.steps.push({ id: nextStepId, goal_id: g.id, title, is_completed: 0, sort_order: g.steps.length + 1 });
    if (g.status === "completed") g.status = "active";
    goalStore.save(all);
    return computeGoalProgress(g);
  },
  updateStep(goalId, stepId, body) {
    const all = goalStore.all();
    const g = all.find(x => x.id === Number(goalId));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    const st = (g.steps || []).find(s => s.id === Number(stepId));
    if (!st) throw new Error("Không tìm thấy bước");
    if (body.title !== undefined) st.title = String(body.title).trim();
    if (body.is_completed !== undefined) st.is_completed = body.is_completed ? 1 : 0;
    if (g.steps.length > 0 && g.status !== "paused") {
      g.status = g.steps.every(s => s.is_completed === 1) ? "completed" : "active";
    }
    goalStore.save(all);
    return computeGoalProgress(g);
  },
  toggleStep(goalId, stepId) {
    const all = goalStore.all();
    const g = all.find(x => x.id === Number(goalId));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    const st = (g.steps || []).find(s => s.id === Number(stepId));
    if (!st) throw new Error("Không tìm thấy bước");
    st.is_completed = st.is_completed ? 0 : 1;
    if (g.steps.length > 0 && g.status !== "paused") {
      g.status = g.steps.every(s => s.is_completed === 1) ? "completed" : "active";
    }
    goalStore.save(all);
    return computeGoalProgress(g);
  },
  removeStep(goalId, stepId) {
    const all = goalStore.all();
    const g = all.find(x => x.id === Number(goalId));
    if (!g) throw new Error("Không tìm thấy mục tiêu");
    g.steps = (g.steps || []).filter(s => s.id !== Number(stepId));
    if (g.steps.length > 0 && g.status !== "paused") {
      g.status = g.steps.every(s => s.is_completed === 1) ? "completed" : "active";
    }
    goalStore.save(all);
    return computeGoalProgress(g);
  },
};

const sessionStore = {
  all() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        const now = new Date();
        const dayStr = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString(); };
        const seed = [
          { id: 1, goal_id: 1, goal_title: "Hoàn thành StudySphere", started_at: dayStr(-3), duration_minutes: 45, notes: "Thiết kế bảng dữ liệu" },
          { id: 2, goal_id: 2, goal_title: "Học JavaScript", started_at: dayStr(-2), duration_minutes: 60, notes: "Thực hành Fetch API" },
          { id: 3, goal_id: 1, goal_title: "Hoàn thành StudySphere", started_at: dayStr(-1), duration_minutes: 90, notes: "Xây dựng SkillTrack" },
          { id: 4, goal_id: 1, goal_title: "Hoàn thành StudySphere", started_at: dayStr(0), duration_minutes: 60, notes: "Kiểm thử tiến độ" },
        ];
        localStorage.setItem(SESSION_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  },
  save(list) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(list));
  },
};

const localSessions = {
  list(p = {}) {
    const all = sessionStore.all();
    return p.goalId ? all.filter(s => s.goal_id === Number(p.goalId)) : all;
  },
  create(body) {
    const mins = Number(body.duration_minutes);
    if (!mins || mins <= 0) throw new Error("Thời lượng học phải lớn hơn 0 phút");
    const all = sessionStore.all();
    const goal = body.goal_id ? goalStore.all().find(g => g.id === Number(body.goal_id)) : null;
    const item = {
      id: all.length ? Math.max(...all.map(s => s.id)) + 1 : 1,
      goal_id: goal ? goal.id : null,
      goal_title: goal ? goal.title : null,
      started_at: body.started_at || new Date().toISOString(),
      duration_minutes: Math.round(mins),
      notes: String(body.notes || "").trim(),
    };
    all.unshift(item);
    sessionStore.save(all);
    return item;
  },
  remove(id) {
    sessionStore.save(sessionStore.all().filter(s => s.id !== Number(id)));
    return null;
  },
};

const localDashboard = {
  summary() {
    const goals = localGoals.list();
    const sessions = localSessions.list();
    const totalMinutes = sessions.reduce((s, x) => s + Number(x.duration_minutes || 0), 0);
    const pad2 = n => String(n).padStart(2, "0");
    const dKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const daily7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dKey(d);
      const mins = sessions.filter(s => String(s.started_at || "").slice(0, 10) === k).reduce((a, b) => a + Number(b.duration_minutes || 0), 0);
      daily7.push({ date: k, label: dayNames[d.getDay()], minutes: mins });
    }
    return {
      goals: {
        total: goals.length,
        completed: goals.filter(g => g.status === "completed" || g.progress === 100).length,
        active: goals.filter(g => g.status === "active" && g.progress < 100).length,
        avg_progress: goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0,
        items: goals,
      },
      study: {
        total_sessions: sessions.length,
        total_minutes: totalMinutes,
        total_hours: +(totalMinutes / 60).toFixed(1),
        current_streak: 4,
        best_streak: 4,
        daily_7_days: daily7,
        recent_sessions: sessions.slice(0, 10),
      },
      notes_count: noteStore.all().length,
    };
  },
};

/* ===== Danh sách API ===== */
const Api = {
  auth: {                                               // Thành viên 3 – Xác thực & Hồ sơ
    login: withFallback(
      body => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
      body => {
        if (!body.email || !body.password) throw new Error("Vui lòng nhập email và mật khẩu");
        const user = { id: 1, full_name: body.email.split("@")[0], name: body.email.split("@")[0], email: body.email, role: "user" };
        return { token: "local-demo-token", user };
      }
    ),
    register: withFallback(
      body => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
      body => {
        if (!body.full_name || !body.email || !body.password) throw new Error("Vui lòng điền đầy đủ thông tin");
        const user = { id: 1, full_name: body.full_name, name: body.full_name, email: body.email, role: "user" };
        return { token: "local-demo-token", user };
      }
    ),
    me: withFallback(
      () => request("/api/auth/me"),
      () => JSON.parse(localStorage.getItem(USER_KEY)) || { id: 1, full_name: "Sinh viên StudySphere", name: "Sinh viên StudySphere", email: "sinhvien@studysphere.vn", role: "user" }
    ),
    updateProfile: withFallback(
      body => request("/api/auth/me", { method: "PUT", body: JSON.stringify(body) }),
      body => {
        const cur = JSON.parse(localStorage.getItem(USER_KEY)) || {};
        const updated = { ...cur, full_name: body.full_name || cur.full_name, name: body.full_name || cur.name, email: body.email || cur.email };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      }
    ),
    changePassword: withFallback(
      body => request("/api/auth/password", { method: "PUT", body: JSON.stringify(body) }),
      () => ({ message: "Đổi mật khẩu thành công" })
    ),
  },

  goals: {                                              // Thành viên 3 – SkillTrack (Mục tiêu & Bước nhỏ)
    list:       withFallback(p => request("/api/goals?" + new URLSearchParams(p || {})), p => localGoals.list(p)),
    get:        withFallback(id => request(`/api/goals/${id}`), id => localGoals.get(id)),
    create:     withFallback(b => request("/api/goals", { method: "POST", body: JSON.stringify(b) }), b => localGoals.create(b)),
    update:     withFallback((id, b) => request(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify(b) }), (id, b) => localGoals.update(id, b)),
    remove:     withFallback(id => request(`/api/goals/${id}`, { method: "DELETE" }), id => localGoals.remove(id)),
    addStep:    withFallback((goalId, b) => request(`/api/goals/${goalId}/steps`, { method: "POST", body: JSON.stringify(b) }), (goalId, b) => localGoals.addStep(goalId, b)),
    updateStep: withFallback((goalId, stepId, b) => request(`/api/goals/${goalId}/steps/${stepId}`, { method: "PUT", body: JSON.stringify(b) }), (goalId, stepId, b) => localGoals.updateStep(goalId, stepId, b)),
    toggleStep: withFallback((goalId, stepId) => request(`/api/goals/${goalId}/steps/${stepId}/toggle`, { method: "PATCH" }), (goalId, stepId) => localGoals.toggleStep(goalId, stepId)),
    removeStep: withFallback((goalId, stepId) => request(`/api/goals/${goalId}/steps/${stepId}`, { method: "DELETE" }), (goalId, stepId) => localGoals.removeStep(goalId, stepId)),
  },

  studySessions: {                                      // Thành viên 3 – SkillTrack (Phiên học)
    list:   withFallback(p => request("/api/study-sessions?" + new URLSearchParams(p || {})), p => localSessions.list(p)),
    create: withFallback(b => request("/api/study-sessions", { method: "POST", body: JSON.stringify(b) }), b => localSessions.create(b)),
    remove: withFallback(id => request(`/api/study-sessions/${id}`, { method: "DELETE" }), id => localSessions.remove(id)),
  },

  dashboard: {                                          // Thành viên 3 – Thống kê & Dashboard tổng hợp
    summary: withFallback(() => request("/api/dashboard/summary"), () => localDashboard.summary()),
  },

  notes: {                                              // Thành viên 2 – NoteHub
    list:   withFallback(p => request("/api/notes?" + new URLSearchParams(p)),                    p => localNotes.list(p)),
    get:    withFallback(id => request(`/api/notes/${id}`),                                       id => localNotes.get(id)),
    create: withFallback(n => request("/api/notes", { method: "POST", body: JSON.stringify(n) }), n => localNotes.create(n)),
    update: withFallback((id, n) => request(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(n) }), (id, n) => localNotes.update(id, n)),
    pin:    withFallback(id => request(`/api/notes/${id}/pin`, { method: "PATCH" }),              id => localNotes.pin(id)),
    remove: withFallback(id => request(`/api/notes/${id}`, { method: "DELETE" }),                 id => localNotes.remove(id)),
    tags:   withFallback(() => request("/api/notes/tags"),                                        () => localNotes.tags()),
  },
};