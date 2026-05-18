const express = require("express");
const befastHistoryControllers = require("../controllers/befast-history.controller");
const checkAuth = require("../middleware/check-auth.middleware");

const router = express.Router();

// Tất cả các route lịch sử đều yêu cầu đăng nhập
router.use(checkAuth);

router.post("/save", befastHistoryControllers.saveHistory);
router.get("/my-history", befastHistoryControllers.getMyHistory);

module.exports = router;
