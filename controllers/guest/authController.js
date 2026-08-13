const passport = require('passport');
const authService = require('../../services/authService');

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect("/user/dashboard");
  let errors = {};
  if (req.query.error === "inactive") errors.general = "Account is inactive";
  res.render("pages/guest/login", { title: "Velora - Login", isLoggedIn: false, errors, formData: {} });
};

exports.getAccountBlocked = (req, res) => {
  res.render("pages/guest/account-blocked", { title: "Velora - Account Blocked", isLoggedIn: false });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'Login failed', errors: result.errors });
    }

    req.session.user = { id: result.user._id, name: result.user.name, email: result.user.email };
    return res.status(200).json({ success: true, message: 'Logged in successfully.', data: { redirectUrl: '/user/dashboard' } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.getSignup = (req, res) => {
  if (req.session.user) return res.redirect("/user/dashboard");
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
      return res.status(400).json({ success: false, message: result.errors?.general || 'Signup failed', errors: result.errors });
    }

    req.session.signupData = { name: trimmedName, email: trimmedEmail, password: trimmedPassword };
    req.session.signupOTP = result.otp;
    req.session.signupOTPExpires = result.otpExpires;
    return res.status(200).json({ success: true, message: 'OTP sent successfully.', data: { redirectUrl: '/auth/verify-signupotp' } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
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
    req.flash("success", "Logged in successfully.");
    res.redirect("/user/dashboard");
  })(req, res, next);
};

exports.getVerifySignupOtp = (req, res) => {
  if (!req.session.signupData || !req.session.signupOTP) {
    return res.redirect("/auth/signup");
  }
  res.render("pages/guest/verify-signupotp", { title: "Velora - Verify Signup OTP", isLoggedIn: false, errors: {}, otpExpires: req.session.signupOTPExpires || 0 });
};

exports.postVerifySignupOtp = async (req, res) => {
  try {
    const result = await authService.verifySignupOtp(req.body.otp, req.session.signupOTP, req.session.signupOTPExpires, req.session.signupData);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'OTP verification failed', errors: result.errors });
    }
    delete req.session.signupData;
    delete req.session.signupOTP;
    delete req.session.signupOTPExpires;
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      return res.status(200).json({ success: true, message: 'Account created successfully.', data: { redirectUrl: '/auth/login' } });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.resendSignupOtp = async (req, res) => {
  try {
    if (!req.session.signupData) {
      return res.status(400).json({ success: false, message: 'Session expired. Please signup again.', data: {} });
    }
    const result = await authService.resendSignupOtp(req.session.signupData.email);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'Failed to resend OTP', errors: result.errors });
    }
    req.session.signupOTP = result.otp;
    req.session.signupOTPExpires = result.otpExpires;
    return res.status(200).json({ success: true, message: 'OTP resent successfully.', data: {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP', data: {} });
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
      return res.status(400).json({ success: false, message: result.errors?.general || 'Forgot password failed', errors: result.errors });
    }
    req.session.forgotOTP = result.otp;
    req.session.forgotOTPExpires = result.otpExpires;
    req.session.forgotEmail = result.email;
    return res.status(200).json({ success: true, message: 'OTP sent to email.', data: { redirectUrl: '/auth/verify-otp' } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.getVerifyOtp = (req, res) => {
  if (!req.session.forgotEmail || !req.session.forgotOTP) return res.redirect("/auth/forgot-password");
  res.render("pages/guest/verify-otp", { title: "Velora - Verify OTP", isLoggedIn: false, errors: {}, otpExpires: req.session.forgotOTPExpires || 0 });
};

exports.postVerifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyForgotOtp(req.body.otp, req.session.forgotOTP, req.session.forgotOTPExpires);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'OTP verification failed', errors: result.errors });
    }
    req.session.isOtpVerified = true;
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      return res.status(200).json({ success: true, message: 'OTP verified successfully.', data: { redirectUrl: '/auth/reset-password' } });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    if (!req.session.forgotEmail) {
      return res.status(400).json({ success: false, message: 'Session expired. Please request again.', data: {} });
    }
    const result = await authService.resendSignupOtp(req.session.forgotEmail);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'Failed to resend OTP', errors: result.errors });
    }
    req.session.forgotOTP = result.otp;
    req.session.forgotOTPExpires = result.otpExpires;
    return res.status(200).json({ success: true, message: 'OTP resent successfully.', data: {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP', data: {} });
  }
};

exports.getResetPassword = (req, res) => {
  if (!req.session.isOtpVerified) return res.redirect("/auth/forgot-password");
  res.render("pages/guest/reset-password", { title: "Velora - Reset Password", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postResetPassword = async (req, res) => {
  try {
    if (!req.session.isOtpVerified || !req.session.forgotEmail) {
      return res.status(401).json({ success: false, message: 'Unauthorized', data: { redirectUrl: '/auth/forgot-password' } });
    }
    const result = await authService.resetPassword(req.body.password, req.body.confirmPassword, req.session.forgotEmail);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'Password reset failed', errors: result.errors });
    }
    delete req.session.forgotEmail;
    delete req.session.forgotOTP;
    delete req.session.forgotOTPExpires;
    delete req.session.isOtpVerified;
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      return res.status(200).json({ success: true, message: 'Password reset successfully.', data: { redirectUrl: '/auth/login' } });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.getPasswordUpdated = (req, res) => {
  res.render("pages/guest/password-updated", { title: "Velora - Password Updated", isLoggedIn: false });
};

exports.getAdminLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin/dashboard");
  res.render("pages/guest/admin-login", { title: "Velora - Admin Login", isLoggedIn: false, errors: {}, formData: {} });
};

exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.adminLogin(email, password);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.errors?.general || 'Login failed', errors: result.errors });
    }
    req.session.admin = result.admin;
    return res.status(200).json({ success: true, message: 'Admin logged in successfully.', data: { redirectUrl: '/admin/dashboard' } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Something went wrong', data: {} });
  }
};

exports.getAdminLogout = (req, res) => {
  req.session.destroy();
  res.redirect("/auth/admin-login");
};
