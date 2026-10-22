const service = require("../service/dashboard.service");

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

exports.summary = wrap(async (req, res) => res.json(service.getSummary(req.user.id)));
