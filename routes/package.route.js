const express = require("express");
const packageController = require("../controllers/package.controller");
const checkAuth = require("../middleware/check-auth.middleware");

const router = express.Router();

router.get("/", packageController.getPackages);
router.patch("/:code", checkAuth, checkAuth.admin, packageController.updatePackage);

module.exports = router;
