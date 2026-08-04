const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true,
      default: "percentage"
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1
    },

    maxDiscount: {
      type: Number,
      default: 0
    },

    minOrderValue: {
      type: Number,
      default: 0
    },

    expiryDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    usageLimit:{
      type:Number,
      required:true,
      default:100
    },
    usageCount:{
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Coupon", couponSchema);