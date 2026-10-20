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

  if (res.status === 401 && !DEV_NO_AUTH) {
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

/* ===== Danh sách API ===== */
const Api = {
  // ... các module khác thêm ở đây (auth, tasks, goals...)

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