const cron = require('node-cron');
const User = require('../models/user.model');
const emailService = require('./email.service');

// Lên lịch chạy vào 20:00 (8 PM) mỗi ngày
cron.schedule('0 20 * * *', async () => {
  console.log('[CRONJOB] Bắt đầu kiểm tra người dùng chưa tương tác hôm nay...');
  try {
    // Thời điểm 24 giờ trước
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Tìm các user đã kích hoạt nhưng không có cập nhật gì trong 24h qua.
    const inactiveUsers = await User.find({ 
      isActive: true, 
      lastActiveAt: { $lt: oneDayAgo } 
    });

    console.log(`[CRONJOB] Tìm thấy ${inactiveUsers.length} người dùng cần nhắc nhở.`);

    for (const user of inactiveUsers) {
      try {
        await emailService.sendReminderEmail(user.email, user.fullName);
        console.log(`[CRONJOB] Đã gửi nhắc nhở thành công cho ${user.email}`);
      } catch (err) {
        console.error(`[CRONJOB] Lỗi khi gửi cho ${user.email}:`, err.message);
      }
    }
    
    console.log('[CRONJOB] Hoàn tất quá trình gửi nhắc nhở.');
  } catch (error) {
    console.error('[CRONJOB] Lỗi hệ thống:', error);
  }
});

console.log('[CRONJOB] Đã khởi động dịch vụ gửi Email nhắc nhở hàng ngày (Giống Duolingo).');
