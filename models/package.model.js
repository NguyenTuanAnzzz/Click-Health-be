const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // 'MONTH' or 'YEAR'
    name: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    features: [{ type: String }],
    color: { type: String }, // 'blue' or 'orange'
    durationMonths: { type: Number, required: true }
});

module.exports = mongoose.model('Package', packageSchema);
