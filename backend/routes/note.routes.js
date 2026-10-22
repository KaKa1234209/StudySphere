const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const v = require("../validators/note.validator");
const c = require("../controller/note.controller");

router.use(authenticate); // mọi route ghi chú đều cần đăng nhập

router.get("/tags", c.listTags);                                  // phải đặt trước "/:id"
router.get("/", c.list);                                          // ?q=&tag=&subjectId=
router.post("/", validate(v.noteBody), c.create);
router.get("/:id", validate(v.noteId), c.getOne);
router.put("/:id", validate(v.noteId), validate(v.noteBody), c.update);
router.patch("/:id/pin", validate(v.noteId), c.togglePin);
router.delete("/:id", validate(v.noteId), c.remove);

module.exports = router;