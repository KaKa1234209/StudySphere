const service = require("../service/auth.service");

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

exports.register = wrap(async (req, res) => res.status(201).json(service.register(req.body || {})));
exports.login = wrap(async (req, res) => res.json(service.login(req.body || {})));
exports.me = wrap(async (req, res) => res.json(service.getProfile(req.user.id)));
exports.updateProfile = wrap(async (req, res) => res.json(service.updateProfile(req.user.id, req.body || {})));
exports.changePassword = wrap(async (req, res) => res.json(service.changePassword(req.user.id, req.body || {})));
