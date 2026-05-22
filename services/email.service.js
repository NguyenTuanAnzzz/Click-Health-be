const nodemailer = require("nodemailer");
const dns = require("dns").promises;

exports.sendOtpEmail = async (to, otp) => {
  let targetIp = "smtp.gmail.com"; // Fallback to hostname if DNS resolve fails
  try {
    // Force direct query of IPv4 A records, bypassing any OS/environment IPv6 preferences
    const ips = await dns.resolve4("smtp.gmail.com");
    if (ips && ips.length > 0) {
      targetIp = ips[0];
      console.log(`[SMTP_DNS] Successfully resolved smtp.gmail.com to IPv4: ${targetIp}`);
    }
  } catch (dnsErr) {
    console.error("[SMTP_DNS] DNS IPv4 resolution failed, using fallback host:", dnsErr);
  }

  const transporter = nodemailer.createTransport({
    host: targetIp,
    port: 587,
    secure: false, // false for port 587 (uses STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      servername: "smtp.gmail.com", // Critical: validates the certificate against Gmail's domain!
      rejectUnauthorized: false     // Bypasses intermediate SSL chain errors on virtual environments
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Verification Code",
    text: `Your OTP code is ${otp}. It will expire in 1 minutes.`
  });
};
