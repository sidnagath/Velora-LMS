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

exports.postAdminEditLesson =
async (req, res) => {

  try {

    // FORM DATA

    let {
      title,
      description,
      duration,
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

    // LESSON

    const lesson =

      await Lesson.findOne({

        _id:
          req.params.lessonId,

        moduleId:
          req.params.moduleId

      });

    // VALIDATION

    if (
      !course ||
      !module ||
      !lesson
    ) {

      return res.redirect(

        `/admin-courses/${req.params.courseId}/modules`

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


    // VIDEO TYPE

    if (video) {

      const allowedVideoTypes = [

        "video/mp4",

        "video/quicktime"

      ];

      if (

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
        video.size >
        maxVideoSize
      ) {

        errors.video =
          "Video exceeds 500MB";

      }

    }

    // IF ERRORS
    if (Object.keys(errors).length > 0) {
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(400).json({ success: false, errors });
      }
      return res.render("pages/admin/courses/add-lesson", {
        title: "Velora - Edit Lesson",
        activePage: "courses",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        course,
        module,
        lesson,
        errors,
        formData: { title, description }
      });
    }

    // UPDATE
    lesson.title = title;
    lesson.description = description;
    if (duration) lesson.duration = duration;

    // OPTIONAL VIDEO
    if (video) {
      lesson.video = "/uploads/" + video.filename;
    }

    // SAVE
    await lesson.save();

    if (req.xhr || req.headers.accept.includes('json')) {
      return res.json({ success: true, lesson });
    }

    // REDIRECT
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: "Something went wrong" });
    }
    return res.render("pages/admin/courses/add-lesson", {
      title: "Velora - Edit Lesson",
      activePage: "courses",
      isLoggedIn: true,
      isAdmin: true,
      isEdit: true,
      course: { _id: req.params.courseId },
      module: { _id: req.params.moduleId },
      lesson: { _id: req.params.lessonId },
      errors: { general: "Something went wrong" },
      formData: { title: req.body.title, description: req.body.description }
    });
  }

};

exports.postAdminDeleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.lessonId, moduleId: req.params.moduleId });
    if (!lesson) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(404).json({ success: false, error: "Lesson not found" });
      }
      req.flash("error", "Lesson not found");
      return res.redirect(`/admin-courses/${req.params.courseId}/modules`);
    }

    await Lesson.findByIdAndDelete(req.params.lessonId);

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

