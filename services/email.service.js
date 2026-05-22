const nodemailer = require("nodemailer");
const dns = require("dns").promises;
const axios = require("axios");

exports.sendOtpEmail = async (to, otp) => {
  // Option A: Use Resend HTTPS API if API Key is configured (Recommended for Render)
  if (process.env.RESEND_API_KEY) {
    console.log(`[EMAIL_SERVICE] RESEND_API_KEY detected. Sending email via Resend API to ${to}...`);
    
    // Fallback email for testing sandbox. If user has domain, they can configure EMAIL_FROM in Render
    const fromEmail = process.env.EMAIL_FROM || "Click Health <onboarding@resend.dev>";
    
    try {
      const response = await axios.post(
        "https://api.resend.com/emails",
        {
          from: fromEmail,
          to: [to],
          subject: "Click Health - Your Verification Code",
          html: `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h2 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Click Health</h2>
                <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Your health, our priority</p>
              </div>
              
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 12px 0; text-align: center;">Mã Xác Thực OTP của bạn</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                  Cảm ơn bạn đã lựa chọn Click Health. Vui lòng nhập mã OTP dưới đây để xác nhận tài khoản của bạn:
                </p>
                
                <div style="text-align: center; margin: 24px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 16px 32px; border-radius: 12px; border: 2px dashed #bfdbfe; display: inline-block; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);">${otp}</span>
                </div>
                
                <p style="color: #ef4444; font-size: 12px; text-align: center; margin: 0; font-weight: 500;">
                  ⚠️ Mã OTP này có hiệu lực trong vòng 5 phút và chỉ sử dụng được 1 lần duy nhất.
                </p>
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi để được giải đáp.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
              
              <div style="text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">© 2026 Click Health. All rights reserved.</p>
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">Email này được gửi tự động từ hệ thống Click Health.</p>
              </div>
            </div>
          `
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("[EMAIL_SERVICE] Resend API Response:", response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error("[EMAIL_SERVICE] Resend API Failed:", errorMsg);
      throw new Error(`Resend email delivery failed: ${errorMsg}`);
    }
  }

  // Option B: Fallback to Nodemailer SMTP (Local development or legacy configurations)
  console.log(`[EMAIL_SERVICE] RESEND_API_KEY not configured. Falling back to SMTP connection...`);
  let targetIp = "smtp.gmail.com"; 
  try {
    const ips = await dns.resolve4("smtp.gmail.com");
    if (ips && ips.length > 0) {
      targetIp = ips[0];
      console.log(`[SMTP_DNS] Resolved smtp.gmail.com to IPv4: ${targetIp}`);
    }
  } catch (dnsErr) {
    console.error("[SMTP_DNS] DNS resolution failed, using fallback host:", dnsErr);
  }

  const transporter = nodemailer.createTransport({
    host: targetIp,
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      servername: "smtp.gmail.com", 
      rejectUnauthorized: false     
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Verification Code",
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
  });
  console.log(`[SMTP] Legacy SMTP Email sent successfully to ${to}`);
};
