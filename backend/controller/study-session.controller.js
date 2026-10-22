const service = require("../service/dashboard.service");

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

exports.list = wrap(async (req, res) => res.json(service.listSessions(req.user.id, req.query)));
exports.create = wrap(async (req, res) => res.status(201).json(service.createSession(req.user.id, req.body)));
exports.remove = wrap(async (req, res) => {
  service.removeSession(req.user.id, req.params.id);
  res.status(204).end();
});
