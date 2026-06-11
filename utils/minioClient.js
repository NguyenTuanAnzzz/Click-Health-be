const Minio = require('minio');
const crypto = require('crypto');
const path = require('path');

// Nếu có biến môi trường R2_ENDPOINT thì dùng Cloudflare, không thì dùng localhost (Docker)
const endPointHost = process.env.R2_ENDPOINT 
  ? process.env.R2_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/$/, '') // Xóa https:// và dấu / ở cuối
  : 'localhost';

const minioClient = new Minio.Client({
  endPoint: endPointHost,
  port: process.env.R2_ENDPOINT ? 443 : 9000, 
  useSSL: process.env.R2_ENDPOINT ? true : false,
  accessKey: process.env.R2_ACCESS_KEY || 'admin',
  secretKey: process.env.R2_SECRET_KEY || 'password123'
});

const BUCKET_NAME = 'videos';

// Tự động kiểm tra và tạo Bucket "videos" nếu chưa có
const initBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'ap-southeast-1');
      console.log(`[MinIO] Bucket '${BUCKET_NAME}' created successfully.`);
    } else {
      console.log(`[MinIO] Bucket '${BUCKET_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('[MinIO] Error creating bucket:', err);
  }
};
initBucket();

/**
 * Upload file từ Multer (MemoryStorage) lên MinIO
 * @param {Object} file - File object nhận từ req.file của multer
 * @returns {Promise<string>} - Tên file đã lưu thành công
 */
const uploadVideo = async (file) => {
  // Tạo tên file ngẫu nhiên để không bị trùng (vd: 5e6...7d.mp4)
  const fileName = crypto.randomUUID() + path.extname(file.originalname);
  
  // Đẩy file lên Bucket
  await minioClient.putObject(
    BUCKET_NAME, 
    fileName, 
    file.buffer, 
    file.size, 
    { 'Content-Type': file.mimetype }
  );

  return fileName; // Bạn sẽ lưu tên file này vào MongoDB
};

/**
 * Tạo Presigned URL (Link xem video tự hủy) chống leak
 * @param {string} fileName - Tên file (lấy từ MongoDB ra)
 * @param {number} expiryInSeconds - Thời gian sống của link (mặc định 5 phút = 300s)
 * @returns {Promise<string>} - Link url để xem video
 */
const getSecureVideoUrl = async (fileName, expiryInSeconds = 300) => {
  try {
    return await minioClient.presignedGetObject(BUCKET_NAME, fileName, expiryInSeconds);
  } catch (error) {
    console.error('[MinIO] Lỗi khi tạo link:', error);
    throw error;
  }
};

module.exports = {
  minioClient,
  uploadVideo,
  getSecureVideoUrl
};
