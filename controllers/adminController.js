const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Lesson = require("../models/lessonModel");
const Resource = require("../models/resourceModel");

exports.getAdminLogin = (req, res) => {

  if (req.session.user) {

    return res.redirect(
      "/user-dashboard"
    );

  }

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  res.render(
    "pages/guest/admin-login",
    {
      title:
        "Velora - Admin Login",

      isLoggedIn: false,

      errors: {},

      formData: {}

    }
  );

};


exports.getAdminLogin = (req, res) => {

  if (req.session.user) {

    return res.redirect(
      "/user-dashboard"
    );

  }

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  res.render(
    "pages/guest/admin-login",
    {
      title:
        "Velora - Admin Login",

      isLoggedIn: false,

      errors: {},

      formData: {}

    }
  );

};

exports.postAdminLogin =
async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
      password?.trim();

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    if (!trimmedPassword) {

      errors.password =
        "Password is required";

    }

    // IF REQUIRED ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors,

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // FIND ADMIN

    const admin =
      await Admin.findOne({
        email:
          trimmedEmail
      });

    if (!admin) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors: {

            email:
              "Invalid email or password"

          },

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // PASSWORD CHECK

    const isMatch =
      await bcrypt.compare(
        trimmedPassword,
        admin.password
      );

    if (!isMatch) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors: {

            password:
              "Invalid email or password"

          },

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // SESSION

    req.session.admin = {

      id:
        admin._id,

      email:
        admin.email

    };

    req.session.save(
      (err) => {

        if (err) {

          console.log(err);

          return res.render(
            "pages/guest/admin-login",
            {
              title:
                "Velora - Admin Login",

              isLoggedIn: false,

              errors: {

                general:
                  "Session error"

              },

              formData: {
                email:
                  trimmedEmail
              }
            }
          );

        }

        return res.redirect(
          "/admin-dashboard"
        );

      }
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/admin-login",
      {
        title:
          "Velora - Admin Login",

        isLoggedIn: false,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {
          email:
            req.body.email
        }
      }
    );

  }

};


exports.getAdminDashboard= (req, res) => {

const activities = [
    {
      name: "John Doe",
      email: "john@example.com",
      course: "React Mastery",
      status: "completed",
      amount: 120
    },
    {
      name: "Sarah Lee",
      email: "sarah@example.com",
      course: "Node.js Bootcamp",
      status: "pending",
      amount: 80
    }
  ];

    res.render('pages/admin/dashboard/dashboard', { 
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        activities,
        isAdmin: true
    });
  }


exports.getAdminUsers = async (req, res) => {

  try {

    // SEARCH
    const search =
      req.query.search || "";

    // PAGINATION
    const page =
      parseInt(req.query.page) || 1;

    const limit = 6;

    const skip =
      (page - 1) * limit;

    // FILTER
    const filter = {

      isDeleted: false,

      $or: [

        {
          name: {
            $regex: search,
            $options: "i"
          }
        },

        {
          email: {
            $regex: search,
            $options: "i"
          }
        },

        {
          status: {
            $regex: search,
            $options: "i"
          }
        }

      ]

    };

    // USERS
    const users =
      await User.find(filter)

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);

    // TOTAL USERS
    const totalUsers =
      await User.countDocuments(filter);

    // TOTAL PAGES
    const totalPages =
      Math.ceil(totalUsers / limit);

    res.render(
  "pages/admin/user-management/users",
  {

    title:
      "Velora - Admin Users",

    isLoggedIn: true,

    isAdmin: true,

    users,

    currentPage: page,

    totalPages,

    totalUsers,

    limit,

    search

  }
);

  }

  catch (err) {

    console.log(err);

    res.redirect("/admin-dashboard");

  }

};

exports.getAdminCreateUser = (
  req,
  res
) => {

  res.render(
    "pages/admin/user-management/create-user",
    {
      title:
        "Velora - Admin Create User",

      isLoggedIn: true,

      isAdmin: true,

      errors: {},

      formData: {}

    }
  );

};

