// ==========================================================
// data.js – Dữ liệu dùng chung cho trang Nhiệm vụ và Lịch học
// USE_MOCK = true  : lưu tạm bằng localStorage (chưa cần backend)
// USE_MOCK = false : gọi API  /api/tasks  và  /api/subjects
//
// Môn học : { id, code, name, teacher, created_at }
// Nhiệm vụ: { id, title, description, subject_id, due_date "YYYY-MM-DD",
//             due_time "HH:MM" | null, priority "low|medium|high",
//             status "todo|doing|done", created_at }
// ==========================================================
const SFData = (() => {
  const USE_MOCK = true;
  const API = { subjects: "/api/subjects", tasks: "/api/tasks" };
  const KEYS = { subjects: "sf_subjects", tasks: "sf_tasks" };

  const STATUS = { todo: "Chưa làm", doing: "Đang làm", done: "Hoàn thành" };
  const STATUS_FLOW = { todo: "doing", doing: "done", done: "todo" };
  const PRIORITY = { high: "Cao", medium: "Trung bình", low: "Thấp" };
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const COLORS = ["#8c7ad0", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#4f46e5", "#64748b"];

  // ---------- Ngày giờ ----------
  const pad2 = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  const fmtDay = k => (k ? k.split("-").reverse().join("/") : "");
  const shiftDay = n => { const d = new Date(); d.setDate(d.getDate() + n); return dateKey(d); };

  // Số ngày từ hôm nay đến ngày k (âm = đã qua)
  function daysFromToday(k) {
    const [y, m, d] = k.split("-").map(Number);
    const t = new Date();
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
  }

  const subjectColor = id => COLORS[(Number(id) || 0) % COLORS.length];

  // ---------- Dữ liệu mẫu (lần mở đầu tiên) ----------
  const now = () => new Date().toISOString();
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

  // ---------- localStorage ----------
  function readLocal(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) { const s = seed(); localStorage.setItem(key, JSON.stringify(s)); return s; }
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }
  const writeLocal = (key, list) => localStorage.setItem(key, JSON.stringify(list));

  // ---------- API thật ----------
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

  const tasks = USE_MOCK ? {
    list: async () => readLocal(KEYS.tasks, seedTasks),
    create: async body => {
      const list = readLocal(KEYS.tasks, seedTasks);
      const item = { ...body, id: Math.max(0, ...list.map(t => t.id)) + 1, created_at: now() };
      writeLocal(KEYS.tasks, [...list, item]);
      return item;
    },
    update: async (id, body) => {
      writeLocal(KEYS.tasks, readLocal(KEYS.tasks, seedTasks).map(t => (t.id === Number(id) ? { ...t, ...body, id: Number(id) } : t)));
    },
    remove: async id => writeLocal(KEYS.tasks, readLocal(KEYS.tasks, seedTasks).filter(t => t.id !== Number(id))),
  } : {
    list: () => http(API.tasks),
    create: body => http(API.tasks, { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => http(`${API.tasks}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: id => http(`${API.tasks}/${id}`, { method: "DELETE" }),
  };

  const subjects = {
    list: USE_MOCK ? async () => readLocal(KEYS.subjects, () => SEED_SUBJECTS) : () => http(API.subjects),
  };

  return {
    tasks, subjects, STATUS, STATUS_FLOW, PRIORITY, PRIORITY_RANK, COLORS,
    pad2, dateKey, todayKey, fmtDay, shiftDay, daysFromToday, subjectColor,
  };
})();