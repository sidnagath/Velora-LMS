const categoryService = require('../../services/categoryService');

exports.getAdminCategories = async (req, res) => {
  const result = await categoryService.getCategoriesData(req.query);

  if (result.success) {
    const { data } = result;
    res.render("pages/admin/categories/categories", {
      title: "Velora - Category Management",
      isLoggedIn: true,
      isAdmin: true,
      categories: data.categories,
      totalCategoriesGlobal: data.totalCategoriesGlobal,
      search: data.search,
      currentPage: data.page,
      totalPages: data.totalPages,
      totalCategories: data.totalCategories,
      activeCategories: data.activeCategories,
      categoriesWithCoursesCount: data.categoriesWithCoursesCount,
      emptyCategories: data.emptyCategories,
      filterStatus: data.filterStatus,
      sortBy: data.sortBy,
      LIMIT: data.LIMIT,
      success: req.query.success || "",
      error: req.query.error || "",
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success",
      errors: {}
    });
  } else {
    res.render("pages/admin/categories/categories", {
      title: "Velora - Category Management",
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
      success: "",
      error: "",
      flashMsg: "",
      flashType: "success",
      errors: result.errors || { general: "Failed to load categories" }
    });
  }
};

exports.getAdminAddCategory = (req, res) => {
  res.render("pages/admin/categories/add-category", {
    title: "Velora - Add Category",
    isLoggedIn: true,
    isAdmin: true,
    errors: {},
    formData: {}
  });
};

exports.postAdminAddCategory = async (req, res) => {
  const result = await categoryService.createCategory(req.body, req.file, req.fileValidationError);

  if (result.success) {
    return res.status(201).json({ success: true, message: `Category '${result.name}' created successfully.` });
  } else {
    return res.status(400).json({ success: false, message: 'Failed to create category', errors: result.errors, formData: result.formData || req.body });
  }
};

exports.getAdminEditCategory = async (req, res) => {
  const result = await categoryService.getCategoryById(req.params.categoryId);

  if (result.success) {
    res.render("pages/admin/categories/edit-category", {
      title: "Velora - Edit Category",
      isLoggedIn: true,
      isAdmin: true,
      category: result.data,
      errors: {},
      formData: {}
    });
  } else {
    res.redirect("/admin/categories");
  }
};

exports.postAdminEditCategory = async (req, res) => {
  const result = await categoryService.updateCategory(req.params.categoryId, req.body, req.file, req.fileValidationError);

  if (result.success) {
    return res.status(200).json({ success: true, message: `Category '${result.name}' updated successfully.` });
  } else if (result.notFound) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  } else if (result.generalError) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  } else {
    return res.status(400).json({ success: false, message: 'Failed to update category', errors: result.errors, formData: result.formData });
  }
};

exports.postAdminDeleteCategory = async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.categoryId);

  if (result.success) {
    return res.status(200).json({ success: true, message: `Category '${result.categoryName}' deleted successfully.` });
  } else if (result.hasCourses) {
    return res.status(400).json({ success: false, message: `Cannot delete '${result.categoryName}' — it is assigned to ${result.courseCount} course(s).` });
  } else {
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
};
