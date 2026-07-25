const Order = require('../../models/orderModel');
const cartService = require('../../services/cartService');

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const User = require('../../models/userModel');
    const user = await User.findById(userId).lean();
    
    // Fetch orders for the logged-in user, populate courses
    const orders = await Order.find({ userId })
      .populate('courses', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code')
      .sort({ createdAt: -1 })
      .lean();
      
    const cartCount = await cartService.getCartCount(userId);

    res.render('pages/user/profile/orders', {
      title: 'My Orders',
      isLoggedIn: true,
      user,
      orders,
      cartCount: cartCount.success ? cartCount.count : 0,
      razorpayKeyId: (process.env.RAZORPAY_KEY_ID || "").trim()
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    req.flash('error', 'Failed to load your orders.');
    res.redirect('/');
  }
};

exports.cancelPayment = async (req, res) => {
  try {
    const { dbOrderId } = req.body;
    const userId = req.session.user.id;
    
    if (dbOrderId) {
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'cancelled';
        order.failureReason = 'User dismissed payment modal';
        await order.save();
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return res.status(500).json({ success: false });
  }
};

exports.failPayment = async (req, res) => {
  try {
    const { dbOrderId, reason } = req.body;
    const userId = req.session.user.id;
    
    if (dbOrderId) {
      const order = await Order.findOne({ _id: dbOrderId, userId });
      if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        order.failureReason = reason || 'Payment failed on gateway';
        await order.save();
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error failing payment:', error);
    return res.status(500).json({ success: false });
  }
};

exports.retryPayment = async (req, res) => {
  try {
    const { dbOrderId } = req.body;
    const userId = req.session.user.id;
    const razorpayService = require('../../services/razorpayService');
    
    const order = await Order.findOne({ _id: dbOrderId, userId });
    
    if (!order || (order.paymentStatus !== 'failed' && order.paymentStatus !== 'cancelled')) {
      return res.status(400).json({ success: false, message: 'Invalid order or order is not eligible for retry.' });
    }
    
    // We recreate the razorpay order with the existing final amount and order ID
    const result = await razorpayService.createRazorpayOrder(order.finalAmount, order.orderId);
    
    if (result.success) {
      // Update DB Order with new Razorpay Order ID and set to pending
      order.razorpayOrderId = result.order_id;
      order.paymentStatus = 'pending';
      order.failureReason = null;
      await order.save();
      
      return res.json({ 
        success: true, 
        order: {
          id: result.order_id,
          amount: result.amount,
          currency: result.currency
        },
        dbOrderId: order._id 
      });
    } else {
      return res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Retry Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrying payment.' });
  }
};