exports.postAdminCreateUser =
async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      status
    } = req.body;

    // TRIM

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPhone =
      phone?.trim();

    const trimmedPassword =
      password?.trim();

    const trimmedConfirmPassword =
      confirmPassword?.trim();

    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
      /^[0-9]{10}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    // ERRORS

    let errors = {};

    // NAME

    if (!trimmedName) {

      errors.name =
        "Name is required";

    }

    else if (
      !nameRegex.test(
        trimmedName
      )
    ) {

      errors.name =
        "Name should contain only letters";

    }

    // EMAIL

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    else if (
      !emailRegex.test(
        trimmedEmail
      )
    ) {

      errors.email =
        "Invalid email format";

    }

    // PHONE

    if (
      trimmedPhone &&
      !phoneRegex.test(
        trimmedPhone
      )
    ) {

      errors.phone =
        "Enter valid 10 digit phone number";

    }

    // PASSWORD

    if (!trimmedPassword) {

      errors.password =
        "Password is required";

    }

    else if (
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      errors.password =
        "Password must contain uppercase letter, number and minimum 6 characters";

    }

    // CONFIRM PASSWORD

    if (
      !trimmedConfirmPassword
    ) {

      errors.confirmPassword =
        "Confirm Password is required";

    }

    else if (
      trimmedPassword !==
      trimmedConfirmPassword
    ) {

      errors.confirmPassword =
        "Passwords do not match";

    }

    // DUPLICATE EMAIL

    const existingUser =
      await User.findOne({

        email:
          trimmedEmail

      });

    if (existingUser) {

      errors.email =
        "Email already exists";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/admin/user-management/create-user",
        {
          title:
            "Velora - Create User",

          admin:
            req.session.admin,

          errors,

          formData: {

            name:
              trimmedName,

            email:
              trimmedEmail,

            phone:
              trimmedPhone,

            status

          }
        }
      );

    }

    // HASH PASSWORD

    const hashedPassword =
      await bcrypt.hash(
        trimmedPassword,
        10
      );

    // IMAGE

    let avatar = "";

    if (req.file) {

      avatar =
        "/uploads/" +
        req.file.filename;

    }

    // CREATE USER

    await User.create({

      name:
        trimmedName,

      email:
        trimmedEmail,

      phone:
        trimmedPhone,

      password:
        hashedPassword,

      status,

      avatar

    });

    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/admin/user-management/create-user",
      {
        title:
          "Velora - Create User",

        admin:
          req.session.admin,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {

          name:
            req.body.name,

          email:
            req.body.email,

          phone:
            req.body.phone,

          status:
            req.body.status

        }
      }
    );

  }

};



exports.getAdminEditUser =
async (req, res) => {

  try {

    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {

      return res.redirect(
        "/admin-users"
      );

    }

    res.render(
      "pages/admin/user-management/edit-user",
      {
        title:
          "Velora - Admin Edit User",

        isLoggedIn: true,

        isAdmin: true,

        user,

        errors: {},

        formData: {}

      }
    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-users"
    );

  }

};



