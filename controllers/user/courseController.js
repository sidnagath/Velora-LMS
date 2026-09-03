import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import courseService from '../../services/courseService.js';
import cartService from '../../services/cartService.js';
import User from '../../models/userModel.js';
import Enrollment from '../../models/enrollmentModel.js';


export const getCourses = async (req, res) => {
  const result = await courseService.getPublishedCourses(req.query);
  if (!result.success) return res.redirect("/");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= isLoggedIn ? await cartService.getCartCount(req.session.user.id) : {success:false, count:0};

  let enrolledCourseIds = [];
  if (isLoggedIn) {

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

export const getCourseDetails = async (req, res) => {
  const result = await courseService.getCourseDetails(req.params.courseId);
  if (!result.success) return res.redirect("/user/courses");

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount= isLoggedIn ? await cartService.getCartCount(req.session.user.id) : {success:false, count:0};

  let enrolledCourseIds = [];
  if (isLoggedIn) {
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

export const getMyCourses = async (req, res) => {
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

export const getMyCourseDetails = async(req,res)=>{

  try{

  const result=await courseService.myCourseDetails(
    req.params.courseId,
    req.session.user.id,
    req.query.lesson);

  if(!result.success){
    return res.redirect("/user/my-courses");
  }

  const isLoggedIn = !!(req.session && req.session.user);
  const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;
  const cartCount = isLoggedIn ? await cartService.getCartCount(req.session.user.id) : { success: false, count: 0 };

  return res.render('pages/user/mycourses/my-courses-detail', {
    title: `Velora - ${result.data.course.title}`,
    isLoggedIn: true,
    user,
    cartCount: cartCount.success ? cartCount.count : 0,
    ...result.data
  });

  }catch(error){

    console.error(error);
    req.flash("error", "An error occurred while loading your courses.");
    res.redirect("/user/mycourses");

  }

}

export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.session.user.id;
    const result = await courseService.markLessonComplete(userId, courseId, lessonId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

export const getCourseCertificate = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user.id;

    const result = await courseService.validateCertificateAccess(userId, courseId);

    if (!result.success) {
      req.flash('error', result.message || 'You are not eligible for this certificate.');
      return res.redirect('/user/my-courses');
    }

    const user = await User.findById(userId).lean();
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    res.render('pages/user/mycourses/certificate', {
      title: `Certificate - ${result.data.course.title}`,
      course: result.data.course,
      user,
      currentDate,
      certificateId: `VEL-${userId.toString().slice(-4)}-${courseId.toString().slice(-4)}`
    });
  } catch (error) {
    console.error('Error loading certificate:', error);
    req.flash('error', 'An error occurred while loading the certificate.');
    res.redirect('/user/my-courses');
  }
};

export const streamLessonVideo = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.session.user.id;

    const result = await courseService.getAuthorizedVideoUrl(userId, courseId, lessonId);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).send("Unauthorized: " + result.message);
    }

    // 302 Redirect to the short-lived Cloudinary signed URL
    return res.redirect(302, result.url);
  } catch (error) {
    console.error("Stream video error:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send("Server error");
  }
};


export default {
  getCourses,
  getCourseDetails,
  getMyCourses,
  getMyCourseDetails,
  markLessonComplete,
  getCourseCertificate,
  streamLessonVideo
};
