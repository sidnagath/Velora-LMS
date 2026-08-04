const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Enrollment = require('../models/enrollmentModel');
const Coupon = require('../models/couponModel');
const checkoutService = require('./checkoutService');
const razorpayService = require('./razorpayService');
const walletService = require('./walletService');

exports.getAdminOrdersData = async (queryObj) => {
  try {
    const page = parseInt(queryObj.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = {};
    if (queryObj.status && queryObj.status !== 'all') {
      query.paymentStatus = queryObj.status;
    }

    if (queryObj.search) {
      const searchRegex = new RegExp(queryObj.search, 'i');
      const users = await User.find({ name: searchRegex }).select('_id').lean();
      const userIds = users.map(u => u._id);
      
      query.$or = [
        { orderId: searchRegex },
        { userId: { $in: userIds } }
      ];
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    let sortQuery = { createdAt: -1 }; // default newest
    if (queryObj.sortBy === 'oldest') {
      sortQuery = { createdAt: 1 };
    } else if (queryObj.sortBy === 'amount_desc') {
      sortQuery = { finalAmount: -1 };
    } else if (queryObj.sortBy === 'amount_asc') {
      sortQuery = { finalAmount: 1 };
    }

    const orders = await Order.find(query)
      .populate('userId', 'name avatar email')
      .populate('courses', 'title')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate Stats
    const allOrders = await Order.find({ paymentStatus: 'paid' }).lean();
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOrdersCount = allOrders.filter(order => order.createdAt >= startOfMonth).length;
    
    const avgOrderValue = allOrders.length > 0 ? (totalRevenue / allOrders.length) : 0;

    return {
      success: true,
      data: {
        orders,
        currentPage: page,
        totalPages,
        totalOrders,
        stats: {
          totalRevenue: totalRevenue.toFixed(2),
          monthlyOrders: monthlyOrdersCount,
          avgOrderValue: avgOrderValue.toFixed(2)
        }
      }
    };
  } catch (error) {
    console.error('Error fetching admin orders data:', error);
    return { success: false, message: 'Failed to fetch admin orders.' };
  }
};

exports.getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
      .populate('userId', 'name avatar email phone')
      .populate('courses', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code discountType discountValue')
      .lean();
    
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    return { success: false, message: 'Failed to load order details.' };
  }
};

exports.updateOrderStatus = async (orderId, status) => {
  try {
    const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return { success: false, message: 'Invalid status' };
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }
    
    // Prevent some invalid transitions
    if (order.paymentStatus === 'cancelled' && status === 'paid') {
      return { success: false, message: 'Cannot mark a cancelled order as paid' };
    }
    
    if (status === 'refunded' && order.paymentStatus !== 'paid') {
      return { success: false, message: 'Can only refund a paid order' };
    }
    
    order.paymentStatus = status;
    await order.save();
    
    return { success: true, message: 'Order status updated successfully' };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, message: 'Server error updating status' };
  }
};

exports.getUserOrders = async (userId) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const orders = await Order.find({ userId })
      .populate('courses', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code')
      .sort({ createdAt: -1 })
      .lean();
      
    return { success: true, data: { user, orders } };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { success: false, message: 'Failed to fetch user orders.' };
  }
};

exports.cancelPayment = async (dbOrderId, userId) => {
  try {
    if (dbOrderId) {
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'cancelled';
        order.failureReason = 'User dismissed payment modal';
        await order.save();
        return { success: true };
      }
    }
    return { success: false, message: 'Order not found or not pending.' };
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return { success: false, message: 'Server error cancelling payment.' };
  }
};

exports.failPayment = async (dbOrderId, userId, reason) => {
  try {
    if (dbOrderId) {
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        order.failureReason = reason || 'Payment failed on gateway';
        await order.save();
        return { success: true };
      }
    }
    return { success: false, message: 'Order not found or not pending.' };
  } catch (error) {
    console.error('Error failing payment:', error);
    return { success: false, message: 'Server error failing payment.' };
  }
};

