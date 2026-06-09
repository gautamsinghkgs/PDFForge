const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toolName: {
      type: String,
      required: true,
      // e.g. 'merge', 'compress', 'pdf-to-word'
    },
    toolLabel: {
      type: String,
      required: true,
      // e.g. 'Merge PDF'
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    inputFiles: [
      {
        originalName: String,
        size: Number, // bytes
        mimetype: String,
      },
    ],
    outputFile: {
      filename: String,
      size: Number,
      downloadUrl: String,
    },
    options: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  },
  { timestamps: true }
);

// Auto-delete expired documents
historySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('History', historySchema);
