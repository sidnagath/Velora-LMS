import courseService from '../../services/courseService.js';


export const getHome = async (req, res) => {
  const result = await courseService.getPublishedCourses({ limit: 4 });
  const featuredCourses = result.success ? result.data.courses : [];

  res.render("pages/guest/home", {
    title: "Home - Velora",
    isLoggedIn: false,
    featuredCourses
  });
};

export const getCourses = async (req, res) => {
  const result = await courseService.getPublishedCourses(req.query);
  if (!result.success) return res.redirect("/");

  const isLoggedIn = !!(req.session && req.session.user);

  res.render("pages/guest/courses", {
    title: "Velora Courses",
    ...result.data,
    isLoggedIn
  });
};

export const getCourseDetails = async (req, res) => {
  const result = await courseService.getCourseDetails(req.params.courseId);
  if (!result.success) return res.redirect("/courses");

  res.render("pages/guest/course-detail", {
    title: `Velora - ${result.data.course.title}`,
    isLoggedIn: false,
    ...result.data
  });
};


export default {
  getHome,
  getCourses,
  getCourseDetails
};
