const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Lesson = require("../models/lessonModel");
const Resource = require("../models/resourceModel");
const mongoose = require("mongoose");


exports.getAdminLogin = (req, res) => {

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
    const search = req.query.search || "";

    // FILTERS
    const filterStatus    = req.query.status       || "";
    const filterProvider  = req.query.authProvider || "";
    const sortBy          = req.query.sortBy       || "newest";

    // PAGINATION
    const page  = parseInt(req.query.page) || 1;
    const limit = 6;
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
      success: req.query.success || ""
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
      "/admin-users?success=created"
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
      "/admin-users?success=updated"
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

    res.redirect("/admin-users?success=deleted");

  } catch (err) {

    console.log(err);

    res.redirect("/admin-users");
  }
};


// Category Management Methods

exports.getAdminCategories =
async (req, res) => {

  try {

    const search =
      req.query.search?.trim() || "";

    const filterStatus =
      req.query.status || "";

    const sortBy =
      req.query.sortBy || "newest";

    const page =
      Number(req.query.page) || 1;

    const LIMIT = 12;

    const skip =
      (page - 1) * LIMIT;

    // FILTER

    const filter = {};

    if (search) {

      filter.name = {

        $regex: search,

        $options: "i"

      };

    }

    if (filterStatus) {

      filter.status =
        filterStatus;

    }

    // SORT

    const sortMap = {

      newest:
        { createdAt: -1 },

      oldest:
        { createdAt: 1 },

      nameAZ:
        { name: 1 },

      nameZA:
        { name: -1 }

    };

    const sort =
      sortMap[sortBy] ||
      sortMap.newest;

    // GLOBAL STAT COUNTS (never affected by search/filter)

    const [
      totalCategoriesGlobal,
      activeCategories,
      categories,
      totalCategories
    ] = await Promise.all([
      Category.countDocuments({}),
      Category.countDocuments({ status: "active" }),
      Category.find(filter).sort(sort).skip(skip).limit(LIMIT),
      Category.countDocuments(filter)
    ]);

    // COURSE COUNT PER CATEGORY (for table rows)

const courseCountsAgg = await Course.aggregate([
  {
    $match: {
      category: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 }
    }
  }
]);

const courseCountMap = {};

courseCountsAgg.forEach(({ _id, count }) => {
  if (_id) {
    courseCountMap[_id.toString()] = count;
  }
});

const categoriesWithCounts = categories.map(cat => {
  const obj = cat.toObject();

  obj.courseCount =
    courseCountMap[cat._id.toString()] || 0;

  return obj;
});

    // STAT CARDS: accurate intersection-based counting

const categoriesWithCoursesCount =
  (await Course.distinct("category")).filter(Boolean).length;

   const emptyCategories = Math.max(
  0,
  totalCategoriesGlobal - categoriesWithCoursesCount
);

    const totalPages = Math.ceil(totalCategories / LIMIT);

    res.render(

      "pages/admin/categories/categories",

      {

        title:
          "Velora - Category Management",

        isLoggedIn: true,

        isAdmin: true,

        categories: categoriesWithCounts,

        totalCategoriesGlobal,

        search,

        currentPage: page,

        totalPages,

        totalCategories,

        activeCategories,

        categoriesWithCoursesCount,

        emptyCategories,

        filterStatus,

        sortBy,

        LIMIT,

        success: req.query.success || "",
        error: req.query.error || "",
        errors: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    res.render(

      "pages/admin/categories/categories",

      {

        title:
          "Velora - Category Management",

        isLoggedIn: true,

        isAdmin: true,

        categories: [],

        totalCategoriesGlobal: 0,

        search: "",

        currentPage: 1,

        totalPages: 1,

        totalCategories: 0,

        activeCategories: 0,

        categoriesWithCoursesCount: 0,

        emptyCategories: 0,

        filterStatus: "",

        sortBy: "newest",

        LIMIT: 12,

        success:"",

        error:"",

        errors: {

          general:
            "Failed to load categories"

        }

      }

    );

  }

};


// ─── ADD CATEGORY ────────────────────────────────────────────────────────────

exports.getAdminAddCategory =
(req, res) => {
  res.render(
    "pages/admin/categories/add-category",
    {
      title: "Velora - Add Category",
      isLoggedIn: true,
      isAdmin: true,
      errors: {},
      formData: {}
    }
  );
};

exports.postAdminAddCategory =
async (req, res) => {
  try {
    let { name, description, status } = req.body;

    name        = name?.trim();
    description = description?.trim();
    status      = status?.trim() || "active";

    const thumbnailFile = req.file;

    let errors = {};

    if (!name) {
      errors.name = "Category name is required";
    } else if (name.length < 3) {
      errors.name = "Category name must be at least 3 characters";
    }

    if (!description) {
      errors.description = "Description is required";
    }

    if (name && name.length >= 3) {
      const existing = await Category.findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" }
      });
      if (existing) {
        errors.name = "A category with this name already exists";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.render(
        "pages/admin/categories/add-category",
        {
          title: "Velora - Add Category",
          isLoggedIn: true,
          isAdmin: true,
          errors,
          formData: { name, description, status }
        }
      );
    }

    const thumbnail = thumbnailFile
      ? "/uploads/" + thumbnailFile.filename
      : "";

    await Category.create({ name, description, thumbnail, status });

    res.redirect("/admin-categories?success=created");

  } catch (err) {
    console.log(err);
    res.render(
      "pages/admin/categories/add-category",
      {
        title: "Velora - Add Category",
        isLoggedIn: true,
        isAdmin: true,
        errors: { general: "Something went wrong. Please try again." },
        formData: req.body
      }
    );
  }
};


