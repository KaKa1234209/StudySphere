const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const c = require("../controller/study-session.controller");

router.use(authenticate);

router.get("/", c.list);
router.post("/", c.create);
router.delete("/:id", c.remove);

module.exports = router;
