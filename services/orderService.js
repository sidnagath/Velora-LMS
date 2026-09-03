import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Coupon from '../models/couponModel.js';
import Wallet from '../models/walletModel.js';
import mongoose from 'mongoose';
import checkoutService from './checkoutService.js';
import razorpayService from './razorpayService.js';
import walletService from './walletService.js';


export const getAdminOrdersData = async (queryObj) => {
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

    const rawOrders = await Order.find(query)
      .populate('userId', 'name avatar email')
      .populate('courseId', 'title')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const orders = rawOrders.map(o => ({
      ...o,
      courses: o.courseId ? [o.courseId] : []
    }));

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

export const getOrderById = async (orderId) => {
  try {
    const rawOrder = await Order.findById(orderId)
      .populate('userId', 'name avatar email phone')
      .populate('courseId', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code discountType discountValue')
      .lean();

    if (!rawOrder) {
      return { success: false, message: 'Order not found.' };
    }

    const order = {
      ...rawOrder,
      courses: rawOrder.courseId ? [rawOrder.courseId] : []
    };

    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    return { success: false, message: 'Failed to load order details.' };
  }
};

export const updateOrderStatus = async (orderId, status) => {
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

export const getUserOrders = async (userId) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const orders = await Order.find({ userId })
      .populate('courseId', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch enrollments to determine progress
    const enrollments = await Enrollment.find({ userId }).lean();
    const enrollmentMap = {};
    enrollments.forEach(en => {
      enrollmentMap[en.courseId.toString()] = en;
    });

    // Attach progress to orders
    const enrichedOrders = orders.map(order => {
      if (order.courseId) {
        const enrollment = enrollmentMap[order.courseId._id.toString()];
        order.courseProgress = enrollment ? enrollment.progress : 0;
      }
      return order;
    });

    return { success: true, data: { user, orders: enrichedOrders } };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { success: false, message: 'Failed to fetch user orders.' };
  }
};

export const cancelPayment = async (dbOrderIds, userId) => {
  try {
    if (dbOrderIds && Array.isArray(dbOrderIds)) {
      await Order.updateMany(
        { _id: { $in: dbOrderIds }, userId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'cancelled', failureReason: 'User dismissed payment modal' } }
      );
    } else if (dbOrderIds && typeof dbOrderIds === 'string') {
      await Order.updateMany(
        { _id: dbOrderIds, userId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'cancelled', failureReason: 'User dismissed payment modal' } }
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return { success: false, message: 'Server error cancelling payment.' };
  }
};

export const failPayment = async (dbOrderIds, userId, reason) => {
  try {
    if (dbOrderIds && Array.isArray(dbOrderIds)) {
      await Order.updateMany(
        { _id: { $in: dbOrderIds }, userId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed', failureReason: reason || 'Payment failed' } }
      );
    } else if (dbOrderIds && typeof dbOrderIds === 'string') {
      await Order.updateMany(
        { _id: dbOrderIds, userId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed', failureReason: reason || 'Payment failed' } }
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error failing payment:', error);
    return { success: false, message: 'Server error failing payment.' };
  }
};

export const retryPayment = async (dbOrderIds, userId) => {
  try {
    let orders = [];
    if (dbOrderIds && Array.isArray(dbOrderIds)) {
      orders = await Order.find({ _id: { $in: dbOrderIds }, userId });
    } else if (dbOrderIds && typeof dbOrderIds === 'string') {
      try {
        const parsed = JSON.parse(dbOrderIds);
        if (Array.isArray(parsed)) {
          orders = await Order.find({ _id: { $in: parsed }, userId });
        } else {
          orders = await Order.find({ _id: dbOrderIds, userId });
        }
      } catch (e) {
        orders = await Order.find({ _id: dbOrderIds, userId });
      }
    }

    if (!orders || orders.length === 0) {
      return { success: false, message: 'Invalid order or order is not eligible for retry.' };
    }

    // Check if any is not eligible
    for (let order of orders) {
      if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'cancelled' && order.paymentStatus !== 'pending') {
        return { success: false, message: 'Invalid order or order is not eligible for retry.' };
      }

      const isEnrolled = await Enrollment.findOne({ userId, courseId: order.courseId, status: { $ne: 'cancelled' } });
      if (isEnrolled) {
        return { success: false, message: 'You are already enrolled in one or more courses in this order.' };
      }
    }

    // Sum final amount and ensure 2 decimal rounding
    const totalAmount = Number(orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0).toFixed(2));
    const receiptId = orders[0].orderId;

    // We recreate the razorpay order with the SUMMED final amount and the shared order ID
    const result = await razorpayService.createRazorpayOrder(totalAmount, receiptId);

    if (result.success) {
      // Update ALL DB Orders with new Razorpay Order ID and set to pending
      await Order.updateMany(
        { _id: { $in: orders.map(o => o._id) } },
        { $set: { razorpayOrderId: result.order_id, paymentStatus: 'pending', failureReason: null } }
      );

      return {
        success: true,
        data: {
          order: {
            id: result.order_id,
            amount: result.amount,
            currency: result.currency
          },
          dbOrderIds: orders.map(o => o._id)
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

export const getInvoiceData = async (orderId, userId) => {
  try {
    // orderId here is the VEL- receipt ID, not the mongo _id
    const orders = await Order.find({ orderId: orderId, userId, paymentStatus: 'paid' })
      .populate('userId', 'name email')
      .populate('courseId', 'title basePrice discountPrice')
      .populate('couponId', 'code discountType discountValue')
      .lean();

    if (!orders || orders.length === 0) {
      // Fallback in case it's actually an _id
      const fallbackOrder = await Order.findOne({ _id: orderId, userId, paymentStatus: 'paid' })
        .populate('userId', 'name email')
        .populate('courseId', 'title basePrice discountPrice')
        .populate('couponId', 'code discountType discountValue')
        .lean();

      if (!fallbackOrder) {
        return { success: false, message: 'Invoice not found or order not paid.' };
      }
      orders.push(fallbackOrder);
    }

    // Group into a single transaction object for the invoice
    let totalSubtotal = 0;
    let totalCourseDiscount = 0;
    let totalCouponDiscount = 0;
    let totalFinalAmount = 0;
    let courses = [];

    orders.forEach(o => {
      totalSubtotal += o.subtotal || 0;
      totalCourseDiscount += o.courseDiscount || 0;
      totalCouponDiscount += o.couponDiscount || 0;
      totalFinalAmount += o.finalAmount || 0;
      if (o.courseId) {
        courses.push({
          _id: o.courseId._id,
          title: o.courseId.title,
          basePrice: o.courseId.basePrice,
          discountPrice: o.courseId.discountPrice,
          orderSubtotal: o.subtotal || 0,
          orderCourseDiscount: o.courseDiscount || 0,
          orderCouponDiscount: o.couponDiscount || 0,
          orderFinalAmount: o.finalAmount || 0
        });
      }
    });

    const primaryOrder = orders[0];

    const invoiceOrder = {
      _id: primaryOrder._id,
      orderId: primaryOrder.orderId,
      createdAt: primaryOrder.createdAt,
      userId: primaryOrder.userId,
      paymentMethod: primaryOrder.paymentMethod,
      paymentStatus: primaryOrder.paymentStatus,
      razorpayPaymentId: primaryOrder.razorpayPaymentId,
      couponId: primaryOrder.couponId,
      subtotal: totalSubtotal,
      courseDiscount: totalCourseDiscount,
      couponDiscount: totalCouponDiscount,
      finalAmount: totalFinalAmount,
      courses: courses
    };

    return { success: true, data: invoiceOrder };
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return { success: false, message: 'Failed to load invoice data.' };
  }
};

export const getCheckoutInvoiceData = async (orderId, userId) => {
  try {
    const primaryOrder = await Order.findOne({ _id: orderId, userId, paymentStatus: 'paid' });
    if (!primaryOrder) {
      return { success: false, message: "Order not found or not paid." };
    }

    let orders;
    if (primaryOrder.razorpayPaymentId) {
      orders = await Order.find({ razorpayPaymentId: primaryOrder.razorpayPaymentId, userId, paymentStatus: 'paid' })
        .populate('userId', 'name email')
        .populate('courseId', 'title basePrice discountPrice')
        .populate('couponId', 'code discountType discountValue')
        .lean();
    } else if (primaryOrder.paymentMethod === 'wallet') {
      const startTime = new Date(primaryOrder.createdAt.getTime() - 2000);
      const endTime = new Date(primaryOrder.createdAt.getTime() + 2000);
      orders = await Order.find({
        userId,
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        createdAt: { $gte: startTime, $lte: endTime }
      })
        .populate('userId', 'name email')
        .populate('courseId', 'title basePrice discountPrice')
        .populate('couponId', 'code discountType discountValue')
        .lean();
    } else {
      orders = await Order.find({ _id: primaryOrder._id })
        .populate('userId', 'name email')
        .populate('courseId', 'title basePrice discountPrice')
        .populate('couponId', 'code discountType discountValue')
        .lean();
    }

    // Group into a single transaction object for the invoice
    let totalSubtotal = 0;
    let totalCourseDiscount = 0;
    let totalCouponDiscount = 0;
    let totalFinalAmount = 0;
    let courses = [];

    orders.forEach(o => {
      totalSubtotal += o.subtotal || 0;
      totalCourseDiscount += o.courseDiscount || 0;
      totalCouponDiscount += o.couponDiscount || 0;
      totalFinalAmount += o.finalAmount || 0;
      if (o.courseId) {
        courses.push({
          _id: o.courseId._id,
          title: o.courseId.title,
          basePrice: o.courseId.basePrice,
          discountPrice: o.courseId.discountPrice,
          orderSubtotal: o.subtotal || 0,
          orderCourseDiscount: o.courseDiscount || 0,
          orderCouponDiscount: o.couponDiscount || 0,
          orderFinalAmount: o.finalAmount || 0
        });
      }
    });

    const invoiceOrder = {
      _id: primaryOrder._id,
      orderId: primaryOrder.razorpayOrderId || primaryOrder.orderId,
      createdAt: primaryOrder.createdAt,
      userId: orders[0] ? orders[0].userId : null,
      paymentMethod: primaryOrder.paymentMethod,
      paymentStatus: primaryOrder.paymentStatus,
      razorpayPaymentId: primaryOrder.razorpayPaymentId,
      couponId: primaryOrder.couponId,
      subtotal: totalSubtotal,
      courseDiscount: totalCourseDiscount,
      couponDiscount: totalCouponDiscount,
      finalAmount: totalFinalAmount,
      courses: courses
    };

    return { success: true, data: invoiceOrder };
  } catch (error) {
    console.error('Error fetching checkout invoice data:', error);
    return { success: false, message: 'Failed to load checkout invoice data.' };
  }
};

export const createPendingOrderAndRazorpayOrder = async (userId, appliedCouponId, expectedCourseIds) => {
  try {
    // 1. Fetch user's cart
    const checkoutResult = await checkoutService.getCheckoutData(userId);
    if (!checkoutResult.success || checkoutResult.cart.length === 0) {
      return { success: false, message: "Cart is empty or invalid.", redirectUrl: "/user/cart" };
    }

    if (expectedCourseIds && Array.isArray(expectedCourseIds)) {
      const actualCourseIds = checkoutResult.cart.map(c => c._id.toString());
      const missingCourses = expectedCourseIds.filter(id => !actualCourseIds.includes(id));
      if (missingCourses.length > 0) {
        return {
          success: false,
          message: "One or more courses are no longer available. Your checkout has been updated.",
          redirectUrl: "/user/checkout"
        };
      }
    }

    // 2. Prevent repurchasing already enrolled courses or pending/paid orders
    for (const course of checkoutResult.cart) {
      const existingOrder = await Order.findOne({
        userId,
        courseId: course._id,
        paymentStatus: { $in: ["pending", "paid"] }
      });

      if (existingOrder) {
        if (existingOrder.paymentStatus === 'paid') {
          return { success: false, message: `You have already purchased "${course.title}".` };
        } else {
          return { success: false, message: `You have a pending order for "${course.title}". Please complete or cancel it from your Orders page.` };
        }
      }

      const isEnrolled = await Enrollment.findOne({ userId, courseId: course._id, status: { $ne: 'cancelled' } });
      if (isEnrolled) {
        return { success: false, message: `You are already enrolled in "${course.title}". Please remove it from your cart.` };
      }
    }

    // 3. Fetch coupon & calculate exact canonical totals
    let coupon = null;
    if (appliedCouponId) {
      coupon = await Coupon.findById(appliedCouponId);
    }

    const totals = checkoutService.calculateCheckoutTotals(checkoutResult.cart, coupon);

    if (appliedCouponId && totals.couponError) {
      return {
        success: false,
        message: totals.couponError,
        redirectUrl: "/user/checkout"
      };
    }

    // 4. Handle 100% discount (Free order)
    if (totals.finalTotal <= 0) {
      const ordersToSave = totals.items.map(item => new Order({
        userId,
        courseId: item.course._id,
        subtotal: item.subtotal,
        courseDiscount: item.courseDiscount,
        couponDiscount: item.couponDiscount,
        finalAmount: item.finalAmount,
        couponId: appliedCouponId || null,
        paymentStatus: "paid",
        razorpayPaymentId: "free_order_" + Date.now()
      }));

      const savedOrders = await Order.insertMany(ordersToSave);

      if (appliedCouponId) {
        const couponDoc = await Coupon.findByIdAndUpdate(
          appliedCouponId,
          { $inc: { usageCount: 1 } },
          { new: true }
        );
        if (couponDoc && couponDoc.usageCount >= couponDoc.usageLimit) {
          couponDoc.status = "inactive";
          await couponDoc.save();
        }
      }

      const enrollmentPromises = savedOrders.map(order =>
        Enrollment.findOneAndUpdate(
          { userId, courseId: order.courseId },
          {
            $set: {
              orderId: order._id,
              progress: 0,
              status: "active",
              completedLessons: []
            }
          },
          { upsert: true, new: true }
        )
      );
      await Promise.all(enrollmentPromises);

      await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

      return {
        success: true,
        data: {
          bypassRazorpay: true,
          dbOrderIds: savedOrders.map(o => o._id)
        }
      };
    }

    // 5. Create Pending Orders in Database (Paid via Razorpay)
    const ordersToSave = totals.items.map(item => new Order({
      userId,
      courseId: item.course._id,
      subtotal: item.subtotal,
      courseDiscount: item.courseDiscount,
      couponDiscount: item.couponDiscount,
      finalAmount: item.finalAmount,
      couponId: appliedCouponId || null,
      paymentStatus: "pending"
    }));

    const savedOrders = await Order.insertMany(ordersToSave);

    // 6. Create Razorpay Order with exact finalTotal
    const receiptId = savedOrders[0].orderId;
    const result = await razorpayService.createRazorpayOrder(totals.finalTotal, receiptId);

    if (result.success) {
      const orderIds = savedOrders.map(o => o._id);
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { razorpayOrderId: result.order_id } }
      );

      return {
        success: true,
        data: {
          order: {
            id: result.order_id,
            amount: result.amount,
            currency: result.currency,
            formattedAmount: totals.finalTotal.toFixed(2),
            summary: {
              subtotal: totals.subtotal,
              courseDiscount: totals.courseDiscount,
              cartSubtotal: totals.cartSubtotal,
              couponDiscount: totals.couponDiscount,
              taxableAmount: totals.taxableAmount,
              gstAmount: totals.gstAmount,
              finalTotal: totals.finalTotal
            }
          },
          dbOrderIds: orderIds
        }
      };
    } else {
      const orderIds = savedOrders.map(o => o._id);
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { paymentStatus: "failed", failureReason: result.message } }
      );
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("Create Order Error:", error);
    return { success: false, message: "Server error creating order." };
  }
};

export const processWalletCheckout = async (userId, appliedCouponId, expectedCourseIds) => {
  try {
    const checkoutResult = await checkoutService.getCheckoutData(userId);
    if (!checkoutResult.success || checkoutResult.cart.length === 0) {
      return { success: false, message: "Cart is empty or invalid.", redirectUrl: "/user/cart" };
    }

    if (expectedCourseIds && Array.isArray(expectedCourseIds)) {
      const actualCourseIds = checkoutResult.cart.map(c => c._id.toString());
      const missingCourses = expectedCourseIds.filter(id => !actualCourseIds.includes(id));
      if (missingCourses.length > 0) {
        return {
          success: false,
          message: "One or more courses are no longer available. Your checkout has been updated.",
          redirectUrl: "/user/checkout"
        };
      }
    }

    for (const course of checkoutResult.cart) {
      const existingOrder = await Order.findOne({
        userId,
        courseId: course._id,
        paymentStatus: { $in: ["pending", "paid"] }
      });

      if (existingOrder) {
        if (existingOrder.paymentStatus === 'paid') {
          return { success: false, message: `You have already purchased "${course.title}".` };
        } else {
          return { success: false, message: `You have a pending order for "${course.title}". Please complete or cancel it from your Orders page.` };
        }
      }

      const isEnrolled = await Enrollment.findOne({ userId, courseId: course._id, status: { $ne: 'cancelled' } });
      if (isEnrolled) {
        return { success: false, message: `You are already enrolled in "${course.title}". Please remove it from your cart.` };
      }
    }

    let coupon = null;
    if (appliedCouponId) {
      coupon = await Coupon.findById(appliedCouponId);
    }

    const totals = checkoutService.calculateCheckoutTotals(checkoutResult.cart, coupon);

    if (appliedCouponId && totals.couponError) {
      return {
        success: false,
        message: totals.couponError,
        redirectUrl: "/user/checkout"
      };
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
    }

    if (wallet.balance < totals.finalTotal) {
      return { success: false, message: "Insufficient wallet balance." };
    }

    // Deduct Balance
    wallet.balance = Number((wallet.balance - totals.finalTotal).toFixed(2));

    // Create Orders
    const createdOrders = [];
    const orderGroupBaseIds = [];

    for (const item of totals.items) {
      const order = new Order({
        userId,
        courseId: item.course._id,
        subtotal: item.subtotal,
        courseDiscount: item.courseDiscount,
        couponDiscount: item.couponDiscount,
        finalAmount: item.finalAmount,
        couponId: appliedCouponId || null,
        paymentMethod: 'wallet',
        paymentStatus: 'paid'
      });

      await order.save();
      createdOrders.push(order);
      orderGroupBaseIds.push(order._id);
    }

    if (totals.finalTotal > 0) {
      wallet.transactions.push({
        type: "debit",
        amount: totals.finalTotal,
        description: "Course Purchase",
        order: createdOrders[0]._id
      });
      await wallet.save();
    }

    if (appliedCouponId) {
      const couponDoc = await Coupon.findByIdAndUpdate(
        appliedCouponId,
        { $inc: { usageCount: 1 } },
        { new: true }
      );

      if (couponDoc && couponDoc.usageCount >= couponDoc.usageLimit) {
        couponDoc.status = "inactive";
        await couponDoc.save();
      }
    }

    const enrollmentPromises = createdOrders.map(order =>
      Enrollment.findOneAndUpdate(
        { userId, courseId: order.courseId },
        {
          $set: {
            orderId: order._id,
            progress: 0,
            status: "active",
            completedLessons: []
          }
        },
        { upsert: true, new: true }
      )
    );
    await Promise.all(enrollmentPromises);

    await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

    return {
      success: true,
      message: "Payment successful.",
      data: { orderIds: orderGroupBaseIds }
    };

  } catch (error) {
    console.error("Wallet Checkout Error:", error);
    return { success: false, message: "Failed to process wallet payment: " + error.message };
  }
};

export const verifyAndFulfillOrder = async (dbOrderIds, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const verification = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (verification.success) {
      // Find all associated orders
      const orders = await Order.find({ _id: { $in: dbOrderIds }, userId });

      if (!orders || orders.length === 0) {
        return { success: false, message: "Orders not found." };
      }

      // Prevent duplicate fulfillment if already paid
      if (orders[0].paymentStatus === "paid") {
        return { success: true, message: "Payment already verified.", data: { orderIds: dbOrderIds } };
      }

      // 🚨 Check course statuses before fulfillment
      for (const order of orders) {
        const course = await Course.findById(order.courseId);
        if (!course || course.status !== 'published' || course.isDeleted) {
          // Block fulfillment!
          await Order.updateMany(
            { _id: { $in: dbOrderIds }, userId },
            { $set: { paymentStatus: "failed", failureReason: "Course became unavailable during payment" } }
          );
          return { success: false, message: `Payment verified but fulfillment blocked: "${course ? course.title : 'A course'}" is no longer available. Please contact support for a refund.` };
        }
      }

      // Update Order Status for all orders
      await Order.updateMany(
        { _id: { $in: dbOrderIds }, userId },
        { $set: { paymentStatus: "paid", razorpayPaymentId: razorpay_payment_id } }
      );

      // Handle Coupon Usage (Only increment once per checkout, coupon is identical across these orders)
      const couponId = orders[0].couponId;
      if (couponId) {
        const coupon = await Coupon.findByIdAndUpdate(
          couponId,
          { $inc: { usageCount: 1 } },
          { new: true }
        );

        if (coupon && coupon.usageCount >= coupon.usageLimit) {
          coupon.status = "inactive";
          await coupon.save();
        }
      }

      // Create Enrollments for all courses
      const enrollmentPromises = orders.map(order =>
        Enrollment.findOneAndUpdate(
          { userId, courseId: order.courseId },
          {
            $set: {
              orderId: order._id,
              progress: 0,
              status: "active",
              completedLessons: []
            }
          },
          { upsert: true, new: true }
        )
      );
      await Promise.all(enrollmentPromises);

      // Clear User Cart
      await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

      return {
        success: true,
        message: "Payment verified successfully.",
        data: { orderIds: dbOrderIds }
      };
    } else {
      await Order.updateMany(
        { _id: { $in: dbOrderIds }, userId },
        { $set: { paymentStatus: "failed", failureReason: "Signature verification failed" } }
      );
      return { success: false, message: "Invalid payment signature." };
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return { success: false, message: "Server error verifying payment." };
  }
};

export const getPaymentSuccessData = async (orderId, userId) => {
  try {
    const primaryOrder = await Order.findOne({ _id: orderId, userId });
    if (!primaryOrder) {
      return { success: false, message: "Order not found" };
    }

    let orders;
    if (primaryOrder.razorpayPaymentId) {
      orders = await Order.find({ razorpayPaymentId: primaryOrder.razorpayPaymentId, userId }).populate('courseId');
    } else if (primaryOrder.paymentMethod === 'wallet') {
      const startTime = new Date(primaryOrder.createdAt.getTime() - 2000);
      const endTime = new Date(primaryOrder.createdAt.getTime() + 2000);
      orders = await Order.find({
        userId,
        paymentMethod: 'wallet',
        createdAt: { $gte: startTime, $lte: endTime }
      }).populate('courseId');
    } else {
      await primaryOrder.populate('courseId');
      orders = [primaryOrder];
    }

    let totalSubtotal = 0;
    let totalCourseDiscount = 0;
    let totalCouponDiscount = 0;
    let totalFinalAmount = 0;
    let courses = [];

    orders.forEach(o => {
      totalSubtotal += o.subtotal;
      totalCourseDiscount += o.courseDiscount;
      totalCouponDiscount += o.couponDiscount;
      totalFinalAmount += o.finalAmount;
      if (o.courseId) {
        courses.push({
          _id: o.courseId._id,
          title: o.courseId.title,
          basePrice: o.courseId.basePrice,
          discountPrice: o.courseId.discountPrice,
          orderSubtotal: o.subtotal || 0,
          orderCourseDiscount: o.courseDiscount || 0,
          orderCouponDiscount: o.couponDiscount || 0,
          orderFinalAmount: o.finalAmount || 0
        });
      }
    });

    const aggregatedOrder = {
      orderId: primaryOrder.razorpayOrderId || primaryOrder.orderId,
      createdAt: primaryOrder.createdAt,
      razorpayPaymentId: primaryOrder.razorpayPaymentId,
      courses: courses,
      subtotal: totalSubtotal,
      courseDiscount: totalCourseDiscount,
      couponDiscount: totalCouponDiscount,
      finalAmount: totalFinalAmount,
      _id: primaryOrder._id
    };

    return { success: true, data: { order: aggregatedOrder } };
  } catch (error) {
    console.error("Error fetching payment success data:", error);
    return { success: false, message: "An error occurred." };
  }
};

export const getPaymentFailureData = async (orderId, userId) => {
  try {
    const primaryOrder = await Order.findOne({ _id: orderId, userId });
    if (!primaryOrder) {
      return { success: false, message: "Order not found" };
    }

    let query = { _id: orderId, userId };
    if (primaryOrder.razorpayOrderId) {
      query = { razorpayOrderId: primaryOrder.razorpayOrderId, userId };
    }

    const orders = await Order.find(query).populate('courseId');

    let totalFinalAmount = 0;
    let courses = [];

    orders.forEach(o => {
      totalFinalAmount += o.finalAmount;
      if (o.courseId) {
        courses.push({
          _id: o.courseId._id,
          title: o.courseId.title,
          basePrice: o.courseId.basePrice,
          discountPrice: o.courseId.discountPrice,
          orderSubtotal: o.subtotal || 0,
          orderCourseDiscount: o.courseDiscount || 0,
          orderCouponDiscount: o.couponDiscount || 0,
          orderFinalAmount: o.finalAmount || 0
        });
      }
    });

    const aggregatedOrder = {
      orderId: primaryOrder.razorpayOrderId || primaryOrder.orderId,
      createdAt: primaryOrder.createdAt,
      paymentStatus: primaryOrder.paymentStatus,
      failureReason: primaryOrder.failureReason || "Payment was cancelled or failed.",
      courses: courses,
      finalAmount: totalFinalAmount,
      _id: primaryOrder._id
    };

    return { success: true, data: { order: aggregatedOrder } };
  } catch (error) {
    console.error("Error fetching payment failure data:", error);
    return { success: false, message: "An error occurred." };
  }
};

export const applyCoupon = async (couponId, userId, cartSubtotal) => {
  try {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return { success: false, message: "Coupon not found." };
    }

    let cart = [];
    if (userId) {
      const checkoutResult = await checkoutService.getCheckoutData(userId);
      if (checkoutResult.success && checkoutResult.cart) {
        cart = checkoutResult.cart;
      }
    }

    let totals;
    if (cart.length > 0) {
      totals = checkoutService.calculateCheckoutTotals(cart, coupon);
    } else {
      // Fallback calculation if cart is empty or userId not provided
      const dummyCartItem = [{ basePrice: Number(cartSubtotal) || 0, discountPrice: 0 }];
      totals = checkoutService.calculateCheckoutTotals(dummyCartItem, coupon);
    }

    if (totals.couponError) {
      return { success: false, message: totals.couponError };
    }

    return {
      success: true,
      message: "Coupon applied successfully!",
      data: {
        discountAmount: totals.couponDiscount,
        taxableAmount: totals.taxableAmount,
        gstAmount: totals.gstAmount,
        finalTotal: totals.finalTotal,
        couponCode: coupon.code,
        couponId: coupon._id
      }
    };
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return { success: false, message: "Failed to apply coupon." };
  }
};

export const requestRefund = async (orderId, userId, reason) => {

  const order = await Order.findOne({ _id: orderId, userId: userId });

  if (!order) {
    return { success: false, message: "Order not found" }
  }

  if (order.paymentStatus === "refunded" || order.refundStatus === "approved") {
    return { success: false, message: "This course has already been refunded." }
  }

  // Check if the user has already received a refund for this course in a past order
  if (order.courseId) {
    const previousRefund = await Order.findOne({
      userId: userId,
      courseId: order.courseId,
      _id: { $ne: order._id },
      $or: [{ paymentStatus: "refunded" }, { refundStatus: "approved" }]
    });

    if (previousRefund) {
      return { success: false, message: "You have already been refunded for this course previously. A course can only be refunded once." };
    }
  }

  if (order.paymentStatus !== "paid") {
    return { success: false, message: "Only paid orders can be refunded" }
  }

  if (order.refundStatus) {
    return { success: false, message: "Refund already been requested for this order" }
  }

  const purchaseDate = new Date(order.createdAt);
  const today = new Date();

  const daysDifference = (today - purchaseDate) / (1000 * 60 * 60 * 24);

  if (daysDifference > 5) {
    return { success: false, message: "Refund request period has expired" }
  }

  const enrollments = await Enrollment.find({ orderId: order._id, userId });
  for (const enrollment of enrollments) {
    if (enrollment.progress > 20) {
      return { success: false, message: "Refunds are not allowed once course progress exceeds 20%." };
    }
  }

  reason = reason?.trim();

  if (!reason) {
    return { success: false, message: "Refund reason is required" }
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
    success: true,
    message: "Refund request submitted successfully.",
    order
  };

};

export const approveRefund = async (id) => {
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

export const rejectRefund = async (id) => {
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

export const cancelPendingOrder = async (orderId, userId, isAdmin, reason) => {
  try {
    const query = { _id: orderId };
    if (!isAdmin) {
      query.userId = userId;
    }

    const order = await Order.findOne(query);

    if (!order) {
      return { success: false, message: "Order not found or unauthorized." };
    }

    if (order.paymentStatus !== "pending") {
      return { success: false, message: `Cannot cancel order with status: ${order.paymentStatus}.` };
    }

    order.paymentStatus = "cancelled";
    order.cancelledAt = new Date();
    order.cancelReason = reason || (isAdmin ? "Cancelled by admin" : "Cancelled by user");

    await order.save();

    // Attempt to cancel any associated enrollment, if it exists
    await Enrollment.updateMany(
      { orderId: order._id },
      { $set: { status: "cancelled" } }
    );

    return { success: true, message: "Order successfully cancelled.", order };
  } catch (error) {
    console.error("Cancel Order Error:", error);
    return { success: false, message: "Failed to cancel order." };
  }
};

export default {
  getAdminOrdersData,
  getOrderById,
  updateOrderStatus,
  getUserOrders,
  cancelPayment,
  failPayment,
  retryPayment,
  getInvoiceData,
  getCheckoutInvoiceData,
  createPendingOrderAndRazorpayOrder,
  processWalletCheckout,
  verifyAndFulfillOrder,
  getPaymentSuccessData,
  getPaymentFailureData,
  applyCoupon,
  requestRefund,
  approveRefund,
  rejectRefund,
  cancelPendingOrder
};
