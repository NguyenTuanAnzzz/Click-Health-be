const express = require("express");
const exerciseController = require("../controllers/exercise.controller");
const checkAuth = require("../middleware/check-auth.middleware");

const router = express.Router();

router.use(checkAuth);

router.get("/sessions/active/:programId", exerciseController.getActiveExerciseSession);
router.post("/sessions/start", exerciseController.startExerciseSession);
router.patch("/sessions/:sessionId/progress", exerciseController.updateExerciseSessionProgress);
router.post("/sessions/:sessionId/complete", exerciseController.completeExerciseSession);

router.post("/history", exerciseController.saveExerciseHistory);
router.get("/history/me", exerciseController.getMyExerciseHistory);

module.exports = router;