// ─── EDIT CATEGORY ────────────────────────────────────────────────────────────

exports.getAdminEditCategory =
async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);

    if (!category) return res.redirect("/admin-categories");

    res.render(
      "pages/admin/categories/edit-category",
      {
        title: "Velora - Edit Category",
        isLoggedIn: true,
        isAdmin: true,
        category,
        errors: {},
        formData: {}
      }
    );
  } catch (err) {
    console.log(err);
    res.redirect("/admin-categories");
  }
};

exports.postAdminEditCategory =
async (req, res) => {
  try {
    let { name, description, status } = req.body;

    name        = name?.trim();
    description = description?.trim();
    status      = status?.trim() || "active";

    const thumbnailFile = req.file;

    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.redirect("/admin-categories");

    let errors = {};

    if (!name) {
      errors.name = "Category name is required";
    } else if (name.length < 3) {
      errors.name = "Category name must be at least 3 characters";
    }

    if (!description) {
      errors.description = "Description is required";
    }

    if (name && name.length >= 3) {
      const existing = await Category.findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" },
        _id: { $ne: category._id }
      });
      if (existing) {
        errors.name = "A category with this name already exists";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.render(
        "pages/admin/categories/edit-category",
        {
          title: "Velora - Edit Category",
          isLoggedIn: true,
          isAdmin: true,
          category,
          errors,
          formData: { name, description, status }
        }
      );
    }

    category.name        = name;
    category.description = description;
    category.status      = status;
    if (thumbnailFile) {
      category.thumbnail = "/uploads/" + thumbnailFile.filename;
    }

    await category.save();

    res.redirect("/admin-categories?success=updated");

  } catch (err) {
    console.log(err);
    res.redirect("/admin-categories");
  }
};


// ─── DELETE CATEGORY ─────────────────────────────────────────────────────────

exports.postAdminDeleteCategory =
async (req, res) => {
  try {

    const categoryId = req.params.categoryId;

const courseCount =
  await Course.countDocuments({
    category: categoryId,
    isDeleted: false
  });

    if (courseCount > 0) {
      return res.redirect("/admin-categories?error=in-use");
    }
    await Category.findByIdAndDelete(req.params.categoryId);
    res.redirect("/admin-categories?success=deleted");
  } catch (err) {
    console.log(err);
    res.redirect("/admin-categories");
  }
};


// Course Management Methods

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
    const LIMIT = 12;
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
      LIMIT: 12,
      filterStatus: "",
      filterLevel: "",
      filterCategory: "",
      sortBy: "newestUpdated",
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


    res.redirect(
      "/admin-courses?success=deleted"
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

      `/admin-courses/${req.params.courseId}/modules`

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

        module: {}, 

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

          module: {}, 

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
      description
    } = req.body;

 
    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();


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

            description
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
            req.body.description

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
    } = req.body;

    // TRIM

    title =
      title?.trim();

    description =
      description?.trim();

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

            description

          }

        }

      );

    }

    // UPDATE

    lesson.title =
      title;

    lesson.description =
      description;

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

