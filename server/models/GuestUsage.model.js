const mongoose = require('mongoose');

const guestUsageSchema = new mongoose.Schema({
  guestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  count: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('GuestUsage', guestUsageSchema);
