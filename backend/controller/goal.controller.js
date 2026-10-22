const service = require("../service/goal.service");

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

exports.list = wrap(async (req, res) => res.json(service.list(req.user.id, req.query)));
exports.getOne = wrap(async (req, res) => res.json(service.getOne(req.user.id, req.params.id)));
exports.create = wrap(async (req, res) => res.status(201).json(service.create(req.user.id, req.body)));
exports.update = wrap(async (req, res) => res.json(service.update(req.user.id, req.params.id, req.body)));
exports.remove = wrap(async (req, res) => {
  service.remove(req.user.id, req.params.id);
  res.status(204).end();
});

// Các bước nhỏ trong mục tiêu (GoalTasks)
exports.addStep = wrap(async (req, res) =>
  res.status(201).json(service.addStep(req.user.id, req.params.id, req.body))
);
exports.updateStep = wrap(async (req, res) =>
  res.json(service.updateStep(req.user.id, req.params.id, req.params.stepId, req.body))
);
exports.toggleStep = wrap(async (req, res) =>
  res.json(service.toggleStep(req.user.id, req.params.id, req.params.stepId))
);
exports.removeStep = wrap(async (req, res) =>
  res.json(service.removeStep(req.user.id, req.params.id, req.params.stepId))
);
