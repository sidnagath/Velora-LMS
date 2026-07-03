const User = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.getUsersList = async (queryParams) => {
  try {
    const search = queryParams.search || "";
    const filterStatus = queryParams.status || "";
    const filterProvider = queryParams.authProvider || "";
    const sortBy = queryParams.sortBy || "newest";
    const page = parseInt(queryParams.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    if (filterStatus) filter.status = filterStatus;
    if (filterProvider) filter.authProvider = filterProvider;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      nameAZ: { name: 1 },
      nameZA: { name: -1 }
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    const users = await User.find(filter).sort(sort).skip(skip).limit(limit);
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    const activeUsers = await User.countDocuments({ isDeleted: false, status: "active" });
    const inactiveUsers = await User.countDocuments({ isDeleted: false, status: "inactive" });
    const googleUsers = await User.countDocuments({ isDeleted: false, authProvider: "google" });

    return {
      success: true,
      data: {
        users,
        totalUsers,
        totalPages,
        activeUsers,
        inactiveUsers,
        googleUsers,
        currentPage: page,
        limit,
        search,
        filterStatus,
        filterProvider,
        sortBy
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.createUser = async (userData, avatarPath, fileValidationErrors) => {
  try {
    const { name, email, phone, password, confirmPassword, status } = userData;

    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim();
    const trimmedPhone = phone?.trim();
    const trimmedPassword = password?.trim();
    const trimmedConfirmPassword = confirmPassword?.trim();

    const nameRegex = /^[A-Za-z ]{3,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

    if (!trimmedName) {
      errors.name = "Name is required";
    } else if (!nameRegex.test(trimmedName)) {
      errors.name = "Name should contain only letters";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Invalid email format";
    }

    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      errors.phone = "Enter valid 10 digit phone number";
    }

    if (!trimmedPassword) {
      errors.password = "Password is required";
    } else if (!passwordRegex.test(trimmedPassword)) {
      errors.password = "Password must contain uppercase letter, number and minimum 6 characters";
    }

    if (!trimmedConfirmPassword) {
      errors.confirmPassword = "Confirm Password is required";
    } else if (trimmedPassword !== trimmedConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      errors.email = "Email already exists";
    }

    if (status !== "active" && status !== "inactive") {
      errors.status = "Invalid status value";
    }

    const formData = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      status
    };

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, formData };
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    await User.create({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      password: hashedPassword,
      status,
      avatar: avatarPath || ""
    });

    return { success: true, trimmedName };
  } catch (error) {
    return { 
      success: false, 
      errors: { general: "Something went wrong" },
      formData: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        status: userData.status
      }
    };
  }
};

exports.getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    if (!user) return { success: false, error: "User not found" };
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.updateUser = async (id, userData, avatarPath, fileValidationErrors) => {
  try {
    const { name, email, phone, status, password } = userData;

    let trimmedName = name?.trim();
    let trimmedEmail = email?.trim();
    let trimmedPassword = password ? password.trim() : "";
    let trimmedPhone = phone ? String(phone).trim() : "";

    const nameRegex = /^[A-Za-z ]{3,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

    if (currentUser.authProvider === "google") {
      trimmedEmail = currentUser.email;
      trimmedPassword = "";
    }

    if (!trimmedName) {
      errors.name = "Name is required";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required";
    }

    if (trimmedName && !nameRegex.test(trimmedName)) {
      errors.name = "Name should contain only letters";
    }

    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      errors.email = "Invalid email format";
    }

    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      errors.phone = "Enter valid 10 digit phone number";
    }

    if (trimmedPassword && !passwordRegex.test(trimmedPassword)) {
      errors.password = "Password must contain uppercase letter, number and minimum 6 characters";
    }

    const existingUser = await User.findOne({ email: trimmedEmail, _id: { $ne: id } });
    if (existingUser) {
      errors.email = "Email already exists";
    }

    if (status !== "active" && status !== "inactive") {
      errors.status = "Invalid status value";
    }

    const formData = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      status
    };

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, formData, user: currentUser };
    }

    const updateData = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      status
    };

    if (avatarPath) {
      updateData.avatar = avatarPath;
    }

    if (trimmedPassword) {
      updateData.password = await bcrypt.hash(trimmedPassword, 10);
    }

    await User.findByIdAndUpdate(id, updateData);

    return { success: true, trimmedName };
  } catch (error) {
    return { 
      success: false, 
      errors: { general: "Something went wrong" },
      formData: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        status: userData.status
      }
    };
  }
};

exports.deleteUser = async (id) => {
  try {
    const userToDelete = await User.findById(id);
    const userName = userToDelete ? userToDelete.name : "User";

    await User.findByIdAndUpdate(id, {
      isDeleted: true,
      status: "inactive"
    });

    return { success: true, userName };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
