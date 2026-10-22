const service = require("../services/task.service");
const v = require("../utils/validate");
const { asyncHandler, getUserId, parseId, ok } = require("../utils/http");

const STATUSES = ["todo", "doing", "done"];
const PRIORITIES = ["low", "medium", "high"];

// Lấy và kiểm tra các trường của nhiệm vụ từ body (bỏ qua trường thừa như id, created_at)
function readBody(body = {}) {
  return {
    title: v.text(body.title, { label: "tên nhiệm vụ", max: 150, required: true }),
    description: v.text(body.description, { label: "Mô tả", max: 500 }),
    subject_id: v.optionalId(body.subject_id, "Môn học"),
    due_date: v.date(body.due_date, "hạn nộp"),
    due_time: v.time(body.due_time, "Giờ"),
    priority: v.oneOf(body.priority, PRIORITIES, "Mức ưu tiên", "medium"),
    status: v.oneOf(body.status, STATUSES, "Trạng thái", "todo"),
  };
}

// Đọc tham số lọc trên đường dẫn; tham số nào có thì mới kiểm tra
function readFilter(query = {}) {
  const filter = {};
  if (query.subject_id) filter.subject_id = v.optionalId(query.subject_id, "Môn học");
  if (query.status) filter.status = v.oneOf(query.status, STATUSES, "Trạng thái");
  if (query.priority) filter.priority = v.oneOf(query.priority, PRIORITIES, "Mức ưu tiên");
  if (query.date) filter.date = v.date(query.date, "ngày");
  if (query.from) filter.from = v.date(query.from, "ngày bắt đầu");
  if (query.to) filter.to = v.date(query.to, "ngày kết thúc");
  if (query.q) filter.q = v.text(query.q, { label: "Từ khóa", max: 100 });
  return filter;
}

// GET /api/tasks?subject_id=&status=&priority=&date=&from=&to=&q=
exports.list = asyncHandler(async (req, res) => {
  ok(res, await service.list(getUserId(req), readFilter(req.query)));
});

// GET /api/tasks/stats?subject_id=
exports.stats = asyncHandler(async (req, res) => {
  ok(res, await service.stats(getUserId(req), readFilter(req.query)));
});

// GET /api/tasks/:id
exports.getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getById(getUserId(req), parseId(req.params.id)));
});

// POST /api/tasks
exports.create = asyncHandler(async (req, res) => {
  ok(res, await service.create(getUserId(req), readBody(req.body)), 201);
});

// PUT /api/tasks/:id
exports.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  ok(res, await service.update(getUserId(req), id, readBody(req.body)));
});

// DELETE /api/tasks/:id
exports.remove = asyncHandler(async (req, res) => {
  await service.remove(getUserId(req), parseId(req.params.id));
  ok(res, null);
});