// Nhận request, kiểm tra dữ liệu, gọi service, trả JSON { success, data }.
const service = require("../services/subject.service");
const v = require("../utils/validate");
const { asyncHandler, getUserId, parseId, ok } = require("../utils/http");

// Lấy và kiểm tra các trường của môn học từ body
function readBody(body = {}) {
  return {
    code: (v.text(body.code, { label: "Mã môn", max: 20 }) || "").toUpperCase() || null,
    name: v.text(body.name, { label: "tên môn học", max: 100, required: true }),
    teacher: v.text(body.teacher, { label: "Tên giáo viên", max: 100 }),
  };
}

// GET /api/subjects?q=
exports.list = asyncHandler(async (req, res) => {
  const q = v.text(req.query.q, { label: "Từ khóa", max: 100 });
  ok(res, await service.list(getUserId(req), { q }));
});

// GET /api/subjects/:id
exports.getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getById(getUserId(req), parseId(req.params.id)));
});

// POST /api/subjects
exports.create = asyncHandler(async (req, res) => {
  ok(res, await service.create(getUserId(req), readBody(req.body)), 201);
});

// PUT /api/subjects/:id
exports.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  ok(res, await service.update(getUserId(req), id, readBody(req.body)));
});

// DELETE /api/subjects/:id
exports.remove = asyncHandler(async (req, res) => {
  await service.remove(getUserId(req), parseId(req.params.id));
  ok(res, null);
});