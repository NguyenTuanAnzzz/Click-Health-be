const express = require("express");
const placeController = require("../controllers/place.controller");

const router = express.Router();


router.get("/nearby-hospitals", placeController.getNearbyHospital);

module.exports = router;