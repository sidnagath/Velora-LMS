import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import userService from '../../services/userService.js';


export const getAdminUsers = async (req, res) => {
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

export const getAdminCreateUser = (req, res) => {
  res.render("pages/admin/user-management/create-user", {
    title: "Velora - Admin Create User",
    isLoggedIn: true,
    isAdmin: true,
    errors: {},
    formData: {}
  });
};

export const postAdminCreateUser = async (req, res) => {
  const result = await userService.createUser(req.body, req.file, req.fileValidationError);

  if (!result.success) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to create user', errors: result.errors || {}, formData: result.formData || {} });
  }

  return res.status(HTTP_STATUS_CODES.CREATED).json({ success: true, message: `User '${result.trimmedName}' created successfully.` });
};

export const getAdminEditUser = async (req, res) => {
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

export const postAdminEditUser = async (req, res) => {
  const result = await userService.updateUser(req.params.id, req.body, req.file, req.fileValidationError);

  if (!result.success) {
    if (result.error === "User not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({ success: false, message: 'User not found' });
    }

    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to update user', errors: result.errors || {}, formData: result.formData || {} });
  }

  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: `User '${result.trimmedName}' updated successfully.` });
};

export const deleteUser = async (req, res) => {
  const result = await userService.deleteUser(req.params.id);

  if (!result.success) {
    console.log(result.error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to delete user' });
  }

  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: `User '${result.userName}' deleted successfully.` });
};


export default {
  getAdminUsers,
  getAdminCreateUser,
  postAdminCreateUser,
  getAdminEditUser,
  postAdminEditUser,
  deleteUser
};
