import Category from '../models/categoryModel.js';
import Course from '../models/courseModel.js';
import cloudinaryUtil from '../config/cloudinary.js';


export const getCategoriesData = async (query) => {
  try {
    const search = query.search?.trim() || "";
    const filterStatus = query.status || "";
    const sortBy = query.sortBy || "newest";
    const page = Number(query.page) || 1;
    const LIMIT = 10;
    const skip = (page - 1) * LIMIT;

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (filterStatus) {
      filter.status = filterStatus;
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      nameAZ: { name: 1 },
      nameZA: { name: -1 }
    };
    const sort = sortMap[sortBy] || sortMap.newest;

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

    const courseCountsAgg = await Course.aggregate([
      { $match: { category: { $exists: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const courseCountMap = {};
    courseCountsAgg.forEach(({ _id, count }) => {
      if (_id) {
        courseCountMap[_id.toString()] = count;
      }
    });

    const categoriesWithCounts = categories.map(cat => {
      const obj = cat.toObject();
      obj.courseCount = courseCountMap[cat._id.toString()] || 0;
      return obj;
    });

    const categoriesWithCoursesCount = (await Course.distinct("category")).filter(Boolean).length;
    const emptyCategories = Math.max(0, totalCategoriesGlobal - categoriesWithCoursesCount);
    const totalPages = Math.ceil(totalCategories / LIMIT);

    return {
      success: true,
      data: {
        categories: categoriesWithCounts,
        totalCategoriesGlobal,
        search,
        page,
        totalPages,
        totalCategories,
        activeCategories,
        categoriesWithCoursesCount,
        emptyCategories,
        filterStatus,
        sortBy,
        LIMIT
      }
    };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to load categories" } };
  }
};

export const createCategory = async (body, file, fileValidationErrors) => {
  try {
    let { name, description, status } = body;

    name = name?.trim();
    description = description?.trim();
    status = status?.trim() || "active";

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

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

    if (status !== "active" && status !== "inactive") {
      errors.status = "Invalid status value";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, formData: { name, description, status } };
    }

    let thumbnail = "";
    if (file) {
      const uploadResult = await cloudinaryUtil.uploadToCloudinary(file.path, 'category_thumbnails', 'image');
      thumbnail = uploadResult ? uploadResult.secure_url : "";
    }

    await Category.create({ name, description, thumbnail, status });

    return { success: true, name };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Something went wrong. Please try again." }, formData: body };
  }
};

export const getCategoryById = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category) return { success: false };
    return { success: true, data: category };
  } catch (err) {
    console.log(err);
    return { success: false };
  }
};

export const updateCategory = async (categoryId, body, file, fileValidationErrors) => {
  try {
    let { name, description, status } = body;

    name = name?.trim();
    description = description?.trim();
    status = status?.trim() || "active";

    const category = await Category.findById(categoryId);
    if (!category) return { success: false, notFound: true };

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

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

    if (status !== "active" && status !== "inactive") {
      errors.status = "Invalid status value";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, formData: { name, description, status }, category };
    }

    category.name = name;
    category.description = description;
    category.status = status;
    if (file) {
      const uploadResult = await cloudinaryUtil.uploadToCloudinary(file.path, 'category_thumbnails', 'image');
      if (uploadResult) {
        category.thumbnail = uploadResult.secure_url;
      }
    }

    await category.save();

    return { success: true, name };
  } catch (err) {
    console.log(err);
    return { success: false, generalError: true };
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const categoryToDelete = await Category.findById(categoryId);
    if (!categoryToDelete) {
      return { success: false, notFound: true };
    }
    const categoryName = categoryToDelete.name;

    const courseCount = await Course.countDocuments({
      category: categoryId,
      isDeleted: false
    });

    if (courseCount > 0) {
      return { success: false, hasCourses: true, categoryName, courseCount };
    }
    await Category.findByIdAndDelete(categoryId);
    return { success: true, categoryName };
  } catch (err) {
    console.log(err);
    return { success: false, generalError: true };
  }
};


export default {
  getCategoriesData,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory
};
