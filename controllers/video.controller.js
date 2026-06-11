const HttpError = require('../models/http-error.model');
const { uploadVideo, getSecureVideoUrl } = require('../utils/minioClient');

const uploadPrivateVideo = async (req, res, next) => {
  if (!req.file) {
    return next(new HttpError('Vui lòng chọn một file video để tải lên.', 400));
  }

  try {
    const fileName = await uploadVideo(req.file);
    res.status(201).json({
      message: 'Upload video lên MinIO thành công!',
      videoKey: fileName // Trả về key để bạn lưu vào document của Place/History
    });
  } catch (err) {
    console.error('[MinIO Upload Error]', err);
    const error = new HttpError('Lưu video thất bại, vui lòng thử lại.', 500);
    return next(error);
  }
};

const getPrivateVideoUrl = async (req, res, next) => {
  const { videoKey } = req.params;

  try {
    // TẠI ĐÂY BẠN CÓ THỂ KIỂM TRA QUYỀN (Ví dụ: req.userData.userId)
    // Nếu user không có quyền, bạn return next(new HttpError('...', 403))
    
    // Tạo link tự hủy sống trong 5 phút (300 giây)
    const secureUrl = await getSecureVideoUrl(videoKey, 300); 
    res.json({ secureUrl });
  } catch (err) {
    const error = new HttpError('Không thể lấy link video, vui lòng thử lại.', 500);
    return next(error);
  }
};

module.exports = {
  uploadPrivateVideo,
  getPrivateVideoUrl
};
