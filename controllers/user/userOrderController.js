const orderService = require('../../services/orderService');
const cartService = require('../../services/cartService');

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const result = await orderService.getUserOrders(userId);
    if (!result.success) {
      req.flash('error', result.message || 'Failed to load your orders.');
      return res.redirect('/');
    }
    
    const { user, orders } = result.data;
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
    
    const result = await orderService.cancelPayment(dbOrderId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
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
    
    const result = await orderService.failPayment(dbOrderId, userId, reason);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
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
    
    const result = await orderService.retryPayment(dbOrderId, userId);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        order: result.data.order,
        dbOrderId: result.data.dbOrderId 
      });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error retrying payment:', error);
    return res.status(500).json({ success: false, message: 'Server error retrying payment.' });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user.id;
    
    const result = await orderService.getInvoiceData(orderId, userId);
      
    if (!result.success) {
      req.flash('error', result.message || 'Invoice not found or order not paid.');
      return res.redirect('/user-orders');
    }
    
    const order = result.data;
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('VELORA LMS', { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('hello@velora.com', { align: 'right' });
    doc.text('+1 (555) 123-4567', { align: 'right' });
    
    // Title
    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#333333').text('INVOICE', { align: 'left' });
    doc.moveDown();
    
    // Order Info
    doc.fontSize(10).font('Helvetica');
    doc.text(`Order ID: ${order.orderId || order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'RAZORPAY'}`);
    doc.text(`Status: ${order.paymentStatus.toUpperCase()}`);
    
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Billed To:');
    doc.font('Helvetica').text(order.userId.name);
    doc.text(order.userId.email);
    doc.moveDown(2);
    
    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Item / Course', 50, doc.y, { continued: true });
    doc.text('Amount', 0, doc.y, { align: 'right' });
    
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();
    
    // Table Rows
    doc.font('Helvetica');
    let subtotal = 0;
    let yPos = doc.y + 5;
    
    order.courses.forEach((course) => {
      const price = course.basePrice || course.price || 0;
      subtotal += price;
      
      doc.text(course.title, 50, yPos, { width: 400 });
      doc.text(`Rs. ${price.toFixed(2)}`, 450, yPos, { width: 100, align: 'right' });
      yPos = doc.y + 10;
    });
    
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;
    
    // Totals
    const rightColX = 350;
    const valueColX = 450;
    
    doc.text('Subtotal:', rightColX, yPos);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
    yPos += 15;
    
    if (order.courseDiscount > 0) {
      doc.text('Course Discount:', rightColX, yPos);
      doc.text(`-Rs. ${order.courseDiscount.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
      yPos += 15;
    }
    
    if (order.couponDiscount > 0 && order.couponId) {
      doc.text(`Coupon (${order.couponId.code}):`, rightColX, yPos);
      doc.text(`-Rs. ${order.couponDiscount.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
      yPos += 15;
    }
    
    doc.moveTo(rightColX, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    
    doc.font('Helvetica-Bold');
    doc.text('Total:', rightColX, yPos);
    doc.text(`Rs. ${order.finalAmount.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
    
    doc.moveDown(4);
    doc.font('Helvetica-Oblique').fillColor('#888888').text('Thank you for choosing Velora LMS!', 50, doc.y, { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    req.flash('error', 'Failed to generate invoice.');
    return res.redirect('/user-orders');
  }
};

exports.refund = async (req, res) => {
  
  try{
  const orderId=req.params.id;
  const userId=req.session.user?.id;
  const reason=req.body.reason;

  const result=await orderService.requestRefund(orderId,userId,reason);

  if(!result.success){
  return res.status(400).json(result);
  }

  return res.json(result);
  } catch (error) {
    console.error('Error submitting refund:', error);
    return res.status(500).json({ success: false, message: 'Server error while processing refund' });
}
  
};
