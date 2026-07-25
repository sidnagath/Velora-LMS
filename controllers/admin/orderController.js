const Order = require('../../models/orderModel');
const User = require('../../models/userModel');
const Course = require('../../models/courseModel');

exports.getAdminOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') {
      query.paymentStatus = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const users = await User.find({ name: searchRegex }).select('_id').lean();
      const userIds = users.map(u => u._id);
      
      query.$or = [
        { orderId: searchRegex },
        { userId: { $in: userIds } }
      ];
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate('userId', 'name avatar email')
      .populate('courses', 'title')
      .sort({ createdAt: -1 })
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

    res.render('pages/admin/orders/orders', {
      title: 'Velora Admin - Orders',
      path: '/admin-orders',
      activePage: 'orders',
      isAdmin: true,
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      stats: {
        totalRevenue: totalRevenue.toFixed(2),
        monthlyOrders: monthlyOrdersCount,
        avgOrderValue: avgOrderValue.toFixed(2)
      },
      search: req.query.search || '',
      statusFilter: req.query.status || 'all'
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    req.flash('error', 'Failed to load orders.');
    res.redirect('/admin-dashboard');
  }
};

exports.getAdminOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name avatar email phone')
      .populate('courses', 'title thumbnail basePrice discountPrice level')
      .populate('couponId', 'code discountType discountValue')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/admin-orders');
    }

    res.render('pages/admin/orders/order-details', {
      title: 'Velora Admin - Order Details',
      path: '/admin-orders',
      activePage: 'orders',
      isAdmin: true,
      order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    req.flash('error', 'Failed to load order details.');
    res.redirect('/admin-orders');
  }
};
