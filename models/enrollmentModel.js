import mongoose from 'mongoose';


const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active"
    },
    completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson"
}]
  },
  {
    timestamps: true
  }
);

// Prevent duplicate enrollments for the same user and course
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model("Enrollment", enrollmentSchema);
