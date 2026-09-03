import mongoose from 'mongoose';


const resourceSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true
    },
    // Files (Course Materials)
    files: [
      {
        name: {
          type: String,
          required: true
        },
        path: {
          type: String,
          required: true
        },
        size: {
          type: String,
          default: "0 Bytes"
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // Supplementary Links
    links: [
      {
        title: {
          type: String,
          required: true
        },
        url: {
          type: String,
          required: true
        },
        description: {
          type: String,
          trim: true
        }
      }
    ],
    // Instructor Notes
    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Resource", resourceSchema);
