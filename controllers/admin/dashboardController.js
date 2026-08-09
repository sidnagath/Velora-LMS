const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');
const Course = require('../../models/courseModel');
const Module = require('../../models/moduleModel');
const Lesson = require('../../models/lessonModel');
const Resource = require('../../models/resourceModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const createTransporter = require('../../config/mail');

exports.getAdminDashboard= (req, res) => {

const activities = [
    {
      name: "John Doe",
      email: "john@example.com",
      course: "React Mastery",
      status: "completed",
      amount: 120
    },
    {
      name: "Sarah Lee",
      email: "sarah@example.com",
      course: "Node.js Bootcamp",
      status: "pending",
      amount: 80
    }
  ];

    res.render('pages/admin/dashboard/dashboard', { 
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        activities,
        isAdmin: true,
        flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
        flashType: req.query.flashType || "success"
    });
  }


exports.getAdminUsers = async (req, res) => {

  try {

    // SEARCH
    const search = req.query.search || "";

    // FILTERS
    const filterStatus    = req.query.status       || "";
    const filterProvider  = req.query.authProvider || "";
    const sortBy          = req.query.sortBy       || "newest";

    // PAGINATION
    const page  = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip  = (page - 1) * limit;

    // BUILD FILTER
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name:   { $regex: search, $options: "i" } },
        { email:  { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    if (filterStatus)   filter.status       = filterStatus;
    if (filterProvider) filter.authProvider = filterProvider;

    // BUILD SORT
    const sortMap = {
      newest:   { createdAt: -1 },
      oldest:   { createdAt:  1 },
      nameAZ:   { name:       1 },
      nameZA:   { name:      -1 }
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    // QUERY
    const users = await User.find(filter).sort(sort).skip(skip).limit(limit);
    const totalUsers  = await User.countDocuments(filter);
    const totalPages  = Math.ceil(totalUsers / limit);

    const activeUsers   = await User.countDocuments({ isDeleted: false, status: "active" });
    const inactiveUsers = await User.countDocuments({ isDeleted: false, status: "inactive" });
    const googleUsers   = await User.countDocuments({ isDeleted: false, authProvider: "google" });

    res.render("pages/admin/user-management/users", {
      title: "Velora - Admin Users",
      isLoggedIn: true,
      isAdmin: true,
      users,
      currentPage: page,
      totalPages,
      totalUsers,
      activeUsers,
      inactiveUsers,
      googleUsers,
      limit,
      search,
      filterStatus,
      filterProvider,
      sortBy,
      success: req.query.success || "",
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success"
    });

  } catch (err) {
    console.log(err);
    res.redirect("/admin/dashboard");
  }

};

exports.getAnalytics = (req, res) => {
  res.render("pages/admin/reports/analytics", { title: "Analytics & Reports - Velora", user: req.user, isAdmin: true });
};
