const cartService = require('../../services/cartService');
const profileService = require('../../services/profileService');
const courseService = require('../../services/courseService');
const couponService = require('../../services/couponService');
const walletService=require('../../services/walletService');


exports.getDashboard = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    const cartCount = await cartService.getCartCount(req.session.user.id);
    const result = await courseService.getPublishedCourses({ limit: 4 });
    const featuredCourses = result.success ? result.data.courses : [];
    
    // Fetch categories for "Explore Categories" section
    const Category = require('../../models/categoryModel');
    const exploreCategories = await Category.find({ status: 'active' }).limit(5).lean();

    if (!user) {
      return res.render("pages/guest/login", {
        title: "Velora - Login",
        isLoggedIn: false,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    let enrolledCount = 0;
    let completedCount = 0;
    let overallProgress = 0;

    let continueLearningCourses = [];

    if (user) {
      const Enrollment = require('../../models/enrollmentModel');
      // Fetch enrollments, populated, sorted by most recently interacted
      const enrollments = await Enrollment.find({ 
        userId: req.session.user.id, 
        status: { $in: ['active', 'completed'] } 
      }).populate('courseId').sort({ updatedAt: -1 }).lean();
      
      // Filter out enrollments where the course was hard-deleted
      const validEnrollments = enrollments.filter(e => e.courseId != null);

      enrolledCourseIds = validEnrollments.map(e => e.courseId._id.toString());
      
      enrolledCount = validEnrollments.length;
      completedCount = validEnrollments.filter(e => e.status === 'completed' || e.progress === 100).length;
      
      if (enrolledCount > 0) {
        const totalProgress = validEnrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0);
        overallProgress = Math.round(totalProgress / enrolledCount);
      }
      
      // Top 3 for "Continue Learning" section
      continueLearningCourses = validEnrollments.slice(0, 3);
    }

    // Get Wallet Balance
    const walletRes = await walletService.getWallet(req.session.user.id);
    const walletBalance = walletRes.success ? walletRes.wallet.balance : 0;

    // Get an Active Coupon (for display)
    const couponsRes = await couponService.getCoupons({ status: "Active" });
    const availableCoupon = (couponsRes.success && couponsRes.data.coupons.length > 0) ? couponsRes.data.coupons[0] : null;

    res.render("pages/user/home/dashboard", {
      title: "Velora - Dashboard",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {},
      featuredCourses,
      enrolledCourseIds,
      cartCount: cartCount.success ? cartCount.count : 0,
      enrolledCount,
      completedCount,
      overallProgress,
      walletBalance,
      availableCoupon,
      continueLearningCourses,
      exploreCategories
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

    const cartCount= await cartService.getCartCount(req.session.user.id);

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
      formData: {},
      cartCount:cartCount.success?cartCount.count:0
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

exports.getAddressDetails = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    const cartCount= await cartService.getCartCount(req.session.user.id);

    if (!user) {
      return res.render("pages/user/profile/address", {
        title: "Velora - Address",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/profile/address", {
      title: "Velora - Address",
      isLoggedIn: true,
      user,
      errors: {},
      formData: {},
      cartCount:cartCount.success?cartCount.count:0
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/address", {
      title: "Velora - Address",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.getMyCoupons = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);
    const cartCount = await cartService.getCartCount(req.session.user?.id);
    const result = await couponService.getActiveCoupons();

    if (!user) {
      return res.redirect("/auth/login");
    }

    res.render("pages/user/profile/my-coupons", {
      title: "Velora - My Coupons",
      isLoggedIn: true,
      user,
      coupons: result.success ? result.coupons : [],
      errors: {},
      formData: {},
      cartCount: cartCount.success ? cartCount.count : 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.stack || err.toString());
  }
};


exports.getWallet= async(req,res)=>{
  try{
  
    const user=await profileService.getUserById(req.session.user?.id);
    const cartCount = await cartService.getCartCount(req.session.user?.id);
    const result= await walletService.getWallet(req.session.user?.id);


      if (!user) {
      return res.render("pages/user/profile/wallet", {
        title: "Velora - Wallet",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {},
      });
    }

    if(!result.success){
     return res.redirect("/user/profile");
    }

    return res.render("pages/user/profile/wallet",{
      title:"Velora - Wallet",
      isLoggedIn:true,
      user,
      errors:{},
      formData:{},
      cartCount: cartCount.success ? cartCount.count : 0,
      wallet:result.wallet
    });
  }catch(err){
   console.error(err);
   return res.status(500).send(err.stack || err.toString());
  }
}

exports.postUpdateAvatar = async (req, res) => {
  try {
    const result = await profileService.updateAvatar(req.session.user?.id, req.file, req.fileValidationError);

    if (!result.success) {
      if (result.errors.general === "User not found") {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      return res.status(400).json({ success: false, message: "Validation error", errors: result.errors });
    }

    return res.status(200).json({ success: true, message: "Profile picture updated successfully." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.getEditProfile = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);
    const cartCount= await cartService.getCartCount(req.session.user.id);

    if (!user) {
      return res.render("pages/user/profile/edit-profile", {
        title: "Edit Profile",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {},
        cartCount:cartCount.success?cartCount.count:0
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
      return res.status(400).json({ success: false, message: "Validation error", errors: result.errors });
    }

    if (result.emailChanged) {
      req.session.pendingProfileUpdate = result.pendingProfileUpdate;
      req.session.emailChangeOTP = result.otp;
      req.session.emailChangeOTPExpires = result.otpExpires;
      
      return res.status(200).json({ success: true, message: "Verification code sent to your new email address.", data: { redirect: "/user/verify-email-change-otp" } });
    }

    // UPDATE SESSION
    req.session.user.name = result.user.name;
    req.session.user.email = result.user.email;

    return res.status(200).json({ success: true, message: "Profile updated successfully.", data: { redirect: "/user/profile" } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
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
      return res.status(400).json({ success: false, message: "Invalid OTP", errors: result.errors });
    }

    // UPDATE SESSION
    req.session.user.name = result.user.name;
    req.session.user.email = result.user.email;

    // CLEANUP
    delete req.session.pendingProfileUpdate;
    delete req.session.emailChangeOTP;
    delete req.session.emailChangeOTPExpires;

    return res.status(200).json({ success: true, message: "Email address updated successfully.", data: { redirect: "/user/profile" } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.resendProfileOtp = async (req, res) => {
  try {
    if (!req.session.pendingProfileUpdate || !req.session.pendingProfileUpdate.email) {
      return res.status(400).json({ success: false, message: "Session expired. Please try again." });
    }

    const result = await profileService.resendProfileOtp(req.session.pendingProfileUpdate.email);
    
    req.session.emailChangeOTP = result.otp;
    req.session.emailChangeOTPExpires = result.otpExpires;

    return res.status(200).json({ success: true, message: "OTP resent successfully." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Failed to resend OTP" });
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
      return res.status(400).json({ success: false, message: "Validation error", errors: result.errors });
    }

    delete req.session.user;
    req.session.save((err) => {
      if (err) console.log(err);
      return res.status(200).json({ success: true, message: "Password changed successfully. Please log in again.", data: { redirect: "/auth/login" } });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.getEditAddress = async (req, res) => {
  try {
    const user = await profileService.getUserById(req.session.user?.id);

    if (!user) {
      return res.render("pages/user/profile/edit-address", {
        title: "Edit Address",
        isLoggedIn: true,
        user: null,
        errors: { general: "User not found" },
        formData: {}
      });
    }

    res.render("pages/user/profile/edit-address", {
      title: "Edit Address",
      isLoggedIn: true,
      user,
      errors: {},
      formData: user.address || {}
    });
  } catch (err) {
    console.log(err);
    return res.render("pages/user/profile/edit-address", {
      title: "Edit Address",
      isLoggedIn: true,
      user: null,
      errors: { general: "Something went wrong" },
      formData: {}
    });
  }
};

exports.postUpdateAddress = async (req, res) => {
  try {
    const result = await profileService.updateAddress(req.session.user?.id, req.body);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: "Validation error", errors: result.errors });
    }

    const isNew = !result.user.address || !result.user.address.addressLine1;
    return res.status(200).json({ success: true, message: isNew ? "Address updated successfully." : "Address updated successfully.", data: { redirect: "/user/address" } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
