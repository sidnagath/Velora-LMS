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
    return res.redirect("/admin-courses");
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
    if (result.errors.general === "Failed to create course.") {
      return res.redirect("/admin-courses");
    }
    return res.render("pages/admin/courses/basic-info", {
      title: "Velora - Create Course",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: false,
      course: {},
      errors: result.errors,
      categories: result.data.categories,
      formData: req.body
    });
  }

  const courseTitle = result.data.course.title;
  res.redirect(`/admin-courses/${result.data.course._id}/modules?flashType=success&flashMsg=` + encodeURIComponent("Course '" + courseTitle + "' created successfully"));
};

exports.getAdminEditCourse = async (req, res) => {
  const result = await courseService.getAdminEditCourseData(req.params.courseId);

  if (!result.success) {
    if (result.errors.general === "Course not found.") {
      return res.redirect("/admin-courses");
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
  if (!result.success) return res.redirect("/admin-courses");

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
      return res.redirect("/admin-courses");
    }

    // Validation errors or something went wrong
    if (result.data) {
      return res.render("pages/admin/courses/basic-info", {
        title: "Velora - Course Basic Info",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        errors: result.errors,
        categories: result.data.categories,
        course: result.data.course,
        formData: req.body
      });
    }

    // general catch
    return res.render("pages/admin/courses/basic-info", {
      title: "Velora - Course Basic Info",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: true,
      course: {}, // Ideally passed but fallback here
      categories: [],
      errors: result.errors,
      formData: req.body
    });
  }

  const courseTitle = result.data.course.title;
  res.redirect(`/admin-courses/${req.params.courseId}/modules?flashType=success&flashMsg=` + encodeURIComponent("Course '" + courseTitle + "' updated successfully"));
};

exports.postAdminDeleteCourse = async (req, res) => {
  const result = await courseService.deleteCourse(req.params.courseId);

  if (!result.success) {
    if (req.flash) {
        req.flash("error", result.errors.general);
    }
    return res.redirect("/admin-courses");
  }

  res.redirect("/admin-courses?flashType=success&flashMsg=" + encodeURIComponent("Course '" + result.data.courseTitle + "' deleted successfully"));
};

exports.getAdminCoursePublish = async (req, res) => {
  const result = await courseService.getAdminCoursePublishData(req.params.courseId);

  if (!result.success) {
    return res.redirect("/admin-courses");
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
      return res.redirect("/admin-courses");
    }

    return res.render("pages/admin/courses/publish", {
      title: "Velora - Publish Course",
      activePage: "courses",
      isLoggedIn: true,
      isAdmin: true,
      course: result.data.course,
      modules: result.data.modules,
      lessons: result.data.lessons,
      totalDurationFormatted: result.data.totalDurationFormatted,
      canPublish: false,
      errors: result.errors,
      formData: req.body
    });
  }

  const successMsg = result.data.isPublishing
    ? "Course '" + result.data.courseTitle + "' published successfully"
    : "Course '" + result.data.courseTitle + "' moved back to draft";
    
  res.redirect("/admin-courses?flashType=success&flashMsg=" + encodeURIComponent(successMsg));
};

exports.postAdminToggleCourseStatus = async (req, res) => {
  const result = await courseService.toggleCourseStatus(req.params.courseId);
  let redirectUrl = req.body.redirectUrl || '/admin-courses';

  try {
    const urlObj = new URL(redirectUrl, 'http://localhost');
    urlObj.searchParams.delete('flashType');
    urlObj.searchParams.delete('flashMsg');
    redirectUrl = urlObj.pathname + urlObj.search;
  } catch (err) {
    redirectUrl = '/admin-courses';
  }

  if (!result.success) {
    const errorMsg = Object.values(result.errors)[0] || "Failed to change course status";
    const separator = redirectUrl.includes('?') ? '&' : '?';
    return res.redirect(`${redirectUrl}${separator}flashType=error&flashMsg=${encodeURIComponent(errorMsg)}`);
  }

  const successMsg = result.data.isPublishing
    ? "Course '" + result.data.courseTitle + "' published successfully"
    : "Course '" + result.data.courseTitle + "' moved back to draft";
    
  const separator = redirectUrl.includes('?') ? '&' : '?';
  res.redirect(`${redirectUrl}${separator}flashType=success&flashMsg=${encodeURIComponent(successMsg)}`);
};




exports.getCourses=async(req,res)=>{



  const result=await courseService.getCourse(req.query);


  if(!result.success){
   return res.redirect("/courses");
  }


  return res.render("pages")

}