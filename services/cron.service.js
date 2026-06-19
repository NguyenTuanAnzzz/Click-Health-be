const cron = require('node-cron');
const User = require('../models/user.model');
const emailService = require('./email.service');

// Chạy vào 20:00 Chủ nhật hằng tuần theo giờ Việt Nam.
cron.schedule('0 20 * * 0', async () => {
  console.log('[CRONJOB] Bắt đầu kiểm tra người dùng không hoạt động ít nhất 7 ngày...');

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Tìm người dùng đã kích hoạt nhưng không tương tác trong 7 ngày qua.
    const inactiveUsers = await User.find({
      isActive: true,
      lastActiveAt: { $lt: oneWeekAgo },
    });

    console.log(`[CRONJOB] Tìm thấy ${inactiveUsers.length} người dùng cần nhắc nhở.`);

    for (const user of inactiveUsers) {
      try {
        await emailService.sendReminderEmail(user.email, user.fullName);
        console.log(`[CRONJOB] Đã gửi nhắc nhở thành công cho ${user.email}`);
      } catch (err) {
        console.error(`[CRONJOB] Lỗi khi gửi nhắc nhở cho ${user.email}:`, err.message);
      }
    }

    console.log('[CRONJOB] Hoàn tất quá trình gửi nhắc nhở hằng tuần.');
  } catch (error) {
    console.error('[CRONJOB] Lỗi hệ thống:', error);
  }
}, {
  timezone: 'Asia/Ho_Chi_Minh',
});

console.log('[CRONJOB] Đã khởi động dịch vụ gửi email nhắc nhở hằng tuần (Chủ nhật 20:00 Asia/Ho_Chi_Minh).');
