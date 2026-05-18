const express = require("express");
const vnpayControllers = require("../controllers/vnpay.controller");
const checkAuth = require("../middleware/check-auth.middleware");

const router = express.Router();

router.use(checkAuth);

router.post("/create_payment_url", vnpayControllers.createPaymentUrl);
router.get("/vnpay_return", vnpayControllers.vnpayReturn);

module.exports = router;
