const passport = require('passport');
const authService = require('../../services/authService');

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect("/user-dashboard");
  let errors = {};
  if (req.query.error === "inactive") errors.general = "Account is inactive";
  res.render("pages/guest/login", { title: "Velora - Login", isLoggedIn: false, errors, formData: {} });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result.success) {
      return res.render("pages/guest/login", {
        title: "Velora - Login", isLoggedIn: false,
        errors: result.errors, formData: { email: email?.trim() }
      });
    }

    req.session.user = { id: result.user._id, name: result.user.name, email: result.user.email };
    res.redirect("/user-dashboard");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/login", { title: "Velora - Login", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: { email: req.body.email } });
  }
};

exports.getSignup = (req, res) => {
  if (req.session.user) return res.redirect("/user-dashboard");
  res.render("pages/guest/signup", { title: "Velora - Sign Up", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postSignup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();
    const result = await authService.signup(name, email, password, confirmPassword);

    if (!result.success) {
      return res.render("pages/guest/signup", {
        title: "Velora - Sign Up", isLoggedIn: false,
        errors: result.errors, formData: { name: trimmedName, email: trimmedEmail }
      });
    }

    req.session.signupData = { name: trimmedName, email: trimmedEmail, password: trimmedPassword };
    req.session.signupOTP = result.otp;
    req.session.signupOTPExpires = result.otpExpires;
    res.redirect("/verify-signupotp");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/signup", { title: "Velora - Sign Up", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: { name: req.body.name, email: req.body.email } });
  }
};

exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.log(err);
      return res.render("pages/guest/login", { title: "Velora - Login", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: {} });
    }
    if (!user) {
      return res.render("pages/guest/login", { title: "Velora - Login", isLoggedIn: false, errors: { general: info?.message || "Google authentication failed" }, formData: {} });
    }
    req.session.user = { id: user._id, name: user.name, email: user.email };
    res.redirect("/user-dashboard");
  })(req, res, next);
};

exports.getVerifySignupOtp = (req, res) => {
  res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: {}, otpExpires: req.session.signupOTPExpires || 0 });
};

exports.postVerifySignupOtp = async (req, res) => {
  try {
    const result = await authService.verifySignupOtp(req.body.otp, req.session.signupOTP, req.session.signupOTPExpires, req.session.signupData);
    if (!result.success) {
      return res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: result.errors, otpExpires: req.session.signupOTPExpires || 0 });
    }
    delete req.session.signupData;
    delete req.session.signupOTP;
    delete req.session.signupOTPExpires;
    res.redirect("/login");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: { general: "Something went wrong" }, otpExpires: req.session.signupOTPExpires || 0 });
  }
};

exports.resendSignupOtp = async (req, res) => {
  try {
    if (!req.session.signupData) {
      return res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: { general: "Session expired. Please signup again." } });
    }
    const result = await authService.resendSignupOtp(req.session.signupData.email);
    if (!result.success) {
      return res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: result.errors });
    }
    req.session.signupOTP = result.otp;
    req.session.signupOTPExpires = result.otpExpires;
    res.redirect("/verify-signupotp");
  } catch (err) {
    console.log(err);
    return res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: { general: "Failed to resend OTP" } });
  }
};

exports.getAccountCreated = (req, res) => {
  res.render("pages/guest/account-created", { title: 'Velora - Account Created Successfully', isLoggedIn: false });
};

exports.getForgotPassword = (req, res) => {
  res.render("pages/guest/forgot-password", { title: "Velora - Forgot Password", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postForgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    if (!result.success) {
      return res.render("pages/guest/forgot-password", { title: "Velora - Forgot Password", isLoggedIn: false, errors: result.errors, formData: { email: req.body.email?.trim() } });
    }
    req.session.forgotOTP = result.otp;
    req.session.forgotOTPExpires = result.otpExpires;
    req.session.forgotEmail = result.email;
    res.redirect("/verify-otp");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/forgot-password", { title: "Velora - Forgot Password", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: { email: req.body.email } });
  }
};

exports.getVerifyOtp = (req, res) => {
  if (!req.session.forgotEmail) return res.redirect("/forgot-password");
  res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: {}, otpExpires: req.session.forgotOTPExpires || 0 });
};

exports.postVerifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyForgotOtp(req.body.otp, req.session.forgotOTP, req.session.forgotOTPExpires);
    if (!result.success) {
      return res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: result.errors, otpExpires: req.session.forgotOTPExpires || 0 });
    }
    req.session.isOtpVerified = true;
    res.redirect("/reset-password");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: { general: "Something went wrong" }, otpExpires: req.session.forgotOTPExpires || 0 });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    if (!req.session.forgotEmail) {
      return res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: { general: "Session expired. Please request again." } });
    }
    const result = await authService.resendSignupOtp(req.session.forgotEmail);
    if (!result.success) {
      return res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: result.errors });
    }
    req.session.forgotOTP = result.otp;
    req.session.forgotOTPExpires = result.otpExpires;
    res.redirect("/verify-otp");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: { general: "Failed to resend OTP" } });
  }
};

exports.getResetPassword = (req, res) => {
  if (!req.session.isOtpVerified) return res.redirect("/forgot-password");
  res.render("pages/guest/reset-password", { title: "Velora - Reset Password", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postResetPassword = async (req, res) => {
  try {
    if (!req.session.isOtpVerified || !req.session.forgotEmail) return res.redirect("/forgot-password");
    const result = await authService.resetPassword(req.body.password, req.body.confirmPassword, req.session.forgotEmail);
    if (!result.success) {
      return res.render("pages/guest/reset-password", { title: "Velora - Reset Password", isLoggedIn: false, errors: result.errors, formData: {} });
    }
    delete req.session.forgotEmail;
    delete req.session.forgotOTP;
    delete req.session.forgotOTPExpires;
    delete req.session.isOtpVerified;
    res.redirect("/password-updated");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/reset-password", { title: "Velora - Reset Password", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: {} });
  }
};

exports.getPasswordUpdated = (req, res) => {
  res.render("pages/guest/password-updated", { title: "Velora - Password Updated", isLoggedIn: false });
};

exports.getAdminLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin-dashboard");
  res.render("pages/guest/admin-login", { title: "Velora - Admin Login", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.adminLogin(email, password);
    if (!result.success) {
      return res.render("pages/guest/admin-login", { title: "Velora - Admin Login", isLoggedIn: false, errors: result.errors, formData: { email: email?.trim() } });
    }
    req.session.admin = result.admin;
    res.redirect("/admin-dashboard");
  } catch (err) {
    console.log(err);
    res.render("pages/guest/admin-login", { title: "Velora - Admin Login", isLoggedIn: false, errors: { general: "Something went wrong" }, formData: { email: req.body.email } });
  }
};

exports.getAdminLogout = (req, res) => {
  req.session.destroy();
  res.redirect("/admin-login");
};
