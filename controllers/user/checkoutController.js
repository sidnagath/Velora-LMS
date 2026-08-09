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
    // We now might receive one orderId from the array, or we just load it.
    const { orderId } = req.params;
    
    // We can just fetch this single order for the success page display
    // Or we fetch all orders from the session, but passing one orderId is fine for a generic success page.
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
        taxableAmount: result.data.taxableAmount,
        gstAmount: result.data.gstAmount,
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
      if (result.data.bypassRazorpay) {
          return res.json({ 
            success: true, 
            bypassRazorpay: true,
            dbOrderIds: result.data.dbOrderIds 
          });
      }
      return res.json({ 
        success: true, 
        order: result.data.order,
        dbOrderIds: result.data.dbOrderIds 
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderIds } = req.body;
    const userId = req.session.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !dbOrderIds || !Array.isArray(dbOrderIds)) {
      return res.status(400).json({ success: false, message: "Missing required payment fields." });
    }

    const result = await orderService.verifyAndFulfillOrder(dbOrderIds, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (result.success) {
      // We can just return the first order ID for the success page redirect
      return res.json({ success: true, message: result.message, orderId: result.data.orderIds[0] });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying payment." });
  }
};
