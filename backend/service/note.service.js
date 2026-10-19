const repo = require("../repositories/note.repository");
const AppError = require("../utils/AppError");

// Làm sạch danh sách thẻ: bỏ khoảng trắng, bỏ trùng, bỏ rỗng
const cleanTags = (tags = []) => [...new Set(tags.map(t => String(t).trim()).filter(Boolean))];

exports.list = (userId, query) =>
  repo.findAll(userId, { q: (query.q || "").trim(), tag: query.tag, subjectId: query.subjectId });

exports.getOne = (userId, id) => {
  const note = repo.findById(userId, id);
  if (!note) throw new AppError(404, "Không tìm thấy ghi chú");
  return note;
};

exports.create = (userId, data) => {
  const id = repo.insert(userId, data);
  repo.replaceTags(userId, id, cleanTags(data.tags));
  return exports.getOne(userId, id);
};

exports.update = (userId, id, data) => {
  exports.getOne(userId, id); // đảm bảo ghi chú tồn tại và thuộc về user
  repo.update(userId, id, data);
  repo.replaceTags(userId, id, cleanTags(data.tags));
  return exports.getOne(userId, id);
};

exports.togglePin = (userId, id) => {
  exports.getOne(userId, id);
  repo.togglePin(userId, id);
  return exports.getOne(userId, id);
};

exports.remove = (userId, id) => {
  exports.getOne(userId, id);
  repo.remove(userId, id);
};

exports.listTags = userId => repo.findAllTags(userId);