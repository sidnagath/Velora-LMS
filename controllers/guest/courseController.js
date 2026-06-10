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

exports.getHome = (req, res) => {

  // if (req.session.user)  return res.redirect("/user-dashboard");
  // if (req.session.admin) return res.redirect("/admin-dashboard");

  res.render("pages/guest/home", {
    title:     "Home - Velora",
    isLoggedIn: false
  });
};

exports.getCourses = async (req, res) => {
  try {
    const { category, level, price, search } = req.query;
    const page  = Number(req.query.page) || 1;
    const limit = 6;
    const skip  = (page - 1) * limit;

    // Load all active categories for the sidebar
    const allCategories = await Category.find({ status: "active" }).sort({ name: 1 }).lean();

    // Resolve which category is selected (ObjectId string or name slug)
    let selectedCategoryDoc = null;
    let selectedCategoryId  = null;

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        selectedCategoryDoc = allCategories.find(c => c._id.toString() === category);
      } else {
        // Backward-compat: match by name (case-insensitive)
        selectedCategoryDoc = allCategories.find(
          c => c.name.toLowerCase() === category.toLowerCase()
        );
      }
      if (selectedCategoryDoc) {
        selectedCategoryId = selectedCategoryDoc._id;
      }
    }

    // Default to first active category if none selected
    if (!selectedCategoryDoc && allCategories.length > 0) {
      selectedCategoryDoc = allCategories[0];
      selectedCategoryId  = selectedCategoryDoc._id;
    }

    // Build filter
    const filter = { status: "published", isDeleted: false };

    if (selectedCategoryId) {
      filter.category = selectedCategoryId;   // ObjectId comparison — no $regex
    }

    if (level) {
      filter.level = { $regex: new RegExp(`^${level}$`, "i") };
    }

    if (price === "free") {
      filter.basePrice = 0;
    } else if (price === "paid") {
      filter.basePrice = { $gt: 0 };
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
        .populate("category")
        .sort({ rating: -1, reviewsCount: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / limit);
    const isLoggedIn = !!(req.session && req.session.user);

    res.render("pages/guest/courses", {
      title:              "Velora Courses",
      courses,
      currentPage:        page,
      totalPages,
      allCategories,
      selectedCategoryDoc,
      selectedCategoryId: selectedCategoryId ? selectedCategoryId.toString() : null,
      selectedLevel:      level  || "",
      selectedPrice:      price  || "",
      search:             search || "",
      isLoggedIn
    });

  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id:       req.params.courseId,
      status:    "published",
      isDeleted: false
    }).populate("category").lean();

    if (!course) return res.redirect("/courses");

    const modules = await Module.find({ courseId: course._id })
      .sort({ order: 1 }).lean();

    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ moduleId: mod._id })
          .sort({ order: 1 }).lean();
        return { ...mod, lessons };
      })
    );

    const totalLessons = modulesWithLessons.reduce(
      (sum, m) => sum + m.lessons.length, 0
    );

    const relatedCourses = await Course.find({
      category:  course.category ? course.category._id : new mongoose.Types.ObjectId(),
      _id:       { $ne: course._id },
      status:    "published",
      isDeleted: false
    }).populate("category").limit(4).lean();

    res.render("pages/guest/course-detail", {
      title: `Velora - ${course.title}`,
      isLoggedIn: false,
      course,
      modulesWithLessons,
      totalLessons,
      relatedCourses
    });

  } catch (err) {
    console.log(err);
    res.redirect("/courses");
  }
};

