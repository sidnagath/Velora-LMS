const lessonService = require('../../services/lessonService');
const Module = require('../../models/moduleModel');

exports.postAdminAddLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.addLesson(req.params.courseId, req.params.moduleId, title, description, duration, req.file);

    if (!result.success) {
      if (result.status === 404) return res.redirect("/admin-courses");

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors: result.errors });
      }
      
      // Need module object for the template
      const module = await Module.findOne({ _id: req.params.moduleId });
      return res.render("pages/admin/courses/add-lesson", {
        title: "Velora - Add Lesson",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: false,
        course: { _id: req.params.courseId },
        module,
        lesson: null,
        errors: result.errors,
        formData: { title: title?.trim(), description: description?.trim() }
      });
    }

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, lesson: result.lesson });
    }

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-lesson", {
      title: "Velora - Add Lesson", activePage: "courses", isLoggedIn: true, isAdmin: true, isEdit: false,
      course: { _id: req.params.courseId }, module: { _id: req.params.moduleId }, lesson: null,
      errors: { general: "Something went wrong" }, formData: { title: req.body.title, description: req.body.description }
    });
  }
};

exports.postAdminEditLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.editLesson(req.params.courseId, req.params.moduleId, req.params.lessonId, title, description, duration, req.file);

    if (!result.success) {
      if (result.status === 404) return res.redirect(`/admin-courses/${req.params.courseId}/modules`);

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors: result.errors });
      }
      
      const module = await Module.findOne({ _id: req.params.moduleId });
      return res.render("pages/admin/courses/add-lesson", {
        title: "Velora - Edit Lesson",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        course: { _id: req.params.courseId },
        module,
        lesson: { _id: req.params.lessonId },
        errors: result.errors,
        formData: { title: title?.trim(), description: description?.trim() }
      });
    }

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, lesson: result.lesson });
    }

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-lesson", {
      title: "Velora - Edit Lesson", activePage: "courses", isLoggedIn: true, isAdmin: true, isEdit: true,
      course: { _id: req.params.courseId }, module: { _id: req.params.moduleId }, lesson: { _id: req.params.lessonId },
      errors: { general: "Something went wrong" }, formData: { title: req.body.title, description: req.body.description }
    });
  }
};

exports.postAdminDeleteLesson = async (req, res) => {
  try {
    const result = await lessonService.deleteLesson(req.params.courseId, req.params.moduleId, req.params.lessonId);
    if (!result.success) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(404).json({ success: false, error: result.error });
      }
      req.flash("error", result.error);
      return res.redirect(`/admin-courses/${req.params.courseId}/modules`);
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.json({ success: true });
    }

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    res.redirect("/admin-courses");
  }
};
