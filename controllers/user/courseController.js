const courseService = require('../../services/courseService');
const cartService = require('../../services/cartService');
const User = require('../../models/userModel');

exports.getCourses = async (req, res) => {
  const result = await courseService.getPublishedCourses(req.query);
  if (!result.success) return res.redirect("/");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= isLoggedIn ? await cartService.getCartCount(req.session.user.id) : {success:false, count:0};
  
  let enrolledCourseIds = [];
  if (isLoggedIn) {
    const Enrollment = require('../../models/enrollmentModel');
    const enrollments = await Enrollment.find({ userId: req.session.user.id, status: { $ne: 'cancelled' } }).lean();
    enrolledCourseIds = enrollments.map(e => e.courseId.toString());
  }

  res.render("pages/user/courses/courses", {
    title: "Velora - Explore Courses",
    isLoggedIn,
    user,
    ...result.data,
    wishlistCourseIds: user ? (user.wishlist || []).map(id => id.toString()) : [],
    cartCourseIds: user ? (user.cart || []).map(id => id.toString()) : [],
    enrolledCourseIds,
    cartCount:cartCount.success?cartCount.count:0
  });
};

exports.getCourseDetails = async (req, res) => {
  const result = await courseService.getCourseDetails(req.params.courseId);
  if (!result.success) return res.redirect("/user-courses");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= isLoggedIn ? await cartService.getCartCount(req.session.user.id) : {success:false, count:0};
  
  let enrolledCourseIds = [];
  if (isLoggedIn) {
    const Enrollment = require('../../models/enrollmentModel');
    const enrollments = await Enrollment.find({ userId: req.session.user.id, status: { $ne: 'cancelled' } }).lean();
    enrolledCourseIds = enrollments.map(e => e.courseId.toString());
  }

  res.render("pages/user/courses/course-detail", {
    title: `Velora - ${result.data.course.title}`,
    isLoggedIn,
    user,
    ...result.data,
    wishlistCourseIds: user ? (user.wishlist || []).map(id => id.toString()) : [],
    cartCourseIds: user ? (user.cart || []).map(id => id.toString()) : [],
    enrolledCourseIds,
    cartCount:cartCount.success?cartCount.count:0
  });
};

exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const user = await User.findById(userId).lean();
    const cartCount = await cartService.getCartCount(userId);
    
    const result = await courseService.getMyCoursesData(userId);
    
    res.render("pages/user/mycourses/my-courses", {
      title: "Velora - My Courses",
      isLoggedIn: true,
      user,
      cartCount: cartCount.success ? cartCount.count : 0,
      enrollments: result.success ? result.enrollments : []
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while loading your courses.");
    res.redirect("/");
  }
};
