const profileService = require('../../services/profileService');

exports.getDashboard = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    if (!user) {
      return res.render("pages/guest/login", {
        title: "Velora - Login",
        isLoggedIn: false,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/home/dashboard", {
      title: "Velora - Dashboard",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/guest/login", {
      title: "Velora - Login",
      isLoggedIn: false,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.getProfileAccountDetails = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    if (!user) {
      return res.render("pages/user/profile/account-details", {
        title: "Velora - Profile",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.postUpdateAvatar = async (req, res) => {
  try {
    const result = await profileService.updateAvatar(req.session.user?.id, req.file?.filename);

    if (!result.success) {
      return res.render("pages/user/profile/account-details", {
        title: "Velora - Profile",
        isLoggedIn: true,
        user: result.user || null,
        errors: result.errors,
        formData: {}
      });
    }

    return res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user: result.user,
      errors: {},
      success: { avatar: "Profile picture updated" },
      formData: {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.getEditProfile = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    if (!user) {
      return res.render("pages/user/profile/edit-profile", {
        title: "Edit Profile",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/profile/edit-profile", {
      title: "Edit Profile",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/edit-profile", {
      title: "Edit Profile",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.postProfileDetails = async (req, res) => {
  try {
    const result = await profileService.updateProfileDetails(req.session.user?.id, req.body);
    
    if (!result.success) {
      return res.render("pages/user/profile/edit-profile", {
        title: "Edit Profile",
        isLoggedIn: true,
        user: result.user || null,
        errors: result.errors,
        formData: result.formData || req.body
      });
    }

    if (result.emailChanged) {
      req.session.pendingProfileUpdate = result.pendingProfileUpdate;
      req.session.emailChangeOTP = result.otp;
      req.session.emailChangeOTPExpires = result.otpExpires;
      
      return res.render("pages/user/profile/verify-email-change-otp", {
        title: "Verify Email Change",
        isLoggedIn: true,
        user: result.user,
        errors: {},
        success: { general: "OTP sent to new email" },
        formData: {},
        otpExpires: req.session.emailChangeOTPExpires || 0
      });
    }

    // UPDATE SESSION
    req.session.user.name = result.user.name;
    req.session.user.email = result.user.email;

    return res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user: result.user,
      errors: {},
      success: { general: "Profile updated successfully" },
      formData: {}
    });
  } catch (err) {
    console.log(err);
    const user = await profileService.getUserById(req.session.user?.id);
    return res.render("pages/user/profile/edit-profile", {
      title: "Edit Profile",
      isLoggedIn: true,
      user,
      errors: { general: "Something went wrong" },
      formData: req.body
    });
  }
};

exports.getVerifyEmailChangeOtp = (req, res) => {
  res.render("pages/user/profile/verify-email-change-otp", {
    title: "Verify Email Change",
    isLoggedIn: true,
    errors: {},
    success: {},
    formData: {},
    otpExpires: req.session.emailChangeOTPExpires || 0
  });
};

exports.postVerifyEmailChangeOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const result = await profileService.verifyEmailChangeOtp(
      req.session.user?.id,
      otp,
      req.session.emailChangeOTP,
      req.session.emailChangeOTPExpires,
      req.session.pendingProfileUpdate
    );

    if (!result.success) {
      return res.render("pages/user/profile/verify-email-change-otp", {
        title: "Verify Email Change",
        isLoggedIn: true,
        errors: result.errors,
        success: {},
        formData: { otp },
        otpExpires: req.session.emailChangeOTPExpires || 0
      });
    }

    // UPDATE SESSION
    req.session.user.name = result.user.name;
    req.session.user.email = result.user.email;

    // CLEANUP
    delete req.session.pendingProfileUpdate;
    delete req.session.emailChangeOTP;
    delete req.session.emailChangeOTPExpires;

    return res.render("pages/user/profile/account-details", {
      title: "Velora - Profile",
      isLoggedIn: true,
      user: result.user,
      errors: {},
      success: { general: "Email updated successfully" },
      formData: {},
      otpExpires: req.session.emailChangeOTPExpires || 0
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/verify-email-change-otp", {
      title: "Verify Email Change",
      isLoggedIn: true,
      errors: { general: "Something went wrong" },
      success: {},
      formData: {},
      otpExpires: req.session.emailChangeOTPExpires || 0
    });
  }
};

exports.resendProfileOtp = async (req, res) => {
  try {
    if (!req.session.pendingProfileUpdate || !req.session.pendingProfileUpdate.email) {
      return res.render("pages/user/profile/verify-email-change-otp", {
        title: "Verify Email Change",
        isLoggedIn: true,
        errors: { general: "Session expired. Please try again." },
        success: {},
        formData: {},
        otpExpires: req.session.emailChangeOTPExpires || 0
      });
    }

    const result = await profileService.resendProfileOtp(req.session.pendingProfileUpdate.email);
    
    req.session.emailChangeOTP = result.otp;
    req.session.emailChangeOTPExpires = result.otpExpires;

    res.redirect("/verify-email-change-otp");
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/verify-email-change-otp", {
      title: "Verify Email Change",
      isLoggedIn: true,
      errors: { general: "Failed to resend OTP" },
      success: {},
      formData: {},
      otpExpires: req.session.emailChangeOTPExpires || 0
    });
  }
};

exports.getChangePassword = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    if (!user) {
      return res.render("pages/user/profile/change-password", {
        title: "Change Password",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/profile/change-password", {
      title: "Change Password",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/change-password", {
      title: "Change Password",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.postUpdatePassword = async (req, res) => {
  try {
    const result = await profileService.updatePassword(req.session.user?.id, req.body);
    
    if (!result.success) {
      return res.render("pages/user/profile/change-password", {
        title: "Change Password",
        isLoggedIn: true,
        user: result.user || null,
        errors: result.errors,
        formData: {}
      });
    }

    return res.render("pages/guest/login", {
      title: "Velora - Login",
      isLoggedIn: false,
      user: result.user,
      errors: {},
      success: { general: "Password updated successfully" },
      formData: {}
    });
  } catch (err) {
    console.log(err);
    const user = await profileService.getUserById(req.session.user?.id);
    return res.render("pages/user/profile/change-password", {
      title: "Change Password",
      isLoggedIn: true,
      user,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};
