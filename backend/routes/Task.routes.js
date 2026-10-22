const router = require("express").Router();
const controller = require("../controllers/subject.controller");

// Khi có module đăng nhập, thêm middleware xác thực ở đây:
// router.use(require("../middlewares/auth"));

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;