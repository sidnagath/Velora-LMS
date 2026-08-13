const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(

  {

    // MODULE REFERENCE

    moduleId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Module",

      required: true

    },


    // LESSON TITLE
    title: {
      type: String,
      trim: true
    },

    // LESSON DESCRIPTION
    description: {
      type: String,
      trim: true
    },



    // VIDEO FILE
    video: {
      type: String
    },

    // CLOUDINARY PUBLIC ID FOR SECURE URL SIGNING
    videoPublicId: {
      type: String
    },

    // VIDEO DURATION
    duration: {
      type: String
    },

    // LESSON ORDER
    order: {
      type: Number,
      default: 1
    },

    // FREE PREVIEW
    isPreviewFree: {
      type: Boolean,
      default: false
    }
  },

  // AUTO CREATED AT / UPDATED AT

  {
    timestamps: true
  }
);



module.exports = mongoose.model(
  "Lesson",
  lessonSchema
);