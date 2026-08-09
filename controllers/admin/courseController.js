const courseService = require('../../services/courseService');

exports.getAdminCourses = async (req, res) => {
  const result = await courseService.getAdminCoursesList(req.query);

  if (!result.success) {
    return res.render("pages/admin/courses/courses", {
      title: "Velora - Course Management",
      isLoggedIn: true,
      isAdmin: true,
      courses: [],
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      instructorsCount: 0,
      allCategories: [],
      LIMIT: 10,
      filterStatus: "",
      filterLevel: "",
      filterCategory: "",
      sortBy: "newestUpdated",
      flashMsg: "",
      flashType: "success",
      errors: result.errors
    });
  }

  res.render("pages/admin/courses/courses", {
    title: "Velora - Course Management",
    isLoggedIn: true,
    isAdmin: true,
    ...result.data,
    success: req.query.success || "",
    flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
    flashType: req.query.flashType || "success",
    errors: {}
  });
};

exports.getAdminCreateCourse = async (req, res) => {
  const result = await courseService.getAdminCreateCourseData();
  
  if (!result.success) {
    return res.redirect("/admin/courses");
  }

  res.render("pages/admin/courses/basic-info", {
    title: "Velora - Create Course",
    isLoggedIn: true,
    isAdmin: true,
    isEdit: false,
    course: {},
    categories: result.data.categories,
    errors: {},
    formData: {}
  });
};

exports.postAdminCreateCourse = async (req, res) => {
  const result = await courseService.createCourse(req.body, req.files, req.fileValidationError);

  if (!result.success) {
    return res.status(400).json({ success: false, message: 'Failed to create course.', errors: result.errors, formData: req.body });
  }

  return res.status(201).json({ success: true, message: `Course '${result.data.course.title}' created successfully`, courseId: result.data.course._id });
};

exports.getAdminEditCourse = async (req, res) => {
  const result = await courseService.getAdminEditCourseData(req.params.courseId);

  if (!result.success) {
    if (result.errors.general === "Course not found.") {
      return res.redirect("/admin/courses");
    }
    return res.render("pages/admin/courses/courses", {
      title: "Velora - Course Management",
      isLoggedIn: true,
      isAdmin: true,
      courses: [],
      search: "",
      errors: result.errors
    });
  }

  res.render("pages/admin/courses/basic-info", {
    title: "Velora - Edit Course",
    isLoggedIn: true,
    isAdmin: true,
    isEdit: true,
    course: result.data.course,
    categories: result.data.categories,
    errors: {},
    formData: {}
  });
};

exports.getViewCourse = async (req, res) => {
  const result = await courseService.getCourseDetails(req.params.courseId, true);
  if (!result.success) return res.redirect("/admin/courses");

  res.render("pages/admin/courses/view-course", {
    title: `Velora - View Course: ${result.data.course.title}`,
    isLoggedIn: true,
    isAdmin: true,
    ...result.data
  });
};

exports.postAdminEditCourse = async (req, res) => {
  const result = await courseService.updateCourse(req.params.courseId, req.body, req.files, req.fileValidationError);

  if (!result.success) {
    if (result.errors.general === "Course not found") {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    return res.status(400).json({ success: false, message: 'Failed to update course', errors: result.errors, formData: req.body });
  }

  return res.status(200).json({ success: true, message: `Course '${result.data.course.title}' updated successfully`, courseId: req.params.courseId });
};

exports.postAdminDeleteCourse = async (req, res) => {
  const result = await courseService.deleteCourse(req.params.courseId);

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.errors.general || 'Failed to delete course' });
  }

  return res.status(200).json({ success: true, message: `Course '${result.data.courseTitle}' deleted successfully` });
};

exports.getAdminCoursePublish = async (req, res) => {
  const result = await courseService.getAdminCoursePublishData(req.params.courseId);

  if (!result.success) {
    return res.redirect("/admin/courses");
  }

  res.render("pages/admin/courses/publish", {
    title: "Velora - Publish Course",
    activePage: "courses",
    isLoggedIn: true,
    isAdmin: true,
    course: result.data.course,
    modules: result.data.modules,
    lessons: result.data.lessons,
    totalDurationFormatted: result.data.totalDurationFormatted,
    errors: {},
    canPublish: result.data.canPublish
  });
};

exports.postAdminCoursePublish = async (req, res) => {
  const result = await courseService.publishCourse(req.params.courseId, req.body);

  if (!result.success) {
    if (result.errors.general === "Course not found" || result.errors.general === "Failed to publish course") {
      return res.status(400).json({ success: false, message: result.errors.general });
    }
    return res.status(400).json({ success: false, message: 'Validation failed', errors: result.errors, formData: req.body });
  }

  const successMsg = result.data.isPublishing
    ? "Course '" + result.data.courseTitle + "' published successfully"
    : "Course '" + result.data.courseTitle + "' moved back to draft";
    
  return res.status(200).json({ success: true, message: successMsg });
};

exports.postAdminToggleCourseStatus = async (req, res) => {
  const result = await courseService.toggleCourseStatus(req.params.courseId);

  if (!result.success) {
    const errorMsg = Object.values(result.errors)[0] || "Failed to change course status";
    return res.status(400).json({ success: false, message: errorMsg });
  }

  const successMsg = result.data.isPublishing
    ? "Course '" + result.data.courseTitle + "' published successfully"
    : "Course '" + result.data.courseTitle + "' moved back to draft";
    
  return res.status(200).json({ success: true, message: successMsg });
};

exports.getCourses=async(req,res)=>{
  const result=await courseService.getCourse(req.query);

  if(!result.success){
   return res.redirect("/courses");
  }

  return res.render("pages")
}