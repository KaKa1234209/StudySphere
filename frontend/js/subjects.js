(() => {
  const API = '/api/subjects';
  const DEFAULT_COLOR = '#4f46e5';
  const $ = id => document.getElementById(id);

  let subjects = [];
  let deleteId = null;

  const subjectModal = new bootstrap.Modal($('subjectModal'));
  const confirmModal = new bootstrap.Modal($('confirmModal'));
  const form = $('subjectForm');

  // ---------- Tiện ích ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : DEFAULT_COLOR);

  const fmtDate = d => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date) ? '' : date.toLocaleDateString('vi-VN');
  };

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || 'Có lỗi xảy ra, vui lòng thử lại');
    }
    return json.data;
  }

  // ---------- Hiển thị danh sách ----------
  function render() {
    const q = $('searchInput').value.trim().toLowerCase();
    const list = subjects.filter(s =>
      s.name.toLowerCase().includes(q) || (s.teacher || '').toLowerCase().includes(q)
    );

    $('countText').textContent = `${list.length} môn học`;
    $('heroCount').textContent = subjects.length;
    $('subjectTable').classList.toggle('d-none', list.length === 0);
    $('emptyState').classList.toggle('d-none', list.length > 0);

    if (list.length === 0) {
      const noData = subjects.length === 0;
      $('emptyTitle').textContent = noData ? 'Chưa có môn học nào' : 'Không tìm thấy kết quả';
      $('emptyText').textContent = noData
        ? 'Hãy thêm môn học đầu tiên của bạn để bắt đầu sắp xếp việc học.'
        : 'Thử tìm bằng từ khóa khác nhé.';
      $('btnAddEmpty').classList.toggle('d-none', !noData);
    }

    $('subjectBody').innerHTML = list.map((s, i) => `
      <tr>
        <td data-label="#">${i + 1}</td>
        <td data-label="Môn học">
          <span class="sf-subject"><span class="sf-avatar" style="--c:${safeColor(s.color)}">${esc(s.name.trim().charAt(0).toUpperCase())}</span><span class="sf-name">${esc(s.name)}</span></span>
        </td>
        <td data-label="Giáo viên">${s.teacher ? esc(s.teacher) : '<span class="sf-muted">Chưa cập nhật</span>'}</td>
        <td data-label="Ngày tạo">${fmtDate(s.created_at)}</td>
        <td class="text-end sf-actions">
          <button type="button" class="btn sf-btn-outline sf-btn-sm" data-action="edit" data-id="${s.id}">
            <i class="bi bi-pencil"></i>Sửa
          </button>
          <button type="button" class="btn sf-btn-outline sf-btn-sm" data-action="delete" data-id="${s.id}">
            <i class="bi bi-trash"></i>Xóa
          </button>
        </td>
      </tr>`).join('');
  }

  async function load() {
    try {
      subjects = await request(API);
    } catch (err) {
      subjects = [];
      toast(err.message);
    }
    render();
  }

  // ---------- Chọn màu ----------
  function selectedColor() {
    const checked = document.querySelector('input[name="color"]:checked');
    return checked ? checked.value : DEFAULT_COLOR;
  }

  function setColor(color) {
    const c = safeColor(color);
    let radio = [...document.querySelectorAll('input[name="color"]')]
      .find(r => r.value.toLowerCase() === c.toLowerCase());

    // Màu cũ không nằm trong bảng màu: thêm ô màu để không bị mất
    if (!radio) {
      const label = document.createElement('label');
      label.className = 'sf-swatch';
      label.style.setProperty('--c', c);
      label.innerHTML = `<input type="radio" name="color" value="${c}"><span></span>`;
      $('swatches').appendChild(label);
      radio = label.querySelector('input');
    }
    radio.checked = true;
  }

  // ---------- Mở modal thêm / sửa ----------
  function openForm(subject) {
    form.classList.remove('was-validated');
    form.reset();
    $('subjectId').value = subject ? subject.id : '';
    $('modalTitle').textContent = subject ? 'Sửa môn học' : 'Thêm môn học';
    $('name').value = subject ? subject.name : '';
    $('teacher').value = subject ? (subject.teacher || '') : '';
    setColor(subject ? subject.color : DEFAULT_COLOR);
    subjectModal.show();
  }

  $('subjectModal').addEventListener('shown.bs.modal', () => $('name').focus());

  // ---------- Lưu (thêm hoặc sửa) ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('name').value.trim();
    if (!name || !form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const id = $('subjectId').value;
    const body = { name, teacher: $('teacher').value.trim(), color: selectedColor() };
    const btn = $('btnSave');
    btn.disabled = true;

    try {
      await request(id ? `${API}/${id}` : API, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      subjectModal.hide();
      await load();
      toast(id ? 'Đã cập nhật môn học' : 'Đã thêm môn học');
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Xóa ----------
  $('btnConfirmDelete').addEventListener('click', async () => {
    if (deleteId === null) return;
    const btn = $('btnConfirmDelete');
    btn.disabled = true;
    try {
      await request(`${API}/${deleteId}`, { method: 'DELETE' });
      confirmModal.hide();
      await load();
      toast('Đã xóa môn học');
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
      deleteId = null;
    }
  });

  // ---------- Sự kiện ----------
  $('btnAdd').addEventListener('click', () => openForm(null));
  $('btnAddEmpty').addEventListener('click', () => openForm(null));
  $('searchInput').addEventListener('input', render);

  $('subjectBody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const subject = subjects.find(s => s.id === Number(btn.dataset.id));
    if (!subject) return;

    if (btn.dataset.action === 'edit') {
      openForm(subject);
    } else {
      deleteId = subject.id;
      $('confirmName').textContent = subject.name;
      confirmModal.show();
    }
  });

  load();
})();
