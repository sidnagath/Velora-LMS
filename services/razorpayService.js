import Razorpay from 'razorpay';
import crypto from 'crypto';


class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: (process.env.RAZORPAY_KEY_ID || "").trim(),
      key_secret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
    });
  }

  async createRazorpayOrder(amount, receiptId) {
    try {
      // Amount must be in paise (smallest currency unit). E.g., ₹100 = 10000 paise.
      // Make sure amount is at least 100 paise (₹1).
      const amountInPaise = Math.round(amount * 100);

      if (amountInPaise < 100) {
         return { success: false, message: "Order amount must be at least ₹1.00" };
      }

      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId.toString(),
        payment_capture: 1 // Auto-capture payment
      };

      const order = await this.razorpay.orders.create(options);

      return {
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      };
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      const errorMsg = error.error ? error.error.description : (error.message || JSON.stringify(error));
      return { success: false, message: "Razorpay Error: " + errorMsg };
    }
  }

  verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpayOrderId + "|" + razorpayPaymentId)
        .digest('hex');

      if (generatedSignature === razorpaySignature) {
        return { success: true };
      } else {
        return { success: false, message: "Invalid payment signature." };
      }
    } catch (error) {
      console.error("Signature Verification Error:", error);
      return { success: false, message: "Error verifying payment signature." };
    }
  }
}

export default new RazorpayService();

