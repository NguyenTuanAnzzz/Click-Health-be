const { PayOS } = require("@payos/node");
const User = require("../models/user.model");
const Package = require("../models/package.model");

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'client-id',
  apiKey: process.env.PAYOS_API_KEY || 'api-key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'checksum-key'
});

const createPaymentUrl = async (req, res, next) => {
    let amount = req.body.amount;
    // Tự động lấy origin (ví dụ http://localhost:3000 hoặc https://vercel.app) để redirect về đúng nơi người dùng đang đứng
    let returnUrl = req.headers.origin 
        ? `${req.headers.origin}/payment-result` 
        : (process.env.VNP_RETURNURL || 'http://localhost:3000/payment-result');
    
    const orderCode = Number(String(Date.now()).slice(-6));
    
    const requestData = {
        orderCode: orderCode,
        amount: amount,
        description: 'Thanh toan BeFast',
        returnUrl: returnUrl,
        cancelUrl: returnUrl
    };

    try {
        const paymentLinkResponse = await payos.paymentRequests.create(requestData);
        // Trả về paymentUrl thay vì checkoutUrl để frontend không cần sửa code
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error("PayOS Error:", error);
        res.status(500).json({ message: "Failed to create payment link" });
    }
};

const vnpayReturn = async (req, res, next) => {
    const { code, cancel, status, orderCode } = req.query;

    if (code === '00' || status === 'PAID') {
        try {
            const paymentInfo = await payos.paymentRequests.get(String(orderCode));
            
            if (paymentInfo && paymentInfo.status === 'PAID') {
                const userId = req.userData.id;
                const amount = paymentInfo.amount;
                
                let subStatus = 'NONE';
                let durationMonths = 0;

                const monthPkg = await Package.findOne({ code: 'MONTH' });
                const yearPkg = await Package.findOne({ code: 'YEAR' });

                if (monthPkg && amount === monthPkg.price) {
                    subStatus = 'MONTH';
                    durationMonths = monthPkg.durationMonths;
                } else if (yearPkg && amount === yearPkg.price) {
                    subStatus = 'YEAR';
                    durationMonths = yearPkg.durationMonths;
                }

                if (subStatus !== 'NONE') {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

                    const updatedUser = await User.findByIdAndUpdate(userId, {
                        subscriptionStatus: subStatus,
                        subscriptionExpiry: expiryDate,
                        freeAttemptsLeft: 0,
                        freeAttemptsBefastLeft: 0,
                        freeAttemptsBmiLeft: 0
                    }, { new: true });

                    if (updatedUser) {
                        return res.status(200).json({ code: '00', message: 'Success' });
                    }
                }
            }
        } catch (err) {
            console.error('[PAYOS DEBUG] DB UPDATE OR FETCH FAILED:', err);
            return res.status(500).json({ code: '99', message: 'Database error' });
        }
    }
    
    console.error('[PAYOS DEBUG] PAYMENT FAILED OR CANCELED');
    return res.status(200).json({ code: '99', message: 'Payment failed' });
};

exports.createPaymentUrl = createPaymentUrl;
exports.vnpayReturn = vnpayReturn;