exports.postAdminCourseResourcesUploadFile =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {
      moduleId,
      lessonId
    } = req.body;

    const file =
      req.file;

    // VALIDATION

    if (
      !moduleId ||
      !lessonId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Select a module and lesson"

      });

    }

    if (!file) {

      return res.status(400).json({

        success: false,

        error:
          "Please upload a file"

      });

    }

    // CHECK MODULE

    const module =

      await Module.findOne({

        _id: moduleId,

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

        _id: lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      resource =

        new Resource({

          courseId,

          moduleId,

          lessonId,

          files: [],

          links: [],

          notes: ""

        });

    }

    // FILE SIZE

    const fileSizeString =

      formatBytes(
        file.size
      );

    // ADD FILE

    resource.files.push({

      name:
        file.originalname,

      path:
        "/uploads/" +
        file.filename,

      size:
        fileSizeString

    });

    await resource.save();

    return res.json({

      success: true,

      files:
        resource.files

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

exports.postAdminCourseResourcesDeleteFile =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {
      moduleId,
      lessonId,
      fileId
    } = req.body;

    // VALIDATION

    if (
      !moduleId ||
      !lessonId ||
      !fileId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Missing required parameters"

      });

    }

    // RESOURCE

    const resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      return res.status(404).json({

        success: false,

        error:
          "Resource not found"

      });

    }

    // FILE EXISTS

    const fileExists =

      resource.files.some(

        file =>

          file._id.toString()

          ===

          fileId.toString()

      );

    if (!fileExists) {

      return res.status(404).json({

        success: false,

        error:
          "File not found"

      });

    }

    // DELETE FILE

    resource.files =

      resource.files.filter(

        file =>

          file._id.toString()

          !==

          fileId.toString()

      );

    await resource.save();

    return res.json({

      success: true,

      files:
        resource.files

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};



exports.postAdminCourseResourcesAddLink =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    let {

      moduleId,

      lessonId,

      title,

      url,

      description

    } = req.body;


    // TRIM

    title =
      title?.trim();

    url =
      url?.trim();

    description =
      description?.trim();

    // VALIDATION

    if (
      !moduleId ||
      !lessonId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Select a module and lesson"

      });

    }

    if (!title) {

      return res.status(400).json({

        success: false,

        error:
          "Enter link title"

      });

    }

    if (!url) {

      return res.status(400).json({

        success: false,

        error:
          "Enter link URL"

      });

    }

    // URL VALIDATION

    const urlRegex =
      /^https?:\/\/.+/i;

    if (
      !urlRegex.test(url)
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Enter a valid URL"

      });

    }

    // MODULE CHECK

    const module =

      await Module.findOne({

        _id: moduleId,

        courseId

      });

    if (!module) {

      return res.status(404).json({

        success: false,

        error:
          "Module not found"

      });

    }

    // LESSON CHECK

    const lesson =

      await Lesson.findOne({

        _id: lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      resource =

        new Resource({

          courseId,

          moduleId,

          lessonId,

          files: [],

          links: [],

          notes: ""

        });

    }

    // ADD LINK

    resource.links.push({

      title,

      url,

      description:
        description || ""

    });

    await resource.save();

    return res.json({

      success: true,

      links:
        resource.links

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

exports.postAdminCourseResourcesDeleteLink =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {

      moduleId,

      lessonId,

      linkId

    } = req.body;

    // VALIDATION

    if (

      !moduleId ||

      !lessonId ||

      !linkId

    ) {

      return res.status(400).json({

        success: false,

        error:
          "Missing required parameters"

      });

    }

    // RESOURCE

    const resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      return res.status(404).json({

        success: false,

        error:
          "Resource not found"

      });

    }

    // LINK EXISTS

    const linkExists =

      resource.links.some(

        link =>

          link._id.toString()

          ===

          linkId.toString()

      );

    if (!linkExists) {

      return res.status(404).json({

        success: false,

        error:
          "Link not found"

      });

    }

    // DELETE LINK

    resource.links =

      resource.links.filter(

        link =>

          link._id.toString()

          !==

          linkId.toString()

      );

    await resource.save();

    return res.json({

      success: true,

      links:
        resource.links

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};


exports.postAdminCourseResourcesSaveNotes =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    let {

      moduleId,

      lessonId,

      notes

    } = req.body;

    // TRIM

    notes =
      notes?.trim();

    // VALIDATION

    if (

      !moduleId ||

      !lessonId

    ) {

      return res.status(400).json({

        success: false,

        error:
          "Select a module and lesson"

      });

    }

    // MODULE CHECK

    const module =

      await Module.findOne({

        _id: moduleId,

        courseId

      });

    if (!module) {

      return res.status(404).json({

        success: false,

        error:
          "Module not found"

      });

    }

    // LESSON CHECK

    const lesson =

      await Lesson.findOne({

        _id: lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      resource =

        new Resource({

          courseId,

          moduleId,

          lessonId,

          files: [],

          links: [],

          notes: ""

        });

    }

    // OPTIONAL LIMIT

    if (

      notes &&

      notes.length > 10000

    ) {

      return res.status(400).json({

        success: false,

        error:
          "Notes exceed maximum length"

      });

    }

    // SAVE NOTES

    resource.notes =

      notes || "";

    await resource.save();

    return res.json({

      success: true,

      notes:
        resource.notes

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

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


exports.getAdminLogout = (req, res) => {

  delete req.session.admin;

  req.session.save(err => {

    if (err) {
      console.log(err);
      return res.redirect("/admin-login");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.redirect("/admin-login");
  });

};


