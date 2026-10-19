// Hàm gọi API chung: tự gắn token đăng nhập, ném lỗi kèm thông báo từ server
async function request(url, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

const Api = {
  // ... các module khác thêm ở đây (auth, subjects, tasks, ...)

  notes: {                                             // Thành viên 2 – NoteHub
    list:   params => request("/api/notes?" + new URLSearchParams(params)),
    get:    id     => request(`/api/notes/${id}`),
    create: note   => request("/api/notes", { method: "POST", body: JSON.stringify(note) }),
    update: (id, note) => request(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(note) }),
    pin:    id     => request(`/api/notes/${id}/pin`, { method: "PATCH" }),
    remove: id     => request(`/api/notes/${id}`, { method: "DELETE" }),
    tags:   ()     => request("/api/notes/tags"),
  },
};