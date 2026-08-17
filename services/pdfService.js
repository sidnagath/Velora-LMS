const PDFDocument = require('pdfkit');

exports.generateReportPDF = (data, filters, res) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

      // Pipe to HTTP response
      doc.pipe(res);

      const formatCurrency = (val) => {
        return 'Rs. ' + Number(val || 0).toLocaleString('en-IN');
      };

      // Header
      doc.fillColor('#0B5ED7').fontSize(24).font('Helvetica-Bold').text('Velora', { align: 'left' });
      doc.fillColor('#374151').fontSize(16).text('Analytics & Performance Report', { align: 'left' });
      doc.moveDown();

      // Filters/Metadata
      doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
      doc.text(`Generated On: ${new Date().toLocaleString()}`);
      doc.text(`Date Range: ${filters.dateRange}`);
      if (filters.dateRange === 'custom') {
         doc.text(`Custom Period: ${filters.startDate} to ${filters.endDate}`);
      }
      doc.moveDown(2);

      // Divider
      doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Quick Stats Section
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Quick Stats');
      doc.moveDown(0.5);

      const statsY = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6B7280');
      doc.text('Total Revenue', 50, statsY);
      doc.text('Total Orders', 180, statsY);
      doc.text('Total Refunds', 300, statsY);
      doc.text('New Users', 420, statsY);

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827');
      doc.text(formatCurrency(data.totalRevenue), 50, statsY + 15);
      doc.text(String(data.totalOrders), 180, statsY + 15);
      doc.text(formatCurrency(data.totalRefunds), 300, statsY + 15);
      doc.text(String(data.totalUsers), 420, statsY + 15);

      doc.moveDown(3);

      // Order Status Breakdown
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Order Status Breakdown', 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Completed: ${data.statusBreakdown?.completed?.count || 0} (${data.statusBreakdown?.completed?.percent || 0}%)`);
      doc.text(`Pending: ${data.statusBreakdown?.pending?.count || 0} (${data.statusBreakdown?.pending?.percent || 0}%)`);
      doc.text(`Refunded: ${data.statusBreakdown?.refunded?.count || 0} (${data.statusBreakdown?.refunded?.percent || 0}%)`);
      doc.text(`Cancelled: ${data.statusBreakdown?.cancelled?.count || 0} (${data.statusBreakdown?.cancelled?.percent || 0}%)`);
      
      doc.moveDown(2);

      // Top Performing Courses
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Top Performing Courses');
      doc.moveDown(0.5);

      // Table Header - Courses
      let tableY = doc.y;
      doc.fillColor('#F3F4F6').rect(50, tableY, 495, 20).fill();
      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold');
      doc.text('Course Title', 60, tableY + 5);
      doc.text('Enrollments', 350, tableY + 5);
      doc.text('Revenue', 450, tableY + 5);
      
      tableY += 20;

      // Table Rows - Courses
      doc.font('Helvetica');
      if (data.coursePerformance && data.coursePerformance.length > 0) {
        data.coursePerformance.forEach((item, index) => {
          if (index % 2 === 0) {
            doc.fillColor('#F9FAFB').rect(50, tableY, 495, 20).fill();
          }
          doc.fillColor('#111827');
          let title = item.course?.title || 'Unknown Course';
          if (title.length > 45) title = title.substring(0, 42) + '...';
          doc.text(title, 60, tableY + 5);
          doc.text(String(item.enrollments), 350, tableY + 5);
          doc.text(formatCurrency(item.revenue), 450, tableY + 5);
          tableY += 20;
        });
      } else {
        doc.fillColor('#6B7280').text('No course data available for this period.', 60, tableY + 5);
        tableY += 20;
      }
      
      doc.y = tableY + 20;

      // Top Coupons
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Top Coupons Used');
      doc.moveDown(0.5);

      // Table Header - Coupons
      tableY = doc.y;
      doc.fillColor('#F3F4F6').rect(50, tableY, 495, 20).fill();
      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold');
      doc.text('Coupon Code', 60, tableY + 5);
      doc.text('Uses', 350, tableY + 5);
      doc.text('Total Discount', 450, tableY + 5);
      
      tableY += 20;

      // Table Rows - Coupons
      doc.font('Helvetica');
      if (data.topCoupons && data.topCoupons.length > 0) {
        data.topCoupons.forEach((item, index) => {
          if (index % 2 === 0) {
            doc.fillColor('#F9FAFB').rect(50, tableY, 495, 20).fill();
          }
          doc.fillColor('#111827');
          doc.text(item.coupon?.code || 'Unknown', 60, tableY + 5);
          doc.text(String(item.uses), 350, tableY + 5);
          doc.text(formatCurrency(item.totalDiscount), 450, tableY + 5);
          tableY += 20;
        });
      } else {
        doc.fillColor('#6B7280').text('No coupons used in this period.', 60, tableY + 5);
        tableY += 20;
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#9CA3AF').text(
          `Page ${i + 1} of ${pages.count}  -  Velora Learning Management System`,
          50,
          doc.page.height - 50,
          { align: 'center', width: 495 }
        );
      }

      // Finalize PDF file
      doc.end();
      
      // Since it's piping, it's done asynchronously but we can resolve
      // when the doc end is called. The `res` will finish.
      resolve();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      reject(err);
    }
  });
};
