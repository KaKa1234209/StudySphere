renderLayout("notes", "NoteHub / Soạn ghi chú");

const $ = id => document.getElementById(id);
const noteId = new URLSearchParams(location.search).get("id");
let pinned = 0;

fillSubjects($("subject"), false);

function showPinLabel() {
  $("pin").textContent = pinned ? "Bỏ ghim" : "Ghim ghi chú";
}

// Nếu đang sửa: nạp dữ liệu cũ vào form
async function loadNote() {
  if (!noteId) return;
  try {
    const n = await Api.notes.get(noteId);
    $("title").value = n.title;
    $("content").value = n.content;
    $("task").value = n.task_id || "";
    $("subject").value = n.subject_id || "";
    $("tags").value = n.tags.join(", ");
    pinned = n.pinned ? 1 : 0;
    $("del").hidden = false;
    showPinLabel();
  } catch (err) {
    toast(err.message);
  }
}

$("pin").addEventListener("click", () => { pinned = pinned ? 1 - 1 : 1; showPinLabel(); });

$("save").addEventListener("click", async () => {
  const note = {
    title: $("title").value.trim(),
    content: $("content").value,
    subject_id: $("subject").value || null,
    task_id: $("task").value || null,
    tags: $("tags").value.split(",").map(t => t.trim()).filter(Boolean),
    pinned,
  };
  try {
    noteId ? await Api.notes.update(noteId, note) : await Api.notes.create(note);
    toast("Đã lưu ghi chú");
    setTimeout(() => (location.href = "notes.html"), 600);
  } catch (err) {
    toast(err.message);                         // VD: "Cần có tiêu đề hoặc nội dung"
  }
});

$("del").addEventListener("click", async () => {
  if (!confirm("Xóa ghi chú này?")) return;
  try { await Api.notes.remove(noteId); location.href = "notes.html"; }
  catch (err) { toast(err.message); }
});

showPinLabel();
loadNote();