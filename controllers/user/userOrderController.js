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
    const { dbOrderIds } = req.body;
    const userId = req.session.user.id;

    const result = await orderService.cancelPayment(dbOrderIds, userId);
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
    const { dbOrderIds, reason } = req.body;
    const userId = req.session.user.id;

    const result = await orderService.failPayment(dbOrderIds, userId, reason);
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
        dbOrderIds: result.data.dbOrderIds
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

    let result;
    const isFromCheckout = req.query.type === 'checkout' || (req.get('referer') && req.get('referer').includes('payment-success'));

    if (isFromCheckout) {
      result = await orderService.getCheckoutInvoiceData(orderId, userId);
    } else {
      result = await orderService.getInvoiceData(orderId, userId);
    }
    if (!result.success) {
      req.flash('error', result.message || 'Invoice not found or order not paid.');
      return res.redirect('/user/orders');
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
    let yPos = doc.y + 5;

    order.courses.forEach((course) => {
      const price = course.orderSubtotal || course.basePrice || course.price || 0;
      const cDisc = course.orderCourseDiscount || 0;
      const coupDisc = course.orderCouponDiscount || 0;
      const cFinal = course.orderFinalAmount || price;

      doc.font('Helvetica-Bold').fillColor('#333333');
      doc.text(course.title, 50, yPos, { width: 400 });

      doc.font('Helvetica').fillColor('#000000');
      doc.text(`Rs. ${price.toFixed(2)}`, 450, yPos, { width: 100, align: 'right' });
      yPos += doc.heightOfString(course.title, { width: 400 }) + 5;

      if (cDisc > 0) {
        doc.fillColor('#008000').text(`  - Course Offer: Rs. ${cDisc.toFixed(2)}`, 60, yPos);
        yPos += 15;
      }
      if (coupDisc > 0) {
        doc.fillColor('#008000').text(`  - Coupon Discount: Rs. ${coupDisc.toFixed(2)}`, 60, yPos);
        yPos += 15;
      }

      doc.fillColor('#000000').font('Helvetica-Oblique');
      doc.text(`  Final Course Amount: Rs. ${cFinal.toFixed(2)}`, 60, yPos);
      yPos += 20;
      doc.font('Helvetica');
    });

    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;

    // Totals
    const rightColX = 350;
    const valueColX = 450;

    const subtotalAmt = order.subtotal || 0;

    doc.text('Subtotal:', rightColX, yPos);
    doc.text(`Rs. ${subtotalAmt.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
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

    // GST Breakdown
    const courseDisc = order.courseDiscount || 0;
    const couponDisc = order.couponDiscount || 0;
    const taxableAmt = subtotalAmt - courseDisc - couponDisc;
    const gstAmt = taxableAmt * 0.18;
    const finalAmt = order.finalAmount || 0;

    doc.font('Helvetica');
    doc.text('Taxable Amount:', rightColX, yPos);
    doc.text(`Rs. ${taxableAmt.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
    yPos += 15;

    doc.text('GST (18%):', rightColX, yPos);
    doc.text(`Rs. ${gstAmt.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });
    yPos += 15;

    doc.moveTo(rightColX, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    doc.font('Helvetica-Bold');
    doc.text('Total:', rightColX, yPos);
    doc.text(`Rs. ${finalAmt.toFixed(2)}`, valueColX, yPos, { width: 100, align: 'right' });

    doc.moveDown(4);
    doc.font('Helvetica-Oblique').fillColor('#888888').text('Thank you for choosing Velora LMS!', 50, doc.y, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    req.flash('error', 'Failed to generate invoice.');
    return res.redirect('/user/orders');
  }
};

exports.refund = async (req, res) => {

  try {
    const orderId = req.params.id;
    const userId = req.session.user?.id;
    const reason = req.body.reason;

    const result = await orderService.requestRefund(orderId, userId, reason);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error submitting refund:', error);
    return res.status(500).json({ success: false, message: 'Server error while processing refund' });
  }

};

exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user?.id;
    const reason = req.body.reason || "Cancelled by user";

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await orderService.cancelPendingOrder(orderId, userId, false, reason);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ success: false, message: 'Server error while cancelling order' });
  }
};
