const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      default: function() {
        // Auto-generate VEL-YYYYMMDD-XXXX
        const date = new Date();
        const dateStr = date.getFullYear().toString() +
                        (date.getMonth() + 1).toString().padStart(2, '0') +
                        date.getDate().toString().padStart(2, '0');
        const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
        return `VEL-${dateStr}-${randomStr}`;
      }
    },
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
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    courseDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "free"],
      default: "razorpay"
    },
    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending"
    },
    refundStatus:{
      type: String,
      enum: ["pending","approved","rejected"],
      default: null
    },
    refundReason:{
      type: String,
      default: null
    },
    refundRequestedAt:{
    type: Date,
    default: null
    },
    refundProcessedAt:{
    type: Date,
    default: null
    },

    failureReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
