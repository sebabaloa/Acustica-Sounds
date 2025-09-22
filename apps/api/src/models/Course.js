const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  muxPlaybackId: { type: String },
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, default: 0 },
  public: { type: Boolean, default: true },
  lessons: [LessonSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Course || mongoose.model('Course', CourseSchema);
