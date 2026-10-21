/**
 * - Mảng dữ liệu giả dựa trên SQL_StudySphere.sql
 * - Render vào table tbody#subjectBody hoặc div#subjectList
 * - Thêm / Sửa / Xóa bằng prompt/confirm và cập nhật UI ngay
 * - Pomodoro timer đơn giản (btn-pomo-start, btn-plus, btn-minus, pomo-time)
 */
(function () {
  // 1) Dữ liệu giả (dựa trên SQL_StudySphere.sql)
  let subjects = [
    { id: 1, code: 'MATH101', name: 'Toán học' },
    { id: 2, code: 'PROG201', name: 'Ngôn ngữ lập trình' },
    { id: 3, code: 'DB301',   name: 'Cơ sở dữ liệu' },
    { id: 4, code: 'NET201',  name: 'Mạng máy tính' },
    { id: 5, code: 'WEB301',  name: 'Thiết kế web' },
    { id: 6, code: 'ENG201',  name: 'Tiếng Anh' }
  ];

  // Utility: lấy element theo id (nếu có)
  const $ = id => document.getElementById(id);

  // 2) Render danh sách (hỗ trợ table tbody#subjectBody hoặc list div#subjectList)
  function renderSubjects(filter = '') {
    const q = (filter || '').trim().toLowerCase();

    const filtered = subjects.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );

    // Nếu có bảng tbody#subjectBody -> render dạng bảng
    const tbody = $('subjectBody');
    if (tbody) {
      tbody.innerHTML = filtered.map((s, i) => `
        <tr data-id="${s.id}">
          <td data-label="#">${i + 1}</td>
          <td data-label="Mã">${escapeHtml(s.code)}</td>
          <td data-label="Môn học">${escapeHtml(s.name)}</td>
          <td class="text-end">
            <button class="btn-edit" data-id="${s.id}">Sửa</button>
            <button class="btn-delete" data-id="${s.id}">Xóa</button>
          </td>
        </tr>
      `).join('');
    }

    // Nếu có div#subjectList -> render dạng thẻ / danh sách
    const list = $('subjectList');
    if (list) {
      list.innerHTML = filtered.map(s => `
        <div class="subject-card" data-id="${s.id}">
          <div><strong>${escapeHtml(s.code)}</strong> — ${escapeHtml(s.name)}</div>
          <div>
            <button class="btn-edit" data-id="${s.id}">Sửa</button>
            <button class="btn-delete" data-id="${s.id}">Xóa</button>
          </div>
        </div>
      `).join('');
    }

    // cập nhật đếm (nếu có phần tử #countText hoặc #heroCount)
    if ($('countText')) $('countText').textContent = `${filtered.length} môn học`;
    if ($('heroCount')) $('heroCount').textContent = subjects.length;
  }

  // Helper escape
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  // 3) Thêm môn học (dùng prompt đơn giản)
  function addSubject() {
    const code = prompt('Nhập mã môn (ví dụ MATH101):', '');
    if (!code) return;
    const name = prompt('Nhập tên môn:', '');
    if (!name) return;

    // tạo id mới (max id + 1)
    const id = subjects.length ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    subjects.push({ id, code: code.trim(), name: name.trim() });
    renderSubjects($('searchInput') ? $('searchInput').value : '');
    showTinyToast('Đã thêm môn học');
  }

  // Sửa môn học (prompt)
  function editSubject(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return alert('Môn học không tìm thấy');
    const newCode = prompt('Sửa mã môn:', s.code);
    if (!newCode) return;
    const newName = prompt('Sửa tên môn:', s.name);
    if (!newName) return;

    s.code = newCode.trim();
    s.name = newName.trim();
    renderSubjects($('searchInput') ? $('searchInput').value : '');
    showTinyToast('Đã cập nhật môn học');
  }

  // Xóa môn học
  function deleteSubject(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return alert('Môn học không tìm thấy');
    if (!confirm(`Bạn có chắc muốn xóa "${s.name}" (${s.code})?`)) return;
    subjects = subjects.filter(x => x.id !== id);
    renderSubjects($('searchInput') ? $('searchInput').value : '');
    showTinyToast('Đã xóa môn học');
  }

  // Event delegation cho buttons sửa / xóa trong container
  function attachListHandlers() {
    const tbody = $('subjectBody');
    const list = $('subjectList');

    const handler = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.classList.contains('btn-edit')) {
        editSubject(id);
      } else if (btn.classList.contains('btn-delete')) {
        deleteSubject(id);
      }
    };

    if (tbody) tbody.addEventListener('click', handler);
    if (list) list.addEventListener('click', handler);
  }

  // Tắt/bật search (nếu có #searchInput)
  function attachSearchHandler() {
    const si = $('searchInput');
    if (!si) return;
    si.addEventListener('input', () => renderSubjects(si.value));
  }

  // Nút thêm (nếu có #btnAdd or #btnAddSubject)
  function attachAddButtons() {
    const b1 = $('btnAdd');
    const b2 = $('btnAddSubject');
    const b3 = $('btnAddEmpty'); // trang hiện có thể có
    [b1, b2, b3].forEach(b => {
      if (b) b.addEventListener('click', addSubject);
    });
  }

  // tiny toast (nếu có element #toast) else fallback console.log
  let toastTimer = null;
  function showTinyToast(msg) {
    const el = $('toast');
    if (!el) {
      // fallback: console + alert suppressed
      console.log('[toast]', msg);
      return;
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Pomodoro Timer đơn giản ----------
  let totalSeconds = 25 * 60;
  let timerInterval = null;
  let isRunning = false;

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updatePomoDisplay() {
    const disp = $('pomo-time');
    if (disp) disp.textContent = formatTime(totalSeconds);
  }

  function startPomo() {
    const btn = $('btn-pomo-start');
    if (isRunning) {
      // pause
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      if (btn) { btn.textContent = 'Start'; btn.classList.remove('running'); }
      return;
    }
    // start
    isRunning = true;
    if (btn) { btn.textContent = 'Pause'; btn.classList.add('running'); }
    if (totalSeconds <= 0) totalSeconds = 25 * 60;
    timerInterval = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds--;
        updatePomoDisplay();
      } else {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        if (btn) { btn.textContent = 'Start'; btn.classList.remove('running'); }
        alert('Hoàn thành phiên Pomodoro! Hãy nghỉ ngơi một chút.');
      }
    }, 1000);
  }

  function adjustPomo(deltaSeconds) {
    if (isRunning) return; // không chỉnh khi đang chạy
    totalSeconds = Math.max(0, totalSeconds + deltaSeconds);
    updatePomoDisplay();
  }

  function attachPomoHandlers() {
    const startBtn = $('btn-pomo-start');
    const plusBtn = $('btn-plus');
    const minusBtn = $('btn-minus');

    if (startBtn) startBtn.addEventListener('click', startPomo);
    if (plusBtn) plusBtn.addEventListener('click', () => adjustPomo(5 * 60));
    if (minusBtn) minusBtn.addEventListener('click', () => adjustPomo(-5 * 60));

    // Init display
    updatePomoDisplay();
  }

  // ---------- Init ----------
  function init() {
    renderSubjects();
    attachListHandlers();
    attachSearchHandler();
    attachAddButtons();
    attachPomoHandlers();

    // nếu muốn, bạn có thể expose subjects ra window để debug:
    // window._subjects = subjects;
  }

  // Khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();