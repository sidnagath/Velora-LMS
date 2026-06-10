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

exports.getAdminCourseModules =
async (req, res) => {

  try {

    //GET COURSE
    const course =
      await Course.findById(
        req.params.courseId
      );



    if (!course) {

      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }


    // GET MODULES

    const modules =
      await Module.find({
        courseId:
        req.params.courseId
      })
      .sort({
      order: 1
      });


    // GET LESSONS
    const lessons = await Lesson.find({
      moduleId: { $in: modules.map(module => module._id) }
    }).sort({ order: 1 });

    // GET RESOURCES
    const resources = await Resource.find({
      courseId: req.params.courseId
    });

    res.render("pages/admin/courses/modules", {
      title: "Velora - Course Curriculum",
      isLoggedIn: true,
      isAdmin: true,
      course,
      modules,
      lessons,
      resources,
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success",
      errors: {},
      formData: {}
    });

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.postAdminAddModule =
async (req, res) => {

  try {

    let {
      title,
      description
    } = req.body;

    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

    // COURSE

    const course =
      await Course.findById(
        req.params.courseId
      );

    if (!course) {

      return res.redirect(
        "/admin-courses"
      );

    }

    // ERRORS

    let errors = {};

    // TITLE

    if (!title) {

      errors.title =
        "Enter module title";

    }

    else if (
      title.length < 3
    ) {

      errors.title =
        "Module title must be at least 3 characters";

    }

    // DESCRIPTION

    if (!description) {

      errors.description =
        "Enter module description";

    }

    // IF ERRORS
    if (Object.keys(errors).length > 0) {
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors });
      }
      return res.render("pages/admin/courses/add-module", {
        title: "Velora - Add Module",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: false,
        course,
        module: {}, 
        errors,
        formData: { title, description }
      });
    }

    // MODULE ORDER
    const moduleCount = await Module.countDocuments({ courseId: req.params.courseId });

    // CREATE MODULE
    const newModule = await Module.create({
      courseId: req.params.courseId,
      title,
      description,
      order: moduleCount + 1
    });

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, module: newModule });
    }

    // REDIRECT
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-module", {
      title: "Velora - Add Module",
      activePage: "courses",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: false,
      course: {},
      module: {}, 
      errors: { general: "Something went wrong" },
      formData: { title: req.body.title, description: req.body.description }
    });
  }

};

exports.postAdminEditModule =
async (req, res) => {

  try {

    // FORM DATA

    let {
      title,
      description
    } = req.body;

    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

    // COURSE

    const course =

      await Course.findById(
        req.params.courseId
      );

    // MODULE

    const module =

      await Module.findOne({

        _id:
          req.params.moduleId,

        courseId:
          req.params.courseId

      });

    // VALIDATION

    if (!course || !module) {

      return res.redirect(
        "/admin-courses"
      );

    }

    // ERRORS

    let errors = {};

    // TITLE

    if (!title) {

      errors.title =
        "Enter module title";

    }

    else if (
      title.length < 3
    ) {

      errors.title =
        "Module title must be at least 3 characters";

    }

    // DESCRIPTION

    if (!description) {

      errors.description =
        "Enter module description";

    }

    // IF ERRORS
    if (Object.keys(errors).length > 0) {
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors });
      }
      return res.render("pages/admin/courses/add-module", {
        title: "Velora - Edit Module",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        course,
        module,
        errors,
        formData: { title, description }
      });
    }

    // UPDATE MODULE
    module.title = title;
    module.description = description;
    await module.save();

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, module });
    }

    // REDIRECT
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-module", {
      title: "Velora - Edit Module",
      activePage: "courses",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: true,
      course: {},
      module: {},
      errors: { general: "Something went wrong" },
      formData: { title: req.body.title, description: req.body.description }
    });
  }

};

exports.postAdminDeleteModule = async (req, res) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(404).json({ success: false, error: "Module not found" });
      }
      req.flash("error","Module not found");
      return res.redirect("/admin-courses");
    }
    await Module.findByIdAndDelete(req.params.moduleId);
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
}






exports.postAdminAddLesson =
async (req, res) => {

  try {

    let {
      title,
      description,
      duration
    } = req.body;

 
    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

    duration =
      duration?.toString().trim();


    // VIDEO

    const video =
      req.file;

    // MODULE

    const module =

      await Module.findOne({

        _id:
          req.params.moduleId,

        courseId:
          req.params.courseId

      });

    if (!module) {

      return res.redirect(
        "/admin-courses"
      );

    }

    // ERRORS

    let errors = {};

    // TITLE

    if (!title) {

      errors.title =
        "Enter lesson title";

    }

    else if (
      title.length < 3
    ) {

      errors.title =
        "Lesson title must be at least 3 characters";

    }

    // DESCRIPTION

    if (!description) {

      errors.description =
        "Enter lesson description";

    }

    

    // VIDEO

    if (!video) {

      errors.video =
        "Upload lesson video";

    }

    // VIDEO TYPE

    const allowedVideoTypes = [

      "video/mp4",

      "video/quicktime"

    ];

    if (

      video &&

      !allowedVideoTypes.includes(
        video.mimetype
      )

    ) {

      errors.video =
        "Video must be MP4 or MOV";

    }

    // VIDEO SIZE

    const maxVideoSize =
      500 * 1024 * 1024;

    if (

      video &&

      video.size >
      maxVideoSize

    ) {

      errors.video =
        "Video exceeds 500MB";

    }

    // IF ERRORS
    if (Object.keys(errors).length > 0) {
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors });
      }
      return res.render("pages/admin/courses/add-lesson", {
        title: "Velora - Add Lesson",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: false,
        course: { _id: req.params.courseId },
        module,
        lesson: null,
        errors,
        formData: { title, description }
      });
    }

    // LESSON ORDER
    const lessonCount = await Lesson.countDocuments({ moduleId: req.params.moduleId });

    // CREATE LESSON
    const newLesson = await Lesson.create({
      moduleId: req.params.moduleId,
      title,
      description,
      duration: duration || null,
      video: "/uploads/" + video.filename,
      order: lessonCount + 1
    });

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, lesson: newLesson });
    }

    // REDIRECT
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-lesson", {
      title: "Velora - Add Lesson",
      activePage: "courses",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: false,
      course: { _id: req.params.courseId },
      module: { _id: req.params.moduleId },

        lesson: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {

          title:
            req.body.title,

          description:
            req.body.description

        }

      }

    );

  }

};

