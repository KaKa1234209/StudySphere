renderLayout("subjects", "StudyFlow / Môn học");

(function () {
  const $ = id => document.getElementById(id);
  const KEY = "studysphere.subjects";

  /* ===== Dữ liệu ===== */
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch {}
    return [];
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(subjects));

  let subjects = load();
  let editingId = null;                 // null = đang thêm mới

  /* ===== Hiển thị ===== */
  function row(s) {
    return `
    <div class="sj-row">
      <span class="sj-code">${esc(s.code)}</span>
      <div class="sj-info">
        <b>${esc(s.name)}</b>
        <small>${s.teacher ? "GV: " + esc(s.teacher) : "Chưa có giáo viên"}</small>
      </div>
      <div class="sj-actions">
        <button data-edit="${s.id}" aria-label="Sửa ${esc(s.name)}"><i class="fa-regular fa-pen-to-square"></i></button>
        <button data-del="${s.id}" aria-label="Xóa ${esc(s.name)}"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    </div>`;
  }

  const emptyState = `
    <div class="sj-empty">
      <div class="sj-empty-icon"></div>
      <h3>Chưa có môn học nào</h3>
      <p>Hãy thêm môn học đầu tiên của bạn để bắt đầu sắp xếp việc học.</p>
      <button class="btn-primary" id="btnAddEmpty"><i class="fa-solid fa-plus"></i> Thêm môn học</button>
    </div>`;

  function render() {
    const q = $("searchInput").value.trim().toLowerCase();
    const list = subjects.filter(s => (s.code + " " + s.name + " " + (s.teacher || "")).toLowerCase().includes(q));

    if (!subjects.length) $("subjectList").innerHTML = emptyState;
    else if (!list.length) $("subjectList").innerHTML = `<p class="sj-none">Không có môn học nào khớp.</p>`;
    else $("subjectList").innerHTML = list.map(row).join("");

    $("heroCount").textContent = subjects.length;
    $("countText").textContent = `${list.length} môn học`;
  }

  /* ===== Hộp thoại thêm / sửa ===== */
  function openDialog(s) {
    editingId = s ? s.id : null;
    $("dlg-title").textContent = s ? "Sửa môn học" : "Thêm môn học";
    $("f-code").value = s ? s.code : "";
    $("f-name").value = s ? s.name : "";
    $("f-teacher").value = s ? s.teacher || "" : "";
    $("f-error").textContent = "";
    $("dlg").showModal();
    $("f-code").focus();
  }

  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const code = $("f-code").value.trim().toUpperCase();
    const name = $("f-name").value.trim();
    const teacher = $("f-teacher").value.trim();

    if (!code || !name) { $("f-error").textContent = "Vui lòng nhập mã môn và tên môn."; return; }
    if (subjects.some(s => s.code === code && s.id !== editingId)) {
      $("f-error").textContent = `Mã môn ${code} đã tồn tại.`; return;
    }

    if (editingId) {
      Object.assign(subjects.find(s => s.id === editingId), { code, name, teacher });
      toast("Đã cập nhật môn học");
    } else {
      const id = subjects.length ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
      subjects.push({ id, code, name, teacher });
      toast("Đã thêm môn học");
    }
    save();
    $("dlg").close();
    render();
  });

  /* ===== Sự kiện ===== */
  $("btnAddHero").addEventListener("click", () => openDialog(null));
  $("btn-cancel").addEventListener("click", () => $("dlg").close());
  $("searchInput").addEventListener("input", render);

  // Event delegation: nút Thêm (trạng thái trống), Sửa, Xóa
  $("subjectList").addEventListener("click", e => {
    if (e.target.closest("#btnAddEmpty")) return openDialog(null);

    const edit = e.target.closest("[data-edit]");
    if (edit) return openDialog(subjects.find(s => s.id === Number(edit.dataset.edit)));

    const del = e.target.closest("[data-del]");
    if (del) {
      const s = subjects.find(x => x.id === Number(del.dataset.del));
      if (s && confirm(`Xóa môn "${s.name}" (${s.code})?`)) {
        subjects = subjects.filter(x => x.id !== s.id);
        save();
        render();
        toast("Đã xóa môn học");
      }
    }
  });

    // Bấm vào nền tối bên ngoài thì đóng hộp thoại
  $("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });
  render();
})();