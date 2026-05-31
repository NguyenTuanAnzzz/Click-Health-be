/**
 * Chuẩn hóa payload BEFAST từ frontend (realtime hoặc legacy) trước khi lưu DB.
 */
function normalizeTestResult(raw) {
  if (!raw || typeof raw !== "object") {
    return { is_abnormal: false, message: "", realtime: false, metrics: {} };
  }

  const {
    is_abnormal,
    message,
    realtime,
    label,
    riskLevel,
    frameCount,
    metrics,
    ...rest
  } = raw;

  const mergedMetrics = {
    ...(metrics && typeof metrics === "object" ? metrics : {}),
    ...rest,
  };

  delete mergedMetrics.is_abnormal;
  delete mergedMetrics.message;
  delete mergedMetrics.realtime;
  delete mergedMetrics.label;
  delete mergedMetrics.riskLevel;
  delete mergedMetrics.frameCount;
  delete mergedMetrics.metrics;

  return {
    is_abnormal: Boolean(
      is_abnormal ??
        raw.arm_weakness ??
        raw.balance_issue ??
        raw.speech_issue ??
        raw.is_abnormal ??
        (label && label !== "normal")
    ),
    message: message || "",
    realtime: Boolean(realtime),
    label: label || null,
    riskLevel: riskLevel || null,
    frameCount: frameCount ?? null,
    metrics: mergedMetrics,
  };
}

function normalizeBefastPayload(body) {
  const { balance, eyes, face, arm, speech, conclusion } = body;

  return {
    balance: normalizeTestResult(balance),
    eyes: normalizeTestResult(eyes),
    face: normalizeTestResult(face),
    arm: normalizeTestResult(arm),
    speech: normalizeTestResult(speech),
    conclusion: {
      isDanger: Boolean(conclusion?.isDanger),
      totalScore: conclusion?.totalScore ?? 0,
      analysisMode: conclusion?.analysisMode || "realtime",
    },
  };
}

module.exports = { normalizeBefastPayload, normalizeTestResult };
