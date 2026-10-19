// Mỗi hàm nhận req, trả về mảng thông báo lỗi.
exports.noteBody = req => {
  const { title, content, tags } = req.body;
  const errors = [];
  if (!(title || "").trim() && !(content || "").trim()) errors.push("Cần có tiêu đề hoặc nội dung");
  if ((title || "").length > 200) errors.push("Tiêu đề tối đa 200 ký tự");
  if (tags !== undefined && !Array.isArray(tags)) errors.push("Thẻ phải là một danh sách");
  return errors;
};

exports.noteId = req =>
  Number.isInteger(Number(req.params.id)) ? [] : ["Mã ghi chú không hợp lệ"];