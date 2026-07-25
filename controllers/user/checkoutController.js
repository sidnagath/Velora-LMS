const checkoutService=require("../../services/checkoutService.js");
const profileService = require("../../services/profileService"); 
const cartService = require("../../services/cartService"); // Import cartService
const razorpayService = require("../../services/razorpayService");

exports.getCheckoutPage=async (req,res)=>{
  
try{
  const userId=req.session.user?.id;
  
  // Fetch checkout data and cart count concurrently
  const [checkoutResult, cartCount] = await Promise.all([
    checkoutService.getCheckoutData(userId),
    cartService.getCartCount(userId)
  ]);

  if(!checkoutResult.success){
    req.flash("error","Failed to load checkout.");
    return res.redirect("/")
  }

  res.render("pages/user/checkout/checkout",{
    title:"Checkout",
    isLoggedIn:true,
    cart:checkoutResult.cart,
    subtotal:checkoutResult.subtotal,
    total:checkoutResult.total,
    coupons:checkoutResult.coupons || [],
    cartCount: cartCount.success ? cartCount.count : 0,
    razorpayKeyId: (process.env.RAZORPAY_KEY_ID || "").trim()
  });
}catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
}

}

exports.getPaymentSuccess = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { orderId } = req.params;
    
    const Order = require("../../models/orderModel");
    const order = await Order.findOne({ _id: orderId, userId }).populate('courses');
    
    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/");
    }
    
    const cartCount = await cartService.getCartCount(userId);
    
    res.render("pages/user/checkout/payment-success", {
      title: "Payment Success",
      isLoggedIn: true,
      order,
      cartCount: cartCount.success ? cartCount.count : 0
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
  }
}

exports.applyCoupon = async (req, res) => {
  try {
    const { couponId, cartSubtotal } = req.body;
    const Coupon = require("../../models/couponModel");
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found." });
    }

    if (coupon.status !== "active") {
      return res.json({ success: false, message: "This coupon is not active." });
    }

    const now = new Date();
    if (new Date(coupon.expiryDate) < now) {
      return res.json({ success: false, message: "This coupon has expired." });
    }

    if (cartSubtotal < coupon.minOrderValue) {
      return res.json({ success: false, message: `Minimum order value for this coupon is ₹${coupon.minOrderValue}.` });
    }

    let discountAmount = 0;
    if (coupon.discountType === "flat") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discountAmount = (cartSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }

    if (discountAmount > cartSubtotal) {
      discountAmount = cartSubtotal;
    }

    const finalTotal = cartSubtotal - discountAmount;

    return res.json({
      success: true,
      message: "Coupon applied successfully!",
      discountAmount,
      finalTotal,
      couponCode: coupon.code,
      couponId: coupon._id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to apply coupon." });
  }
};


exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { appliedCouponId } = req.body;

    const Order = require("../../models/orderModel");
    const Enrollment = require("../../models/enrollmentModel");
    const Coupon = require("../../models/couponModel");
    const checkoutService = require("../../services/checkoutService");
    
    // 1. Fetch user's cart
    const checkoutResult = await checkoutService.getCheckoutData(userId);
    if (!checkoutResult.success || checkoutResult.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty or invalid." });
    }

    // 2. Prevent repurchasing already enrolled courses
    const courseIds = [];
    for (const course of checkoutResult.cart) {
      courseIds.push(course._id);
      const isEnrolled = await Enrollment.findOne({ userId, courseId: course._id, status: { $ne: 'cancelled' } });
      if (isEnrolled) {
        return res.status(400).json({ success: false, message: `You are already enrolled in "${course.title}". Please remove it from your cart.` });
      }
    }

    // 3. Calculate Totals
    let baseSubtotal = 0;
    let courseDiscount = 0;
    
    checkoutResult.cart.forEach(course => {
      const price = course.basePrice || course.price || 0;
      const dPrice = course.discountPrice || 0;
      baseSubtotal += price;
      if (dPrice > 0 && dPrice < price) {
        courseDiscount += (price - dPrice);
      }
    });
    
    const cartSubtotal = baseSubtotal - courseDiscount;
    let couponDiscount = 0;
    let finalAmount = cartSubtotal;

    if (appliedCouponId) {
      const coupon = await Coupon.findById(appliedCouponId);
      if (coupon && coupon.status === "active" && new Date(coupon.expiryDate) >= new Date() && cartSubtotal >= coupon.minOrderValue) {
        if (coupon.discountType === "flat") {
          couponDiscount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
          couponDiscount = (cartSubtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount > 0 && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        }
        if (couponDiscount > cartSubtotal) couponDiscount = cartSubtotal;
        finalAmount = cartSubtotal - couponDiscount;
      }
    }

    // Ensure final amount is valid for Razorpay (at least 1 INR)
    if (finalAmount < 1) finalAmount = 1;

    // 4. Create Pending Order in Database
    const newOrder = new Order({
      userId,
      courses: courseIds,
      subtotal: baseSubtotal,
      courseDiscount,
      couponDiscount,
      finalAmount,
      couponId: appliedCouponId || null,
      paymentStatus: "pending"
    });
    
    await newOrder.save();

    // 5. Create Razorpay Order
    const result = await razorpayService.createRazorpayOrder(finalAmount, newOrder.orderId);
    
    if (result.success) {
      // Update DB Order with Razorpay Order ID
      newOrder.razorpayOrderId = result.order_id;
      await newOrder.save();
      
      return res.json({ 
        success: true, 
        order: {
          id: result.order_id,
          amount: result.amount,
          currency: result.currency
        },
        dbOrderId: newOrder._id 
      });
    } else {
      newOrder.paymentStatus = "failed";
      newOrder.failureReason = result.message;
      await newOrder.save();
      return res.status(500).json({ success: false, message: result.message });
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

    const verification = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (verification.success) {
      const Order = require("../../models/orderModel");
      const Enrollment = require("../../models/enrollmentModel");
      const Coupon = require("../../models/couponModel");
      const User = require("../../models/userModel");
      
      const order = await Order.findOne({ _id: dbOrderId, userId });
      
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      // Update Order Status
      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      // Handle Coupon Usage
      if (order.couponId) {
        const coupon = await Coupon.findById(order.couponId);
        if (coupon) {
          coupon.usageCount = (coupon.usageCount || 0) + 1;
          await coupon.save();
        }
      }

      // Create Enrollments
      const enrollments = order.courses.map(courseId => ({
        userId,
        courseId,
        orderId: order._id,
        progress: 0,
        status: "active"
      }));
      await Enrollment.insertMany(enrollments);

      // Clear Cart
      await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

      return res.json({ success: true, message: "Payment verified successfully!", orderId: order._id });
    } else {
      // Verification failed
      const Order = require("../../models/orderModel");
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order) {
        order.paymentStatus = "failed";
        order.failureReason = "Signature verification failed.";
        await order.save();
      }
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying payment." });
  }
};
