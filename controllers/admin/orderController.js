const orderService = require('../../services/orderService');

exports.getAdminOrders = async (req, res) => {
  try {
    const queryObj = {
      page: req.query.page,
      status: req.query.status,
      search: req.query.search,
      sortBy: req.query.sortBy
    };

    const result = await orderService.getAdminOrdersData(queryObj);

    if (!result.success) {
      req.flash('error', result.message || 'Failed to load orders.');
      return res.redirect('/admin/dashboard');
    }

    const { orders, currentPage, totalPages, totalOrders, stats } = result.data;

    res.render('pages/admin/orders/orders', {
      title: 'Velora Admin - Orders',
      path: '/admin/orders',
      activePage: 'orders',
      isAdmin: true,
      orders,
      currentPage,
      totalPages,
      totalOrders,
      stats,
      search: req.query.search || '',
      statusFilter: req.query.status || 'all',
      sortBy: req.query.sortBy || 'newest'
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    req.flash('error', 'Failed to load orders.');
    res.redirect('/admin/dashboard');
  }
};

exports.getAdminOrderDetails = async (req, res) => {
  try {
    const result = await orderService.getOrderById(req.params.id);

    if (!result.success) {
      req.flash('error', result.message || 'Order not found.');
      return res.redirect('/admin/orders');
    }

    res.render('pages/admin/orders/order-details', {
      title: 'Velora Admin - Order Details',
      path: '/admin/orders',
      activePage: 'orders',
      isAdmin: true,
      order: result.data
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    req.flash('error', 'Failed to load order details.');
    res.redirect('/admin/orders');
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    
    const result = await orderService.updateOrderStatus(orderId, status);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};


exports.approveRefund= async (req,res)=>{
try{

  const orderId=req.params.id;
  const result= await orderService.approveRefund(orderId);

  if(!result.success){
    return res.status(400).json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, message: result.message });

}catch(error){
 console.error('Error updating refund status:', error);
 return res.status(500).json({ success: false, message: 'Server error updating refund status' });
}
}

exports.rejectRefund= async (req,res)=>{
try{

  const orderId=req.params.id;
  const result= await orderService.rejectRefund(orderId);

  if(!result.success){
    return res.status(400).json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, message: result.message });

}catch(error){
 console.error('Error updating refund status:', error);
 return res.status(500).json({ success: false, message: 'Server error updating refund status' });
}

}