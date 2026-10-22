const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const c = require("../controller/auth.controller");

router.post("/register", c.register);
router.post("/login", c.login);
router.get("/me", authenticate, c.me);
router.put("/me", authenticate, c.updateProfile);
router.put("/password", authenticate, c.changePassword);

module.exports = router;
