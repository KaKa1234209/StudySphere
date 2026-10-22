const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const c = require("../controller/goal.controller");

router.use(authenticate);

router.get("/", c.list);
router.post("/", c.create);
router.get("/:id", c.getOne);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

// Bước thực hiện của mục tiêu (GoalTasks)
router.post("/:id/steps", c.addStep);
router.put("/:id/steps/:stepId", c.updateStep);
router.patch("/:id/steps/:stepId/toggle", c.toggleStep);
router.delete("/:id/steps/:stepId", c.removeStep);

module.exports = router;