exports.postAdminEditUser =
async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      status,
      password
    } = req.body;

    // TRIM

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
      password
      ? password.trim()
      : "";

    const trimmedPhone =
      phone
      ? String(phone).trim()
      : "";

    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
      /^[6-9]\d{9}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    // FIND USER

    const currentUser =
      await User.findById(
        req.params.id
      );

    if (!currentUser) {

      return res.redirect(
        "/admin-users"
      );

    }

    // ERRORS

    let errors = {};

    // GOOGLE ACCOUNT

    if (
      currentUser.authProvider ===
      "google"
    ) {

      if (
        trimmedPhone &&
        !phoneRegex.test(
          trimmedPhone
        )
      ) {

        errors.phone =
          "Enter valid 10 digit phone number";

      }

      if (
        Object.keys(errors).length > 0
      ) {

        return res.render(
          "pages/admin/user-management/edit-user",
          {
            title:
              "Velora - Admin Edit User",

            isLoggedIn: true,

            isAdmin: true,

            user: currentUser,

            errors,

            formData: {

              phone:
                trimmedPhone,

              status

            }
          }
        );

      }

      await User.findByIdAndUpdate(

        req.params.id,

        {
          phone:
            trimmedPhone,

          status
        }

      );

      return res.redirect(
        "/admin-users"
      );

    }

    // REQUIRED

    if (!trimmedName) {

      errors.name =
        "Name is required";

    }

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    // NAME

    if (
      trimmedName &&
      !nameRegex.test(
        trimmedName
      )
    ) {

      errors.name =
        "Name should contain only letters";

    }

    // EMAIL

    if (
      trimmedEmail &&
      !emailRegex.test(
        trimmedEmail
      )
    ) {

      errors.email =
        "Invalid email format";

    }

    // PHONE

    if (
      trimmedPhone &&
      !phoneRegex.test(
        trimmedPhone
      )
    ) {

      errors.phone =
        "Enter valid 10 digit phone number";

    }

    // PASSWORD

    if (
      trimmedPassword &&
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      errors.password =
        "Password must contain uppercase letter, number and minimum 6 characters";

    }

    // DUPLICATE EMAIL

    const existingUser =
      await User.findOne({

        email:
          trimmedEmail,

        _id: {
          $ne:
            req.params.id
        }

      });

    if (existingUser) {

      errors.email =
        "Email already exists";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/admin/user-management/edit-user",
        {
          title:
            "Velora - Admin Edit User",

          isLoggedIn: true,

          isAdmin: true,

          user: currentUser,

          errors,

          formData: {

            name:
              trimmedName,

            email:
              trimmedEmail,

            phone:
              trimmedPhone,

            status

          }
        }
      );

    }

    // UPDATE DATA

    const updateData = {

      name:
        trimmedName,

      email:
        trimmedEmail,

      phone:
        trimmedPhone,

      status

    };

    // AVATAR

    if (req.file) {

      updateData.avatar =
        "/uploads/" +
        req.file.filename;

    }

    // PASSWORD UPDATE

    if (trimmedPassword) {

      updateData.password =
        await bcrypt.hash(
          trimmedPassword,
          10
        );

    }

    // UPDATE USER

    await User.findByIdAndUpdate(

      req.params.id,

      updateData

    );

    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/admin/user-management/edit-user",
      {
        title:
          "Velora - Admin Edit User",

        isLoggedIn: true,

        isAdmin: true,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {

          name:
            req.body.name,

          email:
            req.body.email,

          phone:
            req.body.phone,

          status:
            req.body.status

        }
      }
    );

  }

};

exports.deleteUser = async (req, res) => {

  try {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        status: "inactive"
      }
    );

    res.redirect("/admin-users");

  } catch (err) {

    console.log(err);

    res.redirect("/admin-users");
  }
};

// Course Management Methods

exports.getAdminCourses =
async (req, res) => {

  try {

    // SEARCH

    const search =
      req.query.search?.trim();

    // PAGE

    const page =
      Number(req.query.page) || 1;

    // LIMIT

    const LIMIT = 12;

    // SKIP

    const skip =
      (page - 1) * LIMIT;

    // FILTER

    const filter = {};

    if (search) {

      filter.$or = [

        {

          title: {

            $regex: search,

            $options: "i"

          }

        },

        {

          category: {

            $regex: search,

            $options: "i"

          }

        },

        {

          level: {

            $regex: search,

            $options: "i"

          }

        }

      ];

    }

    // COURSES + COUNT

    const [

      courses,

      totalCourses

    ] = await Promise.all([

      Course.find(filter)

      .sort({

        updatedAt: -1

      })

      .skip(skip)

      .limit(LIMIT),

      Course.countDocuments(filter)

    ]);

    // TOTAL PAGES

    const totalPages =

      Math.ceil(
        totalCourses / LIMIT
      );

    // RENDER

    res.render(

      "pages/admin/courses/courses",

      {

        title:
          "Velora - Course Management",

        isLoggedIn: true,

        isAdmin: true,

        courses,

        search:
          search || "",

        currentPage:
          page,

        totalPages,

        totalCourses,

        LIMIT,

        errors: {}

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

        currentPage: 1,

        totalPages: 1,

        totalCourses: 0,

        LIMIT: 12,

        errors: {

          general:
            "Failed to load courses"

        }

      }

    );

  }

};

