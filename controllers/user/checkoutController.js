const checkoutService = require("../../services/checkoutService");
const profileService = require("../../services/profileService"); 
const cartService = require("../../services/cartService");
const razorpayService = require("../../services/razorpayService");
const orderService = require("../../services/orderService");

exports.getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    
    // Fetch checkout data and cart count concurrently
    const [checkoutResult, cartCount] = await Promise.all([
      checkoutService.getCheckoutData(userId),
      cartService.getCartCount(userId)
    ]);

    if (!checkoutResult.success) {
      req.flash("error", "Failed to load checkout.");
      return res.redirect("/");
    }

    res.render("pages/user/checkout/checkout", {
      title: "Checkout",
      isLoggedIn: true,
      cart: checkoutResult.cart,
      subtotal: checkoutResult.subtotal,
      total: checkoutResult.total,
      coupons: checkoutResult.coupons || [],
      cartCount: cartCount.success ? cartCount.count : 0,
      razorpayKeyId: (process.env.RAZORPAY_KEY_ID || "").trim()
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
  }
};

exports.getPaymentSuccess = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { orderId } = req.params;
    
    const result = await orderService.getPaymentSuccessData(orderId, userId);
    
    if (!result.success) {
      req.flash("error", result.message || "Order not found");
      return res.redirect("/");
    }
    
    const cartCount = await cartService.getCartCount(userId);
    
    res.render("pages/user/checkout/payment-success", {
      title: "Payment Success",
      isLoggedIn: true,
      order: result.data.order,
      cartCount: cartCount.success ? cartCount.count : 0
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { couponId, cartSubtotal } = req.body;
    
    const result = await orderService.applyCoupon(couponId, cartSubtotal);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        discountAmount: result.data.discountAmount,
        finalTotal: result.data.finalTotal,
        couponCode: result.data.couponCode,
        couponId: result.data.couponId
      });
    } else {
      return res.json({ success: false, message: result.message });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to apply coupon." });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { appliedCouponId } = req.body;

    const result = await orderService.createPendingOrderAndRazorpayOrder(userId, appliedCouponId);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        order: result.data.order,
        dbOrderId: result.data.dbOrderId 
      });
    } else {
      // It might be a bad request if cart is empty or enrolled
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ success: false, message: "Server error creating order." });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;
    const userId = req.session.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !dbOrderId) {
      return res.status(400).json({ success: false, message: "Missing required payment fields." });
    }

    const result = await orderService.verifyAndFulfillOrder(dbOrderId, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (result.success) {
      return res.json({ success: true, message: result.message, orderId: result.data.orderId });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying payment." });
  }
};
