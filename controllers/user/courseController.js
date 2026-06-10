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

exports.getCourses = async (req, res) => {
  try {
    const { category, level, price, search, page = 1 } = req.query;
    const LIMIT = 6;
    const skip  = (parseInt(page) - 1) * LIMIT;

    // Load all active categories for sidebar
    const allCategories = await Category.find({ status: "active" }).sort({ name: 1 }).lean();

    // Resolve which category is selected (ObjectId string or name slug)
    let selectedCategoryDoc = null;
    let selectedCategoryId  = null;

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        selectedCategoryDoc = allCategories.find(c => c._id.toString() === category);
      } else {
        // Backward-compat: match by name case-insensitively
        selectedCategoryDoc = allCategories.find(
          c => c.name.toLowerCase() === category.toLowerCase()
        );
      }
      if (selectedCategoryDoc) selectedCategoryId = selectedCategoryDoc._id;
    }

    // Default to first active category
    if (!selectedCategoryDoc && allCategories.length > 0) {
      selectedCategoryDoc = allCategories[0];
      selectedCategoryId  = selectedCategoryDoc._id;
    }

    const filter = { status: "published", isDeleted: false };

    // ObjectId-based category filter — no $regex
    if (selectedCategoryId) filter.category = selectedCategoryId;

    if (level) filter.level = { $regex: new RegExp(`^${level}$`, "i") };

    if (price === "free") filter.pricingType = "free";
    if (price === "paid") filter.pricingType = "paid";

    if (search) filter.title = { $regex: search, $options: "i" };

    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
        .populate("category")
        .sort({ rating: -1, reviewsCount: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(LIMIT)
        .lean(),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / LIMIT);
    const isLoggedIn = !!(req.session && req.session.user);
    const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;

    res.render('pages/user/courses/courses', {
      title:              'Velora - Explore Courses',
      isLoggedIn,
      user,
      courses,
      totalPages,
      currentPage:        parseInt(page),
      allCategories,
      selectedCategoryDoc,
      selectedCategoryId: selectedCategoryId ? selectedCategoryId.toString() : null,
      selectedLevel:      level  || '',
      selectedPrice:      price  || '',
      search:             search || '',
      wishlistCourseIds:  [],
      cartCourseIds:      []
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id:       req.params.courseId,
      status:    'published',
      isDeleted: false
    }).populate('category').lean();

    if (!course) return res.redirect('/user-courses');

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

    // Use the populated _id for related courses query
    const categoryId = course.category ? course.category._id || course.category : new mongoose.Types.ObjectId();
    const relatedCourses = await Course.find({
      category:  categoryId,
      _id:       { $ne: course._id },
      status:    'published',
      isDeleted: false
    }).populate('category').limit(4).lean();

    const isLoggedIn = !!(req.session && req.session.user);
    const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;

    res.render('pages/user/courses/course-detail', {
      title:              `Velora - ${course.title}`,
      isLoggedIn,
      user,
      course,
      modulesWithLessons,
      totalLessons,
      relatedCourses
    });
  } catch (err) {
    console.log(err);
    res.redirect('/user-courses');
  }
};

