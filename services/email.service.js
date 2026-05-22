const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for other ports
  family: 4,     // Strictly force Nodemailer to use IPv4 only and completely bypass IPv6
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // bypass SSL certificate validation blocks on cloud platforms
  }
});

exports.sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Verification Code",
    text: `Your OTP code is ${otp}. It will expire in 1 minutes.`
  });
};
