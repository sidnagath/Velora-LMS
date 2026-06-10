const moduleService = require('../../services/moduleService');

exports.getAdminCourseModules = async (req, res) => {
  try {
    const result = await moduleService.getCourseModules(req.params.courseId);
    if (!result.success) {
      req.flash("error", result.error || "Course not found");
      return res.redirect("/admin-courses");
    }

    res.render("pages/admin/courses/modules", {
      title: "Velora - Course Curriculum",
      isLoggedIn: true,
      isAdmin: true,
      course: result.course,
      modules: result.modules,
      lessons: result.lessons,
      resources: result.resources,
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success",
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    res.redirect("/admin-courses");
  }
};

exports.postAdminAddModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await moduleService.addModule(req.params.courseId, title, description);

    if (!result.success) {
      if (result.status === 404) return res.redirect("/admin-courses");

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors: result.errors });
      }
      return res.render("pages/admin/courses/add-module", {
        title: "Velora - Add Module",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: false,
        course: { _id: req.params.courseId },
        module: {}, 
        errors: result.errors,
        formData: { title: title?.trim(), description: description?.trim() }
      });
    }

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, module: result.module });
    }

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-module", {
      title: "Velora - Add Module", activePage: "courses", isLoggedIn: true, isAdmin: true, isEdit: false,
      course: {}, module: {}, errors: { general: "Something went wrong" }, formData: { title: req.body.title, description: req.body.description }
    });
  }
};

exports.postAdminEditModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await moduleService.editModule(req.params.courseId, req.params.moduleId, title, description);

    if (!result.success) {
      if (result.status === 404) return res.redirect("/admin-courses");

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors: result.errors });
      }
      return res.render("pages/admin/courses/add-module", {
        title: "Velora - Edit Module",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        course: { _id: req.params.courseId },
        module: { _id: req.params.moduleId },
        errors: result.errors,
        formData: { title: title?.trim(), description: description?.trim() }
      });
    }

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, module: result.module });
    }

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-module", {
      title: "Velora - Edit Module", activePage: "courses", isLoggedIn: true, isAdmin: true, isEdit: true,
      course: {}, module: {}, errors: { general: "Something went wrong" }, formData: { title: req.body.title, description: req.body.description }
    });
  }
};

exports.postAdminDeleteModule = async (req, res) => {
  try {
    const result = await moduleService.deleteModule(req.params.courseId, req.params.moduleId);
    if (!result.success) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(404).json({ success: false, error: result.error });
      }
      req.flash("error", result.error);
      return res.redirect("/admin-courses");
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.json({ success: true });
    }
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch(err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    res.redirect("/admin-courses");
  }
};
