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

exports.getAdminCourses =
async (req, res) => {

  try {

    // SEARCH
    const search = req.query.search?.trim() || "";

    // FILTERS
    const filterStatus   = req.query.status   || "";
    const filterLevel    = req.query.level    || "";
    const filterCategory = req.query.category || "";
    const sortBy         = req.query.sortBy   || "newestUpdated";

    // PAGE
    const page  = Number(req.query.page) || 1;
    const LIMIT = 10;
    const skip  = (page - 1) * LIMIT;

    // BUILD FILTER
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { level: { $regex: search, $options: "i" } }
      ];
    }

    if (filterStatus)   filter.status   = filterStatus;
    if (filterLevel)    filter.level    = filterLevel;
    if (filterCategory) {
      if (mongoose.Types.ObjectId.isValid(filterCategory)) {
        filter.category = filterCategory;
      } else {
        filter.category = new mongoose.Types.ObjectId();
      }
    }

    // BUILD SORT
    const sortMap = {
      newestUpdated: { updatedAt: -1 },
      oldestUpdated: { updatedAt:  1 },
      titleAZ:       { title:      1 },
      titleZA:       { title:     -1 }
    };
    const sort = sortMap[sortBy] || { updatedAt: -1 };

    // QUERY
    const [courses, totalCourses] = await Promise.all([
      Course.find(filter).populate("category").sort(sort).skip(skip).limit(LIMIT),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / LIMIT);

    const publishedCourses  = await Course.countDocuments({ status: "published" });
    const draftCourses      = await Course.countDocuments({ status: "draft" });
    const instructorsCount  = await Course.distinct("instructor");

    // Gather all active categories for the filter dropdown
    const allCategories = await Category.find({ status: "active" }).sort({ name: 1 });

    // RENDER
    res.render("pages/admin/courses/courses", {
      title: "Velora - Course Management",
      isLoggedIn: true,
      isAdmin: true,
      courses,
      search,
      currentPage: page,
      totalPages,
      totalCourses,
      publishedCourses,
      draftCourses,
      instructorsCount: instructorsCount.length,
      allCategories,
      LIMIT,
      filterStatus,
      filterLevel,
      filterCategory,
      sortBy,
      success: req.query.success || "",
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success",
      errors: {}
    });

  } catch (err) {
    console.log(err);
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
      errors: { general: "Something went wrong. Please try again." }
    });
  }

};

exports.getAdminCreateCourse =
async (req, res) => {
  try {
    const categories = await Category.find({ status: "active" }).sort({ name: 1 });

    res.render(
      "pages/admin/courses/basic-info",
      {
        title: "Velora - Create Course",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: false,
        course: {},
        categories,
        errors: {},
        formData: {}
      }
    );
  } catch (err) {
    console.log(err);
    res.redirect("/admin-courses");
  }
};