exports.getAdminCreateCourse =
(req, res) => {

  res.render(

    "pages/admin/courses/basic-info",

    {

      title:
        "Velora - Create Course",

      isLoggedIn: true,

      isAdmin: true,

      isEdit: false,

      course: {},

      errors: {},

      formData: {}

    }

  );

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

      `/admin-courses/${course._id}/modules`

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};



//Delete Course

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

    req.flash(
      "success",
      "Course deleted successfully"
    );

    res.redirect(
      "/admin-courses"
    );
  }

  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};

//Edit Course

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

    res.render(

      "pages/admin/courses/basic-info",

      {

        title:
          "Velora - Edit Course",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

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

      return res.render(

        "pages/admin/courses/basic-info",

        {

          title:
            "Velora - Course Basic Info",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: true,

          errors,

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

      `/admin-courses/${req.params.courseId}/modules`

    );

  }

  catch (err) {

    console.log(err);

    const existingCourse =
      await Course.findById(
        req.params.courseId
      );

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




//Modules

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

    const lessons =
       await Lesson.find({

      moduleId: {
      $in:
      modules.map(
        module => module._id
       )
       }
     })
  .sort({
    order: 1
  });


res.render(

  "pages/admin/courses/modules",

  {

    title:
      "Velora - Course Modules",

    isLoggedIn: true,

    isAdmin: true,

    course,

    modules,

    lessons,

    errors: {},

    formData: {}

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

exports.getAdminAddModule =
async (req, res) => {

  try {

    const course =
      await Course.findById(
        req.params.courseId
      );

    if (!course) {

      return res.redirect(
        "/admin-courses"
      );

    }

    res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Add Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Add Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course: {},

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

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

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(

        "pages/admin/courses/add-module",

        {

          title:
            "Velora - Add Module",

          activePage:
            "courses",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: false,

          course,

          errors,

          formData: {

            title,

            description

          }

        }

      );

    }

    // MODULE ORDER

    const moduleCount =

      await Module.countDocuments({

        courseId:
          req.params.courseId

      });

    // CREATE MODULE

    await Module.create({

      courseId:
        req.params.courseId,

      title,

      description,

      order:
        moduleCount + 1

    });

    // REDIRECT

    res.redirect(

      `/admin-courses/${req.params.courseId}/modules`

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Add Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course: {},

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


exports.getAdminEditModule =
async (req, res) => {

  try {

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

    // RENDER

    res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Edit Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

        module,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Edit Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course: {},

        module: {},

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

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

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(

        "pages/admin/courses/add-module",

        {

          title:
            "Velora - Edit Module",

          activePage:
            "courses",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: true,

          course,

          module,

          errors,

          formData: {

            title,

            description

          }

        }

      );

    }

    // UPDATE MODULE

    module.title =
      title;

    module.description =
      description;

    await module.save();

    // REDIRECT

    res.redirect(

      `/admin-courses/${req.params.courseId}/modules`

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-module",

      {

        title:
          "Velora - Edit Module",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course: {},

        module: {},

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


exports.postAdminDeleteModule = async (req, res) => 
{
try{
const module=await Module.findById(req.params.moduleId);

if(!module){
  req.flash("error","Module not found");
  return res.redirect("/admin-courses");
}

await Module.findByIdAndDelete(req.params.moduleId);

req.flash("success","Module deleted successfully");

res.redirect(`/admin-courses/${req.params.courseId}/modules`);

}
catch(err){
    console.log(err);
    res.redirect("/admin-courses");
   }
}



exports.getAdminAddLesson =
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

        `/admin-courses/${req.params.courseId}/modules`

      );

    }

    // RENDER

    res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Add Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course,

        module,

        lesson: null,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Add Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course: {},

        module: {},

        lesson: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};


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
      duration?.trim();

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

    // DURATION

    if (!duration) {

      errors.duration =
        "Enter lesson duration";

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

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(

        "pages/admin/courses/add-lesson",

        {

          title:
            "Velora - Add Lesson",

          activePage:
            "courses",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: false,

          course: {

            _id:
              req.params.courseId

          },

          module,

          lesson: null,

          errors,

          formData: {

            title,

            description,

            duration

          }

        }

      );

    }

    // LESSON ORDER

    const lessonCount =

      await Lesson.countDocuments({

        moduleId:
          req.params.moduleId

      });

    // CREATE LESSON

    await Lesson.create({

      moduleId:
        req.params.moduleId,

      title,

      description,

      duration,

      video:
        "/uploads/" +
        video.filename,

      order:
        lessonCount + 1

    });

    // REDIRECT

    res.redirect(

      `/admin-courses/${req.params.courseId}/modules`

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Add Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course: {

          _id:
            req.params.courseId

        },

        module: {

          _id:
            req.params.moduleId

        },

        lesson: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {

          title:
            req.body.title,

          description:
            req.body.description,

          duration:
            req.body.duration

        }

      }

    );

  }

};


exports.getAdminEditLesson =
async (req, res) => {

  try {

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

    // RENDER

    res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Edit Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

        module,

        lesson,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Edit Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course: {},

        module: {},

        lesson: {},

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

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
      duration
    } = req.body;

    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

    duration =
      duration?.trim();

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

    // DURATION

    if (!duration) {

      errors.duration =
        "Enter lesson duration";

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

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(

        "pages/admin/courses/add-lesson",

        {

          title:
            "Velora - Edit Lesson",

          activePage:
            "courses",

          isLoggedIn: true,

          isAdmin: true,

          isEdit: true,

          course,

          module,

          lesson,

          errors,

          formData: {

            title,

            description,

            duration

          }

        }

      );

    }

    // UPDATE

    lesson.title =
      title;

    lesson.description =
      description;

    lesson.duration =
      duration;

    // OPTIONAL VIDEO

    if (video) {

      lesson.video =

        "/uploads/" +
        video.filename;

    }

    // SAVE

    await lesson.save();

    // REDIRECT

    res.redirect(

      `/admin-courses/${req.params.courseId}/modules`

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/add-lesson",

      {

        title:
          "Velora - Edit Lesson",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course: {

          _id:
            req.params.courseId

        },

        module: {

          _id:
            req.params.moduleId

        },

        lesson: {

          _id:
            req.params.lessonId

        },

        errors: {

          general:
            "Something went wrong"

        },

        formData: {

          title:
            req.body.title,

          description:
            req.body.description,

          duration:
            req.body.duration

        }

      }

    );

  }

};

exports.postAdminDeleteLesson =async (req, res) => {
  try {
    // FIND LESSON
    const lesson =
      await Lesson.findOne({
        _id:
        req.params.lessonId,
        moduleId:
        req.params.moduleId
      });

    // LESSON NOT FOUND
    if (!lesson) {
      req.flash(
        "error",
        "Lesson not found"
      );
      return res.redirect(`/admin-courses/${req.params.courseId}/modules`);
    }


    // DELETE LESSON
    await Lesson.findByIdAndDelete(
      req.params.lessonId
    );

    req.flash(
      "success",
      "Lesson deleted successfully"
    );

    // REDIRECT
    res.redirect(
      `/admin-courses/${req.params.courseId}/modules`
    );
  }

  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};




// Helper function for human-readable file sizes
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


exports.getAdminCourseResources =
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

      })

      .sort({
        order: 1
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

      })

      .sort({
        order: 1
      });

    // RENDER

    res.render(

      "pages/admin/courses/resources",

      {

        title:
          "Velora - Course Resources",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        course,

        modules,

        lessons,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/admin/courses/resources",

      {

        title:
          "Velora - Course Resources",

        activePage:
          "courses",

        isLoggedIn: true,

        isAdmin: true,

        course: {},

        modules: [],

        lessons: [],

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.getAdminCourseResourcesData =
async (req, res) => {

  try {

    const {
      moduleId,
      lessonId
    } = req.query;

    const {
      courseId
    } = req.params;

    // VALIDATION

    if (
      !moduleId ||
      !lessonId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Missing module or lesson reference"

      });

    }

    // CHECK MODULE

    const module =

      await Module.findOne({

        _id:
          moduleId,

        courseId

      });

    if (!module) {

      return res.status(404).json({

        success: false,

        error:
          "Module not found"

      });

    }

    // CHECK LESSON

    const lesson =

      await Lesson.findOne({

        _id:
          lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // GET RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    // EMPTY DEFAULT

    if (!resource) {

      resource = {

        files: [],

        links: [],

        notes: ""

      };

    }

    // RESPONSE

    return res.json({

      success: true,

      files:
        resource.files || [],

      links:
        resource.links || [],

      notes:
        resource.notes || ""

    });

  }

  catch (err) {

    console.log(
      "Error in getAdminCourseResourcesData:",
      err
    );

    return res.status(500).json({

      success: false,

      error:
        "Internal server error"

    });

  }

};

exports.postAdminCourseResourcesUploadFile = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;
    const file = req.file;

    if (!moduleId || !lessonId) {
      return res.status(400).json({ error: "Missing module or lesson reference" });
    }
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    const fileSizeString = formatBytes(file.size);
    resource.files.push({
      name: file.originalname,
      path: "/uploads/" + file.filename,
      size: fileSizeString
    });

    await resource.save();
    res.json({ success: true, files: resource.files });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesUploadFile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesDeleteFile = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, fileId } = req.body;

    if (!moduleId || !lessonId || !fileId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    resource.files = resource.files.filter(f => f._id.toString() !== fileId.toString());
    await resource.save();

    res.json({ success: true, files: resource.files });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesDeleteFile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesAddLink = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, title, url, description } = req.body;

    if (!moduleId || !lessonId || !title || !url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    resource.links.push({
      title,
      url,
      description: description || ""
    });

    await resource.save();
    res.json({ success: true, links: resource.links });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesAddLink:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesDeleteLink = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, linkId } = req.body;

    if (!moduleId || !lessonId || !linkId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    resource.links = resource.links.filter(l => l._id.toString() !== linkId.toString());
    await resource.save();

    res.json({ success: true, links: resource.links });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesDeleteLink:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesSaveNotes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, notes } = req.body;

    if (!moduleId || !lessonId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    resource.notes = notes || "";
    await resource.save();

    res.json({ success: true, notes: resource.notes });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesSaveNotes:", err);
    res.status(500).json({ error: "Internal server error" });
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

    // ERRORS

    let errors = {};

    // VALIDATIONS

    if (
      modules.length === 0
    ) {

      errors.modules =
        "Add at least one module before publishing";

    }

    if (
      lessons.length === 0
    ) {

      errors.lessons =
        "Add at least one lesson before publishing";

    }

    if (!course.title) {

      errors.title =
        "Course title missing";

    }

    if (!course.description) {

      errors.description =
        "Course description missing";

    }

    if (!course.thumbnail) {

      errors.thumbnail =
        "Course thumbnail missing";

    }

    if (!course.trailer) {

      errors.trailer =
        "Course trailer missing";

    }

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

    // IF ERRORS

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

      publishStatus ===
      "Published (Live Now)"

      ? "published"

      : "draft";

    // SAVE

    await course.save();

    // REDIRECT

    res.redirect(
      "/admin-courses"
    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};


exports.getAdminLogout =
(req, res) => {

  delete req.session.admin;

  res.setHeader(

    "Cache-Control",

    "no-store, no-cache, must-revalidate, private"
  );

  res.redirect("/admin-login");

};


