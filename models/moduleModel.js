const mongoose = require("mongoose");
const moduleSchema = new mongoose.Schema(
  {
    // COURSE REFERENCE
    courseId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Course",

      required: true
    },

    // MODULE TITLE
    title: {
      type: String,
      trim: true
    },

    // MODULE DESCRIPTION
    description: {
      type: String,
      trim: true
    },

    // MODULE ORDER
    order: {
      type: Number,
      default: 1
    }
  },

  // AUTO CREATED AT / UPDATED AT
  {
    timestamps: true
  }

);


module.exports = mongoose.model(
  "Module",
  moduleSchema
);