const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Order = require('../models/orderModel');
const mongoose = require('mongoose');

exports.getDashboardData = async () => {
  try {
    // 1. Top Summary Cards
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments({ status: "published", isDeleted: false });
    const totalOrders = await Order.countDocuments({ paymentStatus: "paid" });
    
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // 2. Charts Data Prep (Last 7 Days)
    const days = [];
    const salesRevenues = new Array(7).fill(0);
    const orderCounts = new Array(7).fill(0);
    const userCounts = new Array(7).fill(0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Build days array (e.g. ['Mon', 'Tue', ...])
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(dayNames[d.getDay()]);
    }

    // Sales Aggregation
    const salesAgg = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate, $lte: today }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$finalAmount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Users Aggregation
    const usersAgg = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Map aggregations to arrays matching the 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      // Create YYYY-MM-DD manually to avoid timezone shifting issues of toISOString()
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const sale = salesAgg.find(x => x._id === dateStr);
      if (sale) {
        salesRevenues[i] = sale.total;
        orderCounts[i] = sale.count;
      }
      
      const user = usersAgg.find(x => x._id === dateStr);
      if (user) userCounts[i] = user.count;
    }

    // Heights calculations for UI (percentages)
    const maxSale = Math.max(...salesRevenues) || 1; 
    const salesHeights = salesRevenues.map(r => Math.max((r / maxSale) * 100, 5)); // min 5% for visibility

    const maxOrder = Math.max(...orderCounts) || 1;
    const orderHeights = orderCounts.map(o => Math.max((o / maxOrder) * 100, 5));

    const maxUser = Math.max(...userCounts) || 1;
    const userHeights = userCounts.map(u => Math.max((u / maxUser) * 100, 5));

    // 3. Recent 4 Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("userId", "name email")
      .lean();

    // 4. Recent 4 Signups
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    return {
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalOrders,
        totalRevenue,
        days,
        salesRevenues,
        salesHeights,
        orderCounts,
        orderHeights,
        userCounts,
        userHeights,
        recentOrders,
        recentUsers
      }
    };
  } catch (error) {
    console.error("Dashboard Service Error:", error);
    return { success: false, errors: { general: "Failed to fetch dashboard data" } };
  }
};