exports.postAdminCreateCourse =
async (req, res) => {

  try {

    let {
      title,
      description,
      category,
      instructor,
      level
    } = req.body;

    // TRIM

    title = title?.trim();

    description =
      description?.trim();

    category =
      category?.trim();

    instructor =
      instructor?.trim();

    level =
      level?.trim();

    // FILES

    const thumbnailFile =
      req.files?.thumbnail?.[0];

    const trailerFile =
      req.files?.trailer?.[0];

    // ERRORS

    let errors = {};

    // VALIDATION

    if (!title) {

      errors.title =
        "Enter course title";

    }

    if (!description) {

      errors.description =
        "Enter course description";

    }

    if (!category) {

      errors.category =
        "Select category";

    } else if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.category = "Invalid category format";
    }

    if (!instructor) {

      errors.instructor =
        "Enter instructor name";

    }

    if (!level) {

      errors.level =
        "Select course level";

    }

    if (!thumbnailFile) {

      errors.thumbnail =
        "Upload thumbnail";

    }

    if (!trailerFile) {

      errors.trailer =
        "Upload trailer";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {
      const categories = await Category.find({ status: "active" }).sort({ name: 1 });
      return res.render(

        "pages/admin/courses/basic-info",

        {

          title:
            "Velora - Create Course",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: false,

          course: {},

          errors,

          categories,

          formData: {

            title,
            description,
            category,
            instructor,
            level

          }

        }

      );

    }

    // FILE PATHS

    const thumbnailPath =

      "/uploads/" +
      thumbnailFile.filename;

    const trailerPath =

      "/uploads/" +
      trailerFile.filename;

    // CREATE COURSE

    const course =

      await Course.create({

        title,

        description,

        category,

        instructor,

        level,

        thumbnail:
          thumbnailPath,

        trailer:
          trailerPath,

        status: "draft"

      });

    // REDIRECT

    res.redirect(

      `/admin-courses/${course._id}/modules?flashType=success&flashMsg=` + encodeURIComponent("Course '" + title + "' created successfully")

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.getAdminEditCourse =
async (req, res) => {

  try {

    // GET COURSE

    const course =

      await Course.findById(
        req.params.courseId
      );

    // NOT FOUND

    if (!course) {

      return res.redirect(
        "/admin-courses"
      );

    }

    // RENDER

    const categories = await Category.find({ status: "active" }).sort({ name: 1 });

    res.render(

      "pages/admin/courses/basic-info",

      {

        title:
          "Velora - Edit Course",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

        categories,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/courses",

      {

        title:
          "Velora - Course Management",

        isLoggedIn: true,

        isAdmin: true,

        courses: [],

        search: "",

        errors: {

          general:
            "Failed to load course"

        }

      }

    );

  }

};

exports.postAdminEditCourse =
async (req, res) => {

  try {

    // BODY

    let {
      title,
      description,
      category,
      instructor,
      level
    } = req.body;

    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

    category =
      category?.trim();

    instructor =
      instructor?.trim();

    level =
      level?.trim();

    // FILES

    const thumbnailFile =
      req.files?.thumbnail?.[0];

    const trailerFile =
      req.files?.trailer?.[0];

    // EXISTING COURSE

    const existingCourse =
      await Course.findById(
        req.params.courseId
      );

    // ERRORS

    let errors = {};

    // REQUIRED VALIDATION

    if (!title) {

      errors.title =
        "Enter course title";

    }

    if (!description) {

      errors.description =
        "Enter course description";

    }

    if (!category) {

      errors.category =
        "Select category";

    } else if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.category = "Invalid category format";
    }

    if (!instructor) {

      errors.instructor =
        "Enter instructor name";

    }

    if (!level) {

      errors.level =
        "Select course level";

    }

    // THUMBNAIL

    if (
      !thumbnailFile &&
      !existingCourse.thumbnail
    ) {

      errors.thumbnail =
        "Upload thumbnail image";

    }

    // TRAILER

    if (
      !trailerFile &&
      !existingCourse.trailer
    ) {

      errors.trailer =
        "Upload trailer video";

    }

    // TITLE LENGTH

    if (
      title &&
      title.length < 5
    ) {

      errors.title =
        "Title must be minimum 5 characters";

    }

    // INSTRUCTOR

    const instructorRegex =
      /^[A-Za-z ]{3,30}$/;

    if (
      instructor &&
      !instructorRegex.test(
        instructor
      )
    ) {

      errors.instructor =
        "Instructor name is invalid";

    }

    // LEVEL

    const allowedLevels = [

      "Beginner",

      "Intermediate",

      "Advanced"

    ];

    if (
      level &&
      !allowedLevels.includes(level)
    ) {

      errors.level =
        "Invalid course level";

    }

    // IMAGE TYPES

    const allowedImageTypes = [

      "image/jpeg",

      "image/png",

      "image/webp"

    ];

    if (

      thumbnailFile &&

      !allowedImageTypes.includes(
        thumbnailFile.mimetype
      )

    ) {

      errors.thumbnail =
        "Thumbnail must be JPG, PNG or WEBP";

    }

    // VIDEO TYPES

    const allowedVideoTypes = [

      "video/mp4",

      "video/quicktime"

    ];

    if (

      trailerFile &&

      !allowedVideoTypes.includes(
        trailerFile.mimetype
      )

    ) {

      errors.trailer =
        "Trailer must be MP4 or MOV";

    }

    // FILE SIZE

    const maxThumbnailSize =
      5 * 1024 * 1024;

    const maxTrailerSize =
      100 * 1024 * 1024;

    if (

      thumbnailFile &&

      thumbnailFile.size >
      maxThumbnailSize

    ) {

      errors.thumbnail =
        "Thumbnail exceeds 5MB";

    }

    if (

      trailerFile &&

      trailerFile.size >
      maxTrailerSize

    ) {

      errors.trailer =
        "Trailer exceeds 100MB";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {
      const categories = await Category.find({ status: "active" }).sort({ name: 1 });
      return res.render(

        "pages/admin/courses/basic-info",

        {

          title:
            "Velora - Course Basic Info",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: true,

          errors,

          categories,

          course:
            existingCourse,

          formData: {

            title,

            description,

            category,

            instructor,

            level

          }

        }

      );

    }

    // FILE PATHS

    const thumbnailPath =

      thumbnailFile

      ? "/uploads/" +
        thumbnailFile.filename

      : existingCourse.thumbnail;

    const trailerPath =

      trailerFile

      ? "/uploads/" +
        trailerFile.filename

      : existingCourse.trailer;

    // CREATE
const course =
await Course.findByIdAndUpdate(
  req.params.courseId,
  {
    title,
    description,
    category,
    instructor,
    level,
    thumbnail: thumbnailPath,
    trailer: trailerPath,
    status: existingCourse.status || "draft"
  },
  { new: true }
);

    res.redirect(

      `/admin-courses/${req.params.courseId}/modules?flashType=success&flashMsg=` + encodeURIComponent("Course '" + title + "' updated successfully")

    );

  }

  catch (err) {

  console.log(err);

  const existingCourse =
    await Course.findById(
      req.params.courseId
    );

  const categories =
    await Category.find({
      status: "active"
    }).sort({ name: 1 });

  return res.render(

    "pages/admin/courses/basic-info",

    {

      title:
        "Velora - Course Basic Info",

      isLoggedIn: true,

      isAdmin: true,

      isEdit: true,

      course:
        existingCourse,

      categories,

      errors: {

        general:
          "Something went wrong"

      },

      formData: {

        title:
          req.body.title,

        description:
          req.body.description,

        category:
          req.body.category,

        instructor:
          req.body.instructor,

        level:
          req.body.level

      }

    }

  );

}

};

exports.postAdminDeleteCourse =
async (req, res) => {

  try {
    const courseId =
      req.params.courseId;

    // CHECK COURSE
    const course =
    await Course.findById(
        courseId
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


    // GET MODULES OF COURSE
    const modules =
      await Module.find({courseId});
    const moduleIds =modules.map(module => module._id);


    // GET LESSONS OF MODULES
    const lessons =
      await Lesson.find({
        moduleId: {
          $in: moduleIds
        }
      });



    const lessonIds =
      lessons.map(lesson => lesson._id);

    // DELETE RESOURCES
    await Resource.deleteMany({
      lessonId: { $in: lessonIds}
    });

    // DELETE LESSONS
    await Lesson.deleteMany({
      moduleId: {
       $in: moduleIds
      }
    });


    // DELETE MODULES
    await Module.deleteMany({
      courseId
    });

    // DELETE COURSE
    await Course.findByIdAndDelete(
      courseId
    );


    res.redirect(
      "/admin-courses?flashType=success&flashMsg=" + encodeURIComponent("Course '" + course.title + "' deleted successfully")
    );
  }

  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};

exports.getAdminCoursePublish =
async (req, res) => {

  try {

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

    // MODULES

    const modules =

      await Module.find({

        courseId:
          req.params.courseId

      });

    // LESSONS

    const lessons =

      await Lesson.find({

        moduleId: {

          $in:
            modules.map(
              m => m._id
            )

        }

      });

    // PUBLISH CHECK

    const canPublish =

      modules.length > 0 &&

      lessons.length > 0 &&

      course.title &&

      course.description &&

      course.thumbnail &&

      course.trailer;

    // RENDER

    res.render(

      "pages/admin/courses/publish",

      {

        title:
          "Velora - Publish Course",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        course,

        modules,

        lessons,

        errors: {},

        canPublish

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.postAdminCoursePublish =
async (req, res) => {

  try {

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

    // MODULES

    const modules =

      await Module.find({

        courseId:
          course._id

      });

    // LESSONS

    const lessons =

      await Lesson.find({

        moduleId: {

          $in:
            modules.map(
              module => module._id
            )

        }

      });

    // FORM DATA

    const {

      pricingType,

      currency,

      basePrice,

      discountPrice,

      lifetimeAccess,

      downloadableResources,

      completionCertificate,

      publishStatus

    } = req.body;

    // CHECK IF PUBLISHING

    const isPublishing =

      publishStatus ===
      "Published (Live Now)";

    // ERRORS

    let errors = {};

    // VALIDATE ONLY WHEN PUBLISHING

    if (isPublishing) {

      if (

        modules.length === 0

      ) {

        errors.general =

          "Add at least one module before publishing";

      }

      else if (

        lessons.length === 0

      ) {

        errors.general =

          "Add at least one lesson before publishing";

      }

      else if (

        !course.title

      ) {

        errors.general =

          "Course title missing";

      }

      else if (

        !course.description

      ) {

        errors.general =

          "Course description missing";

      }

      else if (

        !course.thumbnail

      ) {

        errors.general =

          "Course thumbnail missing";

      }

      else if (

        !course.trailer

      ) {

        errors.general =

          "Course trailer missing";

      }

    }

    // RETURN WITH ERRORS

    if (

      Object.keys(errors).length > 0

    ) {

      return res.render(

        "pages/admin/courses/publish",

        {

          title:
            "Velora - Publish Course",

          activePage:
            "courses",

          isLoggedIn: true,

          isAdmin: true,

          course,

          modules,

          lessons,

          canPublish: false,

          errors,

          formData: req.body

        }

      );

    }

    // SAVE SETTINGS

    course.pricingType =

      pricingType || "paid";

    course.currency =

      currency || "INR";

    course.basePrice =

      pricingType === "free"

      ? 0

      : Number(
          basePrice || 0
        );

    course.discountPrice =

      pricingType === "free"

      ? 0

      : Number(
          discountPrice || 0
        );

    course.lifetimeAccess =

      lifetimeAccess === "on" ||

      lifetimeAccess === true;

    course.downloadableResources =

      downloadableResources === "on" ||

      downloadableResources === true;

    course.completionCertificate =

      completionCertificate === "on" ||

      completionCertificate === true;

    // STATUS

    course.status =

      isPublishing

      ? "published"

      : "draft";

    // SAVE

    await course.save();

    // SUCCESS

    const successMsg = isPublishing
      ? "Course '" + course.title + "' published successfully"
      : "Course '" + course.title + "' moved back to draft";
    res.redirect(
      "/admin-courses?flashType=success&flashMsg=" + encodeURIComponent(successMsg)
    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

