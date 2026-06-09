const History = require('../models/History.model');
const { deleteDownloadFile } = require('../utils/downloads');

// ── @route GET /api/history ──
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      History.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      History.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route DELETE /api/history/:id ──
exports.deleteHistory = async (req, res) => {
  try {
    const entry = await History.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    deleteDownloadFile(entry.outputFile?.downloadUrl);
    res.json({ success: true, message: 'History entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route DELETE /api/history ──
exports.clearHistory = async (req, res) => {
  try {
    const entries = await History.find({ user: req.user._id }).select('outputFile.downloadUrl');
    entries.forEach((entry) => deleteDownloadFile(entry.outputFile?.downloadUrl));
    await History.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
