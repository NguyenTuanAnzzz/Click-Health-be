const ExerciseHistory = require("../models/exercise-history.model");
const ExerciseSession = require("../models/exercise-session.model");
const HttpError = require("../models/http-error.model");

const validateProgramPayload = ({ programId, programTitle, programType }) => {
  return programId && programTitle && ["PREVENTION", "RECOVERY"].includes(programType);
};

const createHistoryFromSession = async (session) => {
  return ExerciseHistory.create({
    user: session.user,
    programId: session.programId,
    programTitle: session.programTitle,
    programType: session.programType,
    completedVideos: session.completedVideos,
    totalVideos: session.totalVideos,
    totalDurationSeconds: session.totalDurationSeconds,
    completedAt: session.completedAt || new Date(),
  });
};

const saveExerciseHistory = async (req, res, next) => {
  const userId = req.userData.id;
  const {
    programId,
    programTitle,
    programType,
    completedVideos,
    totalVideos,
    totalDurationSeconds,
  } = req.body;

  if (!validateProgramPayload({ programId, programTitle, programType })) {
    return next(new HttpError("Thông tin chương trình tập luyện không hợp lệ.", 400));
  }

  const createdHistory = new ExerciseHistory({
    user: userId,
    programId,
    programTitle,
    programType,
    completedVideos: Number(completedVideos) || 0,
    totalVideos: Number(totalVideos) || 0,
    totalDurationSeconds: Number(totalDurationSeconds) || 0,
    completedAt: new Date(),
  });

  try {
    await createdHistory.save();
  } catch (err) {
    return next(new HttpError("Lưu lịch sử tập luyện thất bại.", 500));
  }

  res.status(201).json({
    history: createdHistory.toObject({ getters: true }),
  });
};

const getActiveExerciseSession = async (req, res, next) => {
  const userId = req.userData.id;
  const { programId } = req.params;

  let session;
  try {
    session = await ExerciseSession.findOne({
      user: userId,
      programId,
      status: "IN_PROGRESS",
    }).sort({ updatedAt: -1 });
  } catch (err) {
    return next(new HttpError("Lấy buổi tập đang dở thất bại.", 500));
  }

  res.json({
    session: session ? session.toObject({ getters: true }) : null,
  });
};

const startExerciseSession = async (req, res, next) => {
  const userId = req.userData.id;
  const {
    programId,
    programTitle,
    programType,
    totalVideos,
    totalDurationSeconds,
    restart,
  } = req.body;

  if (!validateProgramPayload({ programId, programTitle, programType })) {
    return next(new HttpError("Thông tin chương trình tập luyện không hợp lệ.", 400));
  }

  try {
    const activeSession = await ExerciseSession.findOne({
      user: userId,
      programId,
      status: "IN_PROGRESS",
    }).sort({ updatedAt: -1 });

    if (activeSession && !restart) {
      return res.status(200).json({
        session: activeSession.toObject({ getters: true }),
      });
    }

    if (activeSession && restart) {
      activeSession.status = "CANCELLED";
      await activeSession.save();
    }

    const createdSession = await ExerciseSession.create({
      user: userId,
      programId,
      programTitle,
      programType,
      totalVideos: Number(totalVideos) || 0,
      totalDurationSeconds: Number(totalDurationSeconds) || 0,
      currentVideoIndex: 0,
      completedVideos: 0,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    });

    res.status(201).json({
      session: createdSession.toObject({ getters: true }),
    });
  } catch (err) {
    return next(new HttpError("Khởi tạo buổi tập thất bại.", 500));
  }
};

const updateExerciseSessionProgress = async (req, res, next) => {
  const userId = req.userData.id;
  const { sessionId } = req.params;
  const { currentVideoIndex, completedVideos } = req.body;

  let session;
  try {
    session = await ExerciseSession.findOne({
      _id: sessionId,
      user: userId,
      status: "IN_PROGRESS",
    });
  } catch (err) {
    return next(new HttpError("Cập nhật tiến độ buổi tập thất bại.", 500));
  }

  if (!session) {
    return next(new HttpError("Không tìm thấy buổi tập đang dở.", 404));
  }

  session.currentVideoIndex = Math.max(0, Number(currentVideoIndex) || 0);
  session.completedVideos = Math.max(0, Number(completedVideos) || 0);

  try {
    await session.save();
  } catch (err) {
    return next(new HttpError("Lưu tiến độ buổi tập thất bại.", 500));
  }

  res.json({
    session: session.toObject({ getters: true }),
  });
};

const completeExerciseSession = async (req, res, next) => {
  const userId = req.userData.id;
  const { sessionId } = req.params;

  let session;
  try {
    session = await ExerciseSession.findOne({
      _id: sessionId,
      user: userId,
    });
  } catch (err) {
    return next(new HttpError("Hoàn thành buổi tập thất bại.", 500));
  }

  if (!session) {
    return next(new HttpError("Không tìm thấy buổi tập.", 404));
  }

  if (session.status === "COMPLETED") {
    return res.json({
      session: session.toObject({ getters: true }),
      history: null,
    });
  }

  session.status = "COMPLETED";
  session.currentVideoIndex = Math.max(0, session.totalVideos - 1);
  session.completedVideos = session.totalVideos;
  session.completedAt = new Date();

  let history;
  try {
    await session.save();
    history = await createHistoryFromSession(session);
  } catch (err) {
    return next(new HttpError("Lưu lịch sử hoàn thành buổi tập thất bại.", 500));
  }

  res.json({
    session: session.toObject({ getters: true }),
    history: history.toObject({ getters: true }),
  });
};

const getMyExerciseHistory = async (req, res, next) => {
  const userId = req.userData.id;

  let history;
  try {
    history = await ExerciseHistory.find({ user: userId }).sort({ completedAt: -1 });
  } catch (err) {
    return next(new HttpError("Lấy lịch sử tập luyện thất bại.", 500));
  }

  res.json({
    history: history.map((item) => item.toObject({ getters: true })),
  });
};

exports.saveExerciseHistory = saveExerciseHistory;
exports.getMyExerciseHistory = getMyExerciseHistory;
exports.getActiveExerciseSession = getActiveExerciseSession;
exports.startExerciseSession = startExerciseSession;
exports.updateExerciseSessionProgress = updateExerciseSessionProgress;
exports.completeExerciseSession = completeExerciseSession;