exports.retryPayment = async (dbOrderId, userId) => {
  try {
    const order = await Order.findOne({ _id: dbOrderId, userId });
    
    if (!order || (order.paymentStatus !== 'failed' && order.paymentStatus !== 'cancelled')) {
      return { success: false, message: 'Invalid order or order is not eligible for retry.' };
    }
    
    // We recreate the razorpay order with the existing final amount and order ID
    const result = await razorpayService.createRazorpayOrder(order.finalAmount, order.orderId);
    
    if (result.success) {
      // Update DB Order with new Razorpay Order ID and set to pending
      order.razorpayOrderId = result.order_id;
      order.paymentStatus = 'pending';
      order.failureReason = null;
      await order.save();
      
      return { 
        success: true, 
        data: {
          order: {
            id: result.order_id,
            amount: result.amount,
            currency: result.currency
          },
          dbOrderId: order._id
        } 
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error retrying payment:', error);
    return { success: false, message: 'Server error retrying payment.' };
  }
};

exports.getInvoiceData = async (orderId, userId) => {
  try {
    const order = await Order.findOne({ _id: orderId, userId, paymentStatus: 'paid' })
      .populate('userId', 'name email')
      .populate('courses', 'title basePrice discountPrice')
      .populate('couponId', 'code discountType discountValue')
      .lean();
      
    if (!order) {
      return { success: false, message: 'Invoice not found or order not paid.' };
    }
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return { success: false, message: 'Failed to load invoice data.' };
  }
};

exports.createPendingOrderAndRazorpayOrder = async (userId, appliedCouponId) => {
  try {
    // 1. Fetch user's cart
    const checkoutResult = await checkoutService.getCheckoutData(userId);
    if (!checkoutResult.success || checkoutResult.cart.length === 0) {
      return { success: false, message: "Cart is empty or invalid." };
    }

    // 2. Prevent repurchasing already enrolled courses
    const courseIds = [];
    for (const course of checkoutResult.cart) {
      courseIds.push(course._id);
      const isEnrolled = await Enrollment.findOne({ userId, courseId: course._id, status: { $ne: 'cancelled' } });
      if (isEnrolled) {
        return { success: false, message: `You are already enrolled in "${course.title}". Please remove it from your cart.` };
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

    // 4. Handle 100% discount (Free order)
    if (finalAmount <= 0) {
      finalAmount = 0;
      
      const newOrder = new Order({
        userId,
        courses: courseIds,
        subtotal: baseSubtotal,
        courseDiscount,
        couponDiscount,
        finalAmount,
        couponId: appliedCouponId || null,
        paymentStatus: "paid",
        razorpayPaymentId: "free_order_" + Date.now()
      });
      await newOrder.save();

      // Handle Coupon Usage
      if (newOrder.couponId) {
        const coupon = await Coupon.findByIdAndUpdate(
          newOrder.couponId,
          { $inc: { usageCount: 1 } },
          { new: true }
        );
        if (coupon && coupon.usageCount >= coupon.usageLimit) {
          coupon.status = "inactive";
          await coupon.save();
        }
      }

      // Create Enrollments
      const enrollments = newOrder.courses.map(courseId => ({
        userId,
        courseId,
        orderId: newOrder._id,
        progress: 0,
        status: "active"
      }));
      await Enrollment.insertMany(enrollments);

      // Clear Cart
      await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

      return { 
        success: true, 
        data: {
          bypassRazorpay: true,
          dbOrderId: newOrder._id 
        }
      };
    }

    // 5. Create Pending Order in Database (Paid via Razorpay)
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

    // 6. Create Razorpay Order
    const result = await razorpayService.createRazorpayOrder(finalAmount, newOrder.orderId);
    
    if (result.success) {
      // Update DB Order with Razorpay Order ID
      newOrder.razorpayOrderId = result.order_id;
      await newOrder.save();
      
      return { 
        success: true, 
        data: {
          order: {
            id: result.order_id,
            amount: result.amount,
            currency: result.currency
          },
          dbOrderId: newOrder._id 
        }
      };
    } else {
      newOrder.paymentStatus = "failed";
      newOrder.failureReason = result.message;
      await newOrder.save();
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("Create Order Error:", error);
    return { success: false, message: "Server error creating order." };
  }
};

exports.verifyAndFulfillOrder = async (dbOrderId, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const verification = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (verification.success) {
      const order = await Order.findOne({ _id: dbOrderId, userId });
      
      if (!order) {
        return { success: false, message: "Order not found." };
      }
      
      // Prevent duplicate fulfillment if already paid
      if (order.paymentStatus === "paid") {
        return { success: true, message: "Payment already verified.", data: { orderId: order._id } };
      }

      // Update Order Status
      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      // Handle Coupon Usage
      if (order.couponId) {
        const coupon = await Coupon.findByIdAndUpdate(
          order.couponId,
          { $inc: { usageCount: 1 } },
          { new: true }
        );
        
        if (coupon && coupon.usageCount >= coupon.usageLimit) {
          coupon.status = "inactive";
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

      return { success: true, message: "Payment verified successfully!", data: { orderId: order._id } };
    } else {
      // Verification failed
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order) {
        order.paymentStatus = "failed";
        order.failureReason = "Signature verification failed.";
        await order.save();
      }
      return { success: false, message: "Payment verification failed." };
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return { success: false, message: "Server error verifying payment." };
  }
};

exports.getPaymentSuccessData = async (orderId, userId) => {
  try {
    const order = await Order.findOne({ _id: orderId, userId }).populate('courses');
    if (!order) {
      return { success: false, message: "Order not found" };
    }
    return { success: true, data: { order } };
  } catch (error) {
    console.error("Error fetching payment success data:", error);
    return { success: false, message: "An error occurred." };
  }
};

exports.applyCoupon = async (couponId, cartSubtotal) => {
  try {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return { success: false, message: "Coupon not found." };
    }

    if (coupon.status !== "active") {
      return { success: false, message: "This coupon is not active." };
    }

    if (coupon.usageCount >= coupon.usageLimit) {
      return { success: false, message: "Coupon usage limit has been reached." };
    }

    const now = new Date();
    if (new Date(coupon.expiryDate) < now) {
      return { success: false, message: "This coupon has expired." };
    }

    if (cartSubtotal < coupon.minOrderValue) {
      return { success: false, message: `Minimum order value for this coupon is ₹${coupon.minOrderValue}.` };
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

    return {
      success: true,
      message: "Coupon applied successfully!",
      data: {
        discountAmount,
        finalTotal,
        couponCode: coupon.code,
        couponId: coupon._id
      }
    };
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return { success: false, message: "Failed to apply coupon." };
  }
};


exports.requestRefund=async(orderId,userId,reason)=>{

   const order= await Order.findOne({_id:orderId,userId:userId});

   if(!order){
    return {success:false, message:"Order not found"}
   }

  if(order.paymentStatus!=="paid"){
    return {success:false, message:"Only paid orders can be refunded"}
  }


  if(order.refundStatus){
    return {success:false, message:"Refund already been requested for this order"}
  }

const purchaseDate = new Date(order.createdAt);
const today = new Date();

const daysDifference=(today-purchaseDate)/(1000*60*60*24);

if(daysDifference>5){
  return {success:false, message:"Refund request period has expired"}
}
  
reason=reason?.trim();

if(!reason){
  return {success:false, message:"Refund reason is required"}
}



if (reason.length < 10) {
      return {
        success: false,
        message: "Refund reason must be at least 10 characters."
      };
    }

    if (reason.length > 250) {
      return {
        success: false,
        message: "Refund reason cannot exceed 250 characters."
      };
    }

    order.refundStatus = "pending";
    order.refundReason = reason;
    order.refundRequestedAt = new Date();

 await order.save();

 return {
         success:true,
         message:"Refund request submitted successfully.",
         order
        };

};


exports.approveRefund = async (id) => {
    try {
        const order = await Order.findById(id);

        if (!order) {
            return { success: false, message: "Order not found" };
        }

        if (order.paymentStatus !== "paid") {
            return { success: false, message: "Only paid orders can be refunded" };
        }

        if (order.refundStatus !== "pending") {
            return { success: false, message: "Refund request is not pending" };
        }

        const description = `Refund for Order #${order.orderId || order._id.toString().substring(18, 24).toUpperCase()}`;
        
        const walletResult = await walletService.creditWallet(order.userId, order.finalAmount, description, order._id);

        if (!walletResult.success) {
            return { success: false, message: "Failed to process refund to wallet" };
        }

        order.refundStatus = "approved";
        order.paymentStatus = "refunded";
        order.refundProcessedAt = new Date();

        await order.save();

        // Cancel the associated enrollments so the user loses access and can repurchase
        await Enrollment.updateMany(
            { orderId: order._id },
            { $set: { status: "cancelled" } }
        );

        return {
            success: true,
            order,
            message: "Refund Approved Successfully"
        };
    } catch (error) {
        console.error("Error approving refund:", error);
        return { success: false, message: "Server error while approving refund" };
    }
};

exports.rejectRefund = async (id) => {
    try {
        const order = await Order.findById(id);

        if (!order) {
            return { success: false, message: "Order not found" };
        }

        if (order.refundStatus !== "pending") {
            return { success: false, message: "Refund request is not pending" };
        }

        order.refundStatus = "rejected";
        order.refundProcessedAt = new Date();

        await order.save();

        return {
            success: true,
            order,
            message: "Refund request has been rejected"
        };
    } catch (error) {
        console.error("Error rejecting refund:", error);
        return { success: false, message: "Server error while rejecting refund" };
    }
};