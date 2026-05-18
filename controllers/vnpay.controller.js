const moment = require('moment');
const crypto = require("crypto");
const HttpError = require("../models/http-error.model");
const User = require("../models/user.model");

function sortObject(obj) {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    for (let key of keys) {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    }
    return sorted;
}

const createPaymentUrl = async (req, res, next) => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    let tmnCode = process.env.VNP_TMNCODE;
    let secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURNURL;
    let orderId = moment(date).format('DDHHmmss');
    let amount = req.body.amount;
    let bankCode = req.body.bankCode;
    
    let locale = req.body.language || 'vn';
    let currCode = 'VND';
    
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if(bankCode !== null && bankCode !== ''){
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    const finalUrl = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false }) + '&vnp_SecureHash=' + signed;
    res.status(200).json({ paymentUrl: finalUrl });
};

const vnpayReturn = async (req, res, next) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sort and re-encode for signature verification
    const sortedParams = sortObject(vnp_Params);

    let secretKey = process.env.VNP_HASHSECRET;
    let querystring = require('qs');
    let signData = querystring.stringify(sortedParams, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    console.log('[VNPAY DEBUG] Verification Match:', secureHash === signed);

    if (secureHash === signed) {
        const responseCode = vnp_Params['vnp_ResponseCode'];
        if (responseCode === "00") {
            try {
                const userId = req.userData.id;
                const amount = parseInt(vnp_Params['vnp_Amount']) / 100;
                
                let status = 'NONE';
                let durationMonths = 0;

                if (amount >= 40000 && amount <= 60000) {
                    status = 'MONTH';
                    durationMonths = 1;
                } else if (amount >= 400000 && amount <= 600000) {
                    status = 'YEAR';
                    durationMonths = 12;
                }

                if (status !== 'NONE') {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

                    const updatedUser = await User.findByIdAndUpdate(userId, {
                        subscriptionStatus: status,
                        subscriptionExpiry: expiryDate,
                        freeAttemptsLeft: 0
                    }, { new: true });

                    if (updatedUser) {
                        console.log(`[VNPAY DEBUG] UPDATED USER: ${updatedUser.email} to ${status}`);
                        return res.status(200).json({ code: '00', message: 'Success' });
                    }
                }
            } catch (err) {
                console.error('[VNPAY DEBUG] DB UPDATE FAILED:', err);
                return res.status(500).json({ code: '99', message: 'Database error' });
            }
        }
        return res.status(200).json({ code: responseCode, message: 'Payment failed' });
    } else {
        console.error('[VNPAY DEBUG] SIGNATURE INVALID');
        return res.status(200).json({ code: '97', message: 'Invalid signature' });
    }
};

exports.createPaymentUrl = createPaymentUrl;
exports.vnpayReturn = vnpayReturn;
