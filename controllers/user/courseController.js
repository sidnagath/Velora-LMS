const courseService = require('../../services/courseService');
const cartService = require('../../services/cartService');
const User = require('../../models/userModel');

exports.getCourses = async (req, res) => {
  const result = await courseService.getPublishedCourses(req.query);
  if (!result.success) return res.redirect("/");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= await cartService.getCartCount(req.session.user.id);

  res.render("pages/user/courses/courses", {
    title: "Velora - Explore Courses",
    isLoggedIn,
    user,
    ...result.data,
    wishlistCourseIds: user ? (user.wishlist || []).map(id => id.toString()) : [],
    cartCourseIds: user ? (user.cart || []).map(id => id.toString()) : [],
    cartCount:cartCount.success?cartCount.count:0
  });
};

exports.getCourseDetails = async (req, res) => {
  const result = await courseService.getCourseDetails(req.params.courseId);
  if (!result.success) return res.redirect("/user-courses");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= await cartService.getCartCount(req.session.user.id);

  res.render("pages/user/courses/course-detail", {
    title: `Velora - ${result.data.course.title}`,
    isLoggedIn,
    user,
    ...result.data,
    wishlistCourseIds: user ? (user.wishlist || []).map(id => id.toString()) : [],
    cartCourseIds: user ? (user.cart || []).map(id => id.toString()) : [],
    cartCount:cartCount.success?cartCount.count:0
  });
};
