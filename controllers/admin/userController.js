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

exports.getAdminUsers = async (req, res) => {

  try {

    // SEARCH
    const search = req.query.search || "";

    // FILTERS
    const filterStatus    = req.query.status       || "";
    const filterProvider  = req.query.authProvider || "";
    const sortBy          = req.query.sortBy       || "newest";

    // PAGINATION
    const page  = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip  = (page - 1) * limit;

    // BUILD FILTER
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name:   { $regex: search, $options: "i" } },
        { email:  { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    if (filterStatus)   filter.status       = filterStatus;
    if (filterProvider) filter.authProvider = filterProvider;

    // BUILD SORT
    const sortMap = {
      newest:   { createdAt: -1 },
      oldest:   { createdAt:  1 },
      nameAZ:   { name:       1 },
      nameZA:   { name:      -1 }
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    // QUERY
    const users = await User.find(filter).sort(sort).skip(skip).limit(limit);
    const totalUsers  = await User.countDocuments(filter);
    const totalPages  = Math.ceil(totalUsers / limit);

    const activeUsers   = await User.countDocuments({ isDeleted: false, status: "active" });
    const inactiveUsers = await User.countDocuments({ isDeleted: false, status: "inactive" });
    const googleUsers   = await User.countDocuments({ isDeleted: false, authProvider: "google" });

    res.render("pages/admin/user-management/users", {
      title: "Velora - Admin Users",
      isLoggedIn: true,
      isAdmin: true,
      users,
      currentPage: page,
      totalPages,
      totalUsers,
      activeUsers,
      inactiveUsers,
      googleUsers,
      limit,
      search,
      filterStatus,
      filterProvider,
      sortBy,
      success: req.query.success || "",
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success"
    });

  } catch (err) {
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
      "/admin-users?flashType=success&flashMsg=" + encodeURIComponent("User '" + trimmedName + "' created successfully.")
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
    let trimmedName = name?.trim();
    let trimmedEmail = email?.trim();
    let trimmedPassword = password ? password.trim() : "";
    let trimmedPhone = phone ? String(phone).trim() : "";

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
    if (currentUser.authProvider === "google") {
      trimmedEmail = currentUser.email; // Ignore manual email changes
      trimmedPassword = ""; // Ignore manual password changes
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
      "/admin-users?flashType=success&flashMsg=" + encodeURIComponent("User '" + trimmedName + "' updated successfully.")
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

    const userToDelete = await User.findById(req.params.id);
    const userName = userToDelete ? userToDelete.name : "User";

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        status: "inactive"
      }
    );

    res.redirect("/admin-users?flashType=success&flashMsg=" + encodeURIComponent("User '" + userName + "' deleted successfully."));

  } catch (err) {

    console.log(err);

    res.redirect("/admin-users");
  }
};

