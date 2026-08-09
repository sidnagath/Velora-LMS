const userService = require('../../services/userService');

exports.getAdminUsers = async (req, res) => {
  const result = await userService.getUsersList(req.query);

  if (!result.success) {
    console.log(result.error);
    return res.redirect("/admin/dashboard");
  }

  const data = result.data;

  res.render("pages/admin/user-management/users", {
    title: "Velora - Admin Users",
    isLoggedIn: true,
    isAdmin: true,
    users: data.users,
    currentPage: data.currentPage,
    totalPages: data.totalPages,
    totalUsers: data.totalUsers,
    activeUsers: data.activeUsers,
    inactiveUsers: data.inactiveUsers,
    googleUsers: data.googleUsers,
    limit: data.limit,
    search: data.search,
    filterStatus: data.filterStatus,
    filterProvider: data.filterProvider,
    sortBy: data.sortBy,
    success: req.query.success || "",
    flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
    flashType: req.query.flashType || "success"
  });
};

exports.getAdminCreateUser = (req, res) => {
  res.render("pages/admin/user-management/create-user", {
    title: "Velora - Admin Create User",
    isLoggedIn: true,
    isAdmin: true,
    errors: {},
    formData: {}
  });
};

exports.postAdminCreateUser = async (req, res) => {
  const result = await userService.createUser(req.body, req.file, req.fileValidationError);

  if (!result.success) {
    return res.status(400).json({ success: false, message: 'Failed to create user', errors: result.errors || {}, formData: result.formData || {} });
  }

  return res.status(201).json({ success: true, message: `User '${result.trimmedName}' created successfully.` });
};

exports.getAdminEditUser = async (req, res) => {
  const result = await userService.getUserById(req.params.id);

  if (!result.success) {
    return res.redirect("/admin/users");
  }

  res.render("pages/admin/user-management/edit-user", {
    title: "Velora - Admin Edit User",
    isLoggedIn: true,
    isAdmin: true,
    user: result.data,
    errors: {},
    formData: {}
  });
};

exports.postAdminEditUser = async (req, res) => {
  const result = await userService.updateUser(req.params.id, req.body, req.file, req.fileValidationError);

  if (!result.success) {
    if (result.error === "User not found") {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    return res.status(400).json({ success: false, message: 'Failed to update user', errors: result.errors || {}, formData: result.formData || {} });
  }

  return res.status(200).json({ success: true, message: `User '${result.trimmedName}' updated successfully.` });
};

exports.deleteUser = async (req, res) => {
  const result = await userService.deleteUser(req.params.id);

  if (!result.success) {
    console.log(result.error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }

  return res.status(200).json({ success: true, message: `User '${result.userName}' deleted successfully.` });
};
