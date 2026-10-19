const $ = id => document.getElementById(id);
const state = { q: "", tag: "", subjectId: "" };    // bộ lọc hiện tại

fillSubjects($("subject"), true);

// Tô sáng từ khóa tìm kiếm trong văn bản
function highlight(text) {
  const safe = esc(text);
  if (!state.q) return safe;
  const pattern = esc(state.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

// HTML của một thẻ ghi chú
function noteCard(n) {
  const subject = SUBJECTS.find(s => s.id == n.subject_id);
  return `
  <a class="card" href="note-editor.html?id=${n.id}">
    <h3>
      <span>${highlight(n.title || "Chưa đặt tiêu đề")}</span>
      <button class="pin ${n.pinned ? "on" : ""}" data-pin="${n.id}" aria-label="Ghim ghi chú">${n.pinned ? "★" : "☆"}</button>
    </h3>
    <p>${highlight(n.content)}</p>
    <div>${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <div class="meta">${subject ? subject.name : "Chưa có môn"}${n.task_id ? " · Nhiệm vụ #" + n.task_id : ""}</div>
  </a>`;
}

async function render() {
  try {
    const [notes, tags] = await Promise.all([Api.notes.list(state), Api.notes.tags()]);

    $("tags").innerHTML = tags
      .map(t => `<button class="chip ${state.tag === t ? "on" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`)
      .join("");

    const pinned = notes.filter(n => n.pinned);
    const others = notes.filter(n => !n.pinned);
    $("list").innerHTML = !notes.length
      ? `<div class="empty">Chưa có ghi chú nào khớp. Hãy tạo ghi chú đầu tiên của bạn.</div>`
      : (pinned.length ? `<div class="sec">Đã ghim</div><div class="grid">${pinned.map(noteCard).join("")}</div>` : "") +
        (others.length ? `<div class="sec">${pinned.length ? "Ghi chú khác" : "Tất cả ghi chú"}</div><div class="grid">${others.map(noteCard).join("")}</div>` : "");
  } catch (err) {
    toast(err.message);
  }
}

// Gõ tìm kiếm: chờ 250ms sau lần gõ cuối rồi mới gọi API
let timer;
$("q").addEventListener("input", e => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 250);
});
$("subject").addEventListener("change", e => { state.subjectId = e.target.value; render(); });

// Bấm thẻ để lọc, bấm ★ để ghim
document.addEventListener("click", async e => {
  const tagBtn = e.target.closest("[data-tag]");
  if (tagBtn) { state.tag = state.tag === tagBtn.dataset.tag ? "" : tagBtn.dataset.tag; render(); }

  const pinBtn = e.target.closest("[data-pin]");
  if (pinBtn) {
    e.preventDefault();                       // không mở trang sửa
    try { await Api.notes.pin(pinBtn.dataset.pin); render(); } catch (err) { toast(err.message); }
  }
});

render();