const { PayOS } = require("@payos/node");
const User = require("../models/user.model");

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'client-id',
  apiKey: process.env.PAYOS_API_KEY || 'api-key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'checksum-key'
});

const createPaymentUrl = async (req, res, next) => {
    let amount = req.body.amount;
    let returnUrl = process.env.VNP_RETURNURL || 'http://localhost:3000/payment-result';
    
    const orderCode = Number(String(Date.now()).slice(-6));
    
    const requestData = {
        orderCode: orderCode,
        amount: amount,
        description: 'Thanh toan BeFast',
        returnUrl: returnUrl,
        cancelUrl: returnUrl
    };

    try {
        const paymentLinkResponse = await payos.createPaymentLink(requestData);
        // Trả về paymentUrl thay vì checkoutUrl để frontend không cần sửa code
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error("PayOS Error:", error);
        res.status(500).json({ message: "Failed to create payment link" });
    }
};

const vnpayReturn = async (req, res, next) => {
    const { code, cancel, status, orderCode } = req.query;

    if (status === 'PAID' && cancel === 'false' && code === '00') {
        try {
            const paymentInfo = await payos.getPaymentLinkInformation(orderCode);
            
            if (paymentInfo && paymentInfo.status === 'PAID') {
                const userId = req.userData.id;
                const amount = paymentInfo.amount;
                
                let subStatus = 'NONE';
                let durationMonths = 0;

                if (amount >= 40000 && amount <= 60000) {
                    subStatus = 'MONTH';
                    durationMonths = 1;
                } else if (amount >= 400000 && amount <= 600000) {
                    subStatus = 'YEAR';
                    durationMonths = 12;
                }

                if (subStatus !== 'NONE') {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

                    const updatedUser = await User.findByIdAndUpdate(userId, {
                        subscriptionStatus: subStatus,
                        subscriptionExpiry: expiryDate,
                        freeAttemptsLeft: 0
                    }, { new: true });

                    if (updatedUser) {
                        console.log(`[PAYOS DEBUG] UPDATED USER: ${updatedUser.email} to ${subStatus}`);
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
