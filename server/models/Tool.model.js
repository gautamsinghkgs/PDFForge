const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      // e.g. 'merge', 'split', 'compress'
    },
    label: {
      type: String,
      required: true,
      // e.g. 'Merge PDF'
    },
    description: String,
    category: {
      type: String,
      enum: ['organize', 'optimize', 'convert', 'edit', 'security', 'ai'],
      required: true,
    },
    icon: String,         // emoji or icon name
    colorFrom: String,    // gradient start
    colorTo: String,      // gradient end
    isPremium: {
      type: Boolean,
      default: false,
    },
    // ✅ FIX: `isNew` is a reserved Mongoose pathname.
    // suppressReservedKeysWarning in schema options silences the warning.
    isNew: {
      type: Boolean,
      default: false,
    },
    totalUsage: {
      type: Number,
      default: 0,
    },
    acceptedFormats: [String],  // e.g. ['.pdf', '.docx']
    outputFormat: String,
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

module.exports = mongoose.model('Tool', toolSchema);
