const service = require("../services/note.service");

// Controller chỉ nhận request → gọi service → trả response. Lỗi chuyển cho error-handler (next).
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

exports.list = wrap(async (req, res) => res.json(service.list(req.user.id, req.query)));
exports.getOne = wrap(async (req, res) => res.json(service.getOne(req.user.id, req.params.id)));
exports.create = wrap(async (req, res) => res.status(201).json(service.create(req.user.id, req.body)));
exports.update = wrap(async (req, res) => res.json(service.update(req.user.id, req.params.id, req.body)));
exports.togglePin = wrap(async (req, res) => res.json(service.togglePin(req.user.id, req.params.id)));
exports.remove = wrap(async (req, res) => { service.remove(req.user.id, req.params.id); res.status(204).end(); });
exports.listTags = wrap(async (req, res) => res.json(service.listTags(req.user.id)));