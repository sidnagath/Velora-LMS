import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import orderService from '../../services/orderService.js';


export const getAdminOrders = async (req, res) => {
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

export const getAdminOrderDetails = async (req, res) => {
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

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const result = await orderService.updateOrderStatus(orderId, status);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message });
    }

    return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error updating status' });
  }
};

export const approveRefund = async (req,res)=>{
try{

  const orderId=req.params.id;
  const result= await orderService.approveRefund(orderId);

  if(!result.success){
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message });
  }

  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message });

}catch(error){
 console.error('Error updating refund status:', error);
 return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error updating refund status' });
}
}

export const rejectRefund = async (req,res)=>{
try{

  const orderId=req.params.id;
  const result= await orderService.rejectRefund(orderId);

  if(!result.success){
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message });
  }

  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message });

}catch(error){
 console.error('Error updating refund status:', error);
 return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error updating refund status' });
}

}

export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const reason = req.body.reason || "Cancelled by admin";

    // admin doesn't need to pass a specific userId for ownership check
    const result = await orderService.cancelPendingOrder(orderId, null, true, reason);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error cancelling order by admin:', error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error while cancelling order' });
  }
};

export default {
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  approveRefund,
  rejectRefund,
  cancelOrder
};
