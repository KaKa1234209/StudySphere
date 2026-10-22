const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const c = require("../controller/dashboard.controller");

router.use(authenticate);

router.get("/", c.summary);
router.get("/summary", c.summary);

module.exports = router;
