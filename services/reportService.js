const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Category = require('../models/categoryModel');
const mongoose = require('mongoose');

exports.getReportData = async (filters) => {
  try {
    const { dateRange, startDate: customStart, endDate: customEnd, categoryId, courseId } = filters;
    
    // 1. Base Match Condition for Orders
    const orderMatch = {};
    const userMatch = {};

    // Date Range Logic
    if (dateRange && dateRange !== 'allTime') {
      let startDate = new Date();
      let endDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (dateRange === 'today') {
        // already set to today
      } else if (dateRange === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
      } else if (dateRange === 'last7') {
        startDate.setDate(startDate.getDate() - 6);
      } else if (dateRange === 'last30') {
        startDate.setDate(startDate.getDate() - 29);
      } else if (dateRange === 'thisMonth') {
        startDate.setDate(1);
      } else if (dateRange === 'lastMonth') {
        startDate.setMonth(startDate.getMonth() - 1, 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateRange === 'thisYear') {
        startDate.setMonth(0, 1);
      } else if (dateRange === 'custom') {
        if (customStart) {
          startDate = new Date(customStart);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customEnd) {
          endDate = new Date(customEnd);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      orderMatch.createdAt = { $gte: startDate, $lte: endDate };
      userMatch.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (courseId && courseId !== 'all') {
      orderMatch.courseId = new mongoose.Types.ObjectId(courseId);
    }

    // Category Filter requires looking up the course for the order
    let validCourseIds = null;
    if (categoryId && categoryId !== 'all') {
      const coursesInCategory = await Course.find({ category: categoryId }).select('_id').lean();
      validCourseIds = coursesInCategory.map(c => c._id);
      
      if (orderMatch.courseId) {
        // If course is selected but it doesn't match the category, then zero results
        if (!validCourseIds.find(id => id.toString() === orderMatch.courseId.toString())) {
           validCourseIds = []; // force empty
        } else {
           validCourseIds = [orderMatch.courseId];
        }
      }
      orderMatch.courseId = { $in: validCourseIds };
    }

    // --- AGGREGATIONS ---

    // Total Users
    const totalUsers = await User.countDocuments(userMatch);

    // Order Metrics (Revenue, Orders, Refunds)
    const orderMetrics = await Order.aggregate([
      { $match: orderMatch },
      { $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          revenue: { $sum: "$finalAmount" }
      }}
    ]);

    let totalRevenue = 0;
    let totalOrders = 0;
    let totalRefunds = 0;
    let refundCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    orderMetrics.forEach(metric => {
      if (metric._id === 'paid') {
        totalRevenue += metric.revenue;
        totalOrders += metric.count;
      } else if (metric._id === 'refunded') {
        totalRefunds += metric.revenue;
        refundCount += metric.count;
      } else if (metric._id === 'pending') {
        pendingCount += metric.count;
      } else if (metric._id === 'cancelled' || metric._id === 'failed') {
        cancelledCount += metric.count;
      }
    });
    
    // Status Breakdown Percentages
    const allOrdersCount = totalOrders + refundCount + pendingCount + cancelledCount;
    const statusBreakdown = {
      completed: { count: totalOrders, percent: allOrdersCount ? Math.round((totalOrders/allOrdersCount)*100) : 0 },
      pending: { count: pendingCount, percent: allOrdersCount ? Math.round((pendingCount/allOrdersCount)*100) : 0 },
      refunded: { count: refundCount, percent: allOrdersCount ? Math.round((refundCount/allOrdersCount)*100) : 0 },
      cancelled: { count: cancelledCount, percent: allOrdersCount ? Math.round((cancelledCount/allOrdersCount)*100) : 0 }
    };

    // Sales Analytics (Chart)
    // Group by month
    const salesAgg = await Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          totalRevenue: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const chartLabels = [];
    const chartRevenues = [];
    const chartOrders = [];
    
    // Last 12 months by default
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}`;
      
      chartLabels.push(monthNames[d.getMonth()]);
      
      const sale = salesAgg.find(x => x._id === dateStr);
      chartRevenues.push(sale ? sale.totalRevenue : 0);
      chartOrders.push(sale ? sale.totalOrders : 0);
    }

    const maxRev = Math.max(...chartRevenues) || 1;
    const chartRevenueHeights = chartRevenues.map(r => Math.max((r / maxRev) * 100, 5));
    
    const maxOrd = Math.max(...chartOrders) || 1;
    const chartOrderHeights = chartOrders.map(o => Math.max((o / maxOrd) * 100, 5));

    // Course Performance
    const coursePerformance = await Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid' } },
      { $group: {
          _id: "$courseId",
          enrollments: { $sum: 1 },
          revenue: { $sum: "$finalAmount" }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
      }},
      { $unwind: "$course" }
    ]);

    // Top Coupons
    const topCoupons = await Order.aggregate([
      { $match: { ...orderMatch, paymentStatus: 'paid', couponId: { $ne: null } } },
      { $group: {
          _id: "$couponId",
          uses: { $sum: 1 },
          totalDiscount: { $sum: "$couponDiscount" }
      }},
      { $sort: { uses: -1 } },
      { $limit: 3 },
      { $lookup: {
          from: 'coupons',
          localField: '_id',
          foreignField: '_id',
          as: 'coupon'
      }},
      { $unwind: "$coupon" }
    ]);

    return {
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalUsers,
        totalRefunds,
        statusBreakdown,
        chartLabels,
        chartRevenues,
        chartOrders,
        chartRevenueHeights,
        chartOrderHeights,
        coursePerformance,
        topCoupons
      }
    };

  } catch (error) {
    console.error("Report Service Error:", error);
    return { success: false, message: "Failed to generate reports" };
  }
};
