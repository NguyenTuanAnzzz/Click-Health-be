const axios = require("axios");
const HttpError = require("../models/http-error.model");

const AI_BASE = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

const ENDPOINTS = {
  arm: "/v1/realtime/analyze/arm",
  balance: "/v1/realtime/analyze/balance",
  face: "/v1/realtime/analyze/face",
  speech: "/v1/realtime/analyze/speech",
};

/**
 * Proxy phân tích realtime tới Ai-Click-Health (tránh CORS, giấu URL AI khỏi client).
 */
const proxyRealtimeAnalyze = async (req, res, next) => {
  const testType = req.params.testType;
  const path = ENDPOINTS[testType];

  if (!path) {
    return next(new HttpError("Loại bài test không hợp lệ.", 400));
  }

  try {
    const { data } = await axios.post(`${AI_BASE}${path}`, req.body, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });
    res.json(data);
  } catch (err) {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "Không kết nối được dịch vụ AI.";
    return next(new HttpError(msg, err.response?.status || 502));
  }
};

const aiHealth = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${AI_BASE}/v1/realtime/health`, { timeout: 5000 });
    res.json({ ai: data, baseUrl: AI_BASE });
  } catch (err) {
    return next(new HttpError("Dịch vụ AI không phản hồi.", 503));
  }
};

exports.proxyRealtimeAnalyze = proxyRealtimeAnalyze;
exports.aiHealth = aiHealth;
