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

    const LIMIT = 10;

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
        flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
        flashType: req.query.flashType || "success",
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

        LIMIT: 10,

        success:"",

        error:"",

        flashMsg: "",

        flashType: "success",

        errors: {

          general:
            "Failed to load categories"

        }

      }

    );

  }

};

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

    res.redirect("/admin-categories?flashType=success&flashMsg=" + encodeURIComponent("Category '" + name + "' created successfully."));

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

    res.redirect("/admin-categories?flashType=success&flashMsg=" + encodeURIComponent("Category '" + name + "' updated successfully."));

  } catch (err) {
    console.log(err);
    res.redirect("/admin-categories");
  }
};

exports.postAdminDeleteCategory =
async (req, res) => {
  try {

    const categoryId = req.params.categoryId;

    const categoryToDelete = await Category.findById(categoryId);
    const categoryName = categoryToDelete ? categoryToDelete.name : "Category";

const courseCount =
  await Course.countDocuments({
    category: categoryId,
    isDeleted: false
  });

    if (courseCount > 0) {
      return res.redirect("/admin-categories?flashType=error&flashMsg=" + encodeURIComponent("Cannot delete '" + categoryName + "' — it is assigned to " + courseCount + " course(s)."));
    }
    await Category.findByIdAndDelete(req.params.categoryId);
    res.redirect("/admin-categories?flashType=success&flashMsg=" + encodeURIComponent("Category '" + categoryName + "' deleted successfully."));
  } catch (err) {
    console.log(err);
    res.redirect("/admin-categories");
  }
};

