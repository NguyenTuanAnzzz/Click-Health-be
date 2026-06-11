const express = require('express');
const multer = require('multer');
const videoController = require('../controllers/video.controller');
// const checkAuth = require('../middleware/check-auth'); // Nếu có, bỏ comment dòng này

const router = express.Router();

// Cấu hình Multer lưu tạm vào RAM để controller đẩy lên MinIO
const upload = multer({ storage: multer.memoryStorage() });

// Route 1: Upload Video
// POST /api/videos/upload
router.post('/upload', upload.single('video'), videoController.uploadPrivateVideo);

// Route 2: Lấy Link xem Video chống leak
// GET /api/videos/play/:videoKey
router.get('/play/:videoKey', videoController.getPrivateVideoUrl);

module.exports = router;
