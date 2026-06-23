const User = require('../models/userModel');
const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const createTransporter = require('../config/mail');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.login = async (email, password) => {
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();
  let errors = {};

  if (!trimmedEmail) errors.email = "Email is required";
  if (!trimmedPassword) errors.password = "Password is required";
  if (Object.keys(errors).length > 0) return { success: false, errors };

  const user = await User.findOne({ email: trimmedEmail });
  if (!user) {
    return { success: false, errors: { email: "User not found" } };
  }

  const isMatch = await bcrypt.compare(trimmedPassword, user.password);
  if (!isMatch) {
    return { success: false, errors: { password: "Current password is incorrect." } };
  }

  if (user.status === "inactive") {
    return { success: false, errors: { general: "Account is inactive" } };
  }

  return { success: true, user };
};

exports.signup = async (name, email, password, confirmPassword) => {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();
  const trimmedConfirmPassword = confirmPassword?.trim();

  const nameRegex = /^[A-Za-z ]{3,30}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

  let errors = {};

  if (!trimmedName) errors.name = "Name is required";
  else if (!nameRegex.test(trimmedName)) errors.name = "Name should contain only letters";

  if (!trimmedEmail) errors.email = "Email is required";
  else if (!emailRegex.test(trimmedEmail)) errors.email = "Invalid email format";

  if (!trimmedPassword) errors.password = "Password is required";
  else if (!passwordRegex.test(trimmedPassword)) errors.password = "Password must contain uppercase letter and number";

  if (!trimmedConfirmPassword) errors.confirmPassword = "Confirm Password is required";
  else if (trimmedPassword !== trimmedConfirmPassword) errors.confirmPassword = "Passwords do not match";

  const existingUser = await User.findOne({ email: trimmedEmail });
  if (existingUser) errors.email = "Email address is already in use.";

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const otp = generateOTP();
  const otpExpires = Date.now() + 60 * 1000;

  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: '"Velora" <no-reply@velora.com>',
      to: trimmedEmail,
      subject: "Signup OTP",
      text: `Your OTP is ${otp}`
    });
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  } catch(err) {
    console.log(err);
  }

  return { success: true, otp, otpExpires };
};

exports.verifySignupOtp = async (otp, sessionOtp, sessionExpires, signupData) => {
  let errors = {};
  if (!otp?.trim()) errors.otp = "OTP is required";

  if (!sessionOtp || !sessionExpires || !signupData) {
    return { success: false, errors: { general: "Verification session has expired. Please sign up again." } };
  } else if (Date.now() > sessionExpires) {
    return { success: false, errors: { general: "Verification code has expired. Please request a new one." } };
  } else if (otp.trim() !== sessionOtp) {
    return { success: false, errors: { otp: "Invalid verification code." } };
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const hashedPassword = await bcrypt.hash(signupData.password, 10);
  await User.create({
    name: signupData.name,
    email: signupData.email,
    password: hashedPassword
  });

  return { success: true };
};

exports.resendSignupOtp = async (email) => {
  const otp = generateOTP();
  const otpExpires = Date.now() + 60 * 1000;

  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: '"Velora" <no-reply@velora.com>',
      to: email,
      subject: "Resend OTP",
      text: `Your OTP is ${otp}`
    });
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    return { success: true, otp, otpExpires };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to resend OTP" } };
  }
};

exports.forgotPassword = async (email) => {
  const trimmedEmail = email?.trim();
  let errors = {};

  if (!trimmedEmail) {
    errors.email = "Email is required";
    return { success: false, errors };
  }

  const user = await User.findOne({ email: trimmedEmail });
  if (!user) {
    errors.email = "User not found";
    return { success: false, errors };
  }
  if (user.googleId) {
    errors.email = "Google accounts cannot reset password";
    return { success: false, errors };
  }

  const otp = generateOTP();
  const otpExpires = Date.now() + 60 * 1000;

  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: '"Velora" <no-reply@velora.com>',
      to: trimmedEmail,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}`
    });
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    return { success: true, otp, otpExpires, email: trimmedEmail };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to send OTP email" } };
  }
};

exports.verifyForgotOtp = async (otp, sessionOtp, sessionExpires) => {
  let errors = {};

  if (!otp?.trim()) errors.otp = "OTP is required";

  if (!sessionOtp || !sessionExpires) {
    return { success: false, errors: { general: "Verification session has expired. Please request again." } };
  } else if (Date.now() > sessionExpires) {
    return { success: false, errors: { general: "Verification code has expired. Please request a new one." } };
  } else if (otp.trim() !== sessionOtp) {
    return { success: false, errors: { otp: "Invalid verification code." } };
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return { success: true };
};

exports.resetPassword = async (password, confirmPassword, email) => {
  const trimmedPassword = password?.trim();
  const trimmedConfirmPassword = confirmPassword?.trim();
  const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;
  let errors = {};

  if (!trimmedPassword) errors.password = "Password is required";
  else if (!passwordRegex.test(trimmedPassword)) errors.password = "Password must contain uppercase letter and number";

  if (!trimmedConfirmPassword) errors.confirmPassword = "Confirm Password is required";
  else if (trimmedPassword !== trimmedConfirmPassword) errors.confirmPassword = "Passwords do not match";

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
  await User.updateOne({ email }, { $set: { password: hashedPassword } });

  return { success: true };
};

exports.adminLogin = async (email, password) => {
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();
  let errors = {};

  if (!trimmedEmail) errors.email = "Email is required";
  if (!trimmedPassword) errors.password = "Password is required";
  if (Object.keys(errors).length > 0) return { success: false, errors };

  const admin = await Admin.findOne({ email: trimmedEmail });
  if (!admin) return { success: false, errors: { email: "Invalid admin credentials" } };

  const isMatch = await bcrypt.compare(trimmedPassword, admin.password);
  if (!isMatch) return { success: false, errors: { password: "Invalid admin credentials" } };

  return { success: true, admin };
};
