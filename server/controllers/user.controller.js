const User = require('../models/User.model');
const History = require('../models/History.model');

// ── @route GET /api/user/profile ──
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route PUT /api/user/profile ──
exports.updateProfile = async (req, res) => {
  try {
    const update = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ success: false, message: 'Name must be 2-50 characters' });
      }
      update.name = name;
    }
    if (req.body.avatar !== undefined) {
      const avatar = String(req.body.avatar).trim();
      if (avatar.length > 500) {
        return res.status(400).json({ success: false, message: 'Avatar URL too long' });
      }
      update.avatar = avatar;
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      update,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

// ── @route PUT /api/user/change-password ──
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain uppercase, lowercase, and a number' });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password change failed' });
  }
};

// ── @route GET /api/user/dashboard ──
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalTasks = await History.countDocuments({ user: userId });
    const recentHistory = await History.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('toolLabel status createdAt outputFile inputFiles');

    // Tools used count
    const toolStats = await History.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$toolName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const planLimits = { free: 10, pro: 100, enterprise: Infinity };
    const user = await User.findById(userId);
    const [storage] = await History.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $group: { _id: null, bytes: { $sum: '$outputFile.size' } } },
    ]);

    res.json({
      success: true,
      dashboard: {
        totalTasks,
        tasksToday: user.tasksToday,
        taskLimit: planLimits[user.plan],
        plan: user.plan,
        recentHistory,
        topTools: toolStats,
        storageUsed: storage?.bytes || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
