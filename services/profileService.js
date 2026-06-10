const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const createTransporter = require('../config/mail');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

class ProfileService {
  async getUserById(userId) {
    if (!userId) return null;
    return await User.findById(userId);
  }

  async updateAvatar(userId, filename) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }
    if (!filename) {
      return { success: false, errors: { avatar: "Please select an image" }, user };
    }

    user.avatar = "/uploads/" + filename;
    await user.save();
    return { success: true, user };
  }

  async updateProfileDetails(userId, profileData) {
    const { name, email, phone } = profileData;
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }

    // TRIM VALUES
    let trimmedName = name?.trim();
    let trimmedEmail = email?.trim();
    let trimmedPhone = phone?.trim() || "";

    const nameRegex = /^[A-Za-z ]{3,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    let errors = {};

    if (!trimmedName) errors.name = "Name is required";
    if (!trimmedEmail) errors.email = "Email is required";
    
    if (trimmedName && !nameRegex.test(trimmedName)) {
      errors.name = "Name should contain only letters";
    }
    
    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      errors.email = "Invalid email format";
    }
    
    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      errors.phone = "Enter valid 10 digit phone number";
    }

    if (user.authProvider === "google") {
      trimmedEmail = user.email; // Override manual email change
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, user, formData: { name: trimmedName, email: trimmedEmail, phone: trimmedPhone } };
    }

    // DUPLICATE EMAIL CHECK
    const existingUser = await User.findOne({
      email: trimmedEmail,
      _id: { $ne: user._id }
    });

    if (existingUser) {
      errors.email = "Email already exists";
      return { success: false, errors, user, formData: { name: trimmedName, email: trimmedEmail, phone: trimmedPhone } };
    }

    // EMAIL CHANGED -> OTP LOGIC
    if (trimmedEmail !== user.email) {
      const otp = generateOTP();
      const otpExpires = Date.now() + 60 * 1000;
      
      const transporter = await createTransporter();
      const info = await transporter.sendMail({
        from: '"Velora" <no-reply@velora.com>',
        to: trimmedEmail,
        subject: "Verify Email Change",
        text: `Your OTP is ${otp}`
      });
      
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

      return {
        success: true,
        emailChanged: true,
        user,
        pendingProfileUpdate: { name: trimmedName, email: trimmedEmail, phone: trimmedPhone },
        otp,
        otpExpires
      };
    }

    // UPDATE DATA IMMEDIATELY
    user.name = trimmedName;
    user.email = trimmedEmail;
    user.phone = trimmedPhone;
    await user.save();

    return { success: true, emailChanged: false, user };
  }

  async verifyEmailChangeOtp(userId, inputOtp, sessionOtp, sessionExpires, pendingData) {
    if (Date.now() > sessionExpires) {
      return { success: false, errors: { otp: "OTP expired" } };
    }

    if (inputOtp !== sessionOtp) {
      return { success: false, errors: { otp: "Invalid OTP" } };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }

    user.name = pendingData.name;
    user.email = pendingData.email;
    user.phone = pendingData.phone;
    await user.save();

    return { success: true, user };
  }

  async resendProfileOtp(email) {
    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: '"Velora" <no-reply@velora.com>',
      to: email,
      subject: "Email Change Verification OTP",
      text: `Your OTP is ${otp}`
    });
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

    return { success: true, otp, otpExpires };
  }

  async updatePassword(userId, passwordData) {
    const { newPassword, confirmPassword } = passwordData;
    const user = await User.findById(userId);

    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }

    const trimmedPassword = newPassword?.trim();
    const trimmedConfirmPassword = confirmPassword?.trim();
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    let errors = {};

    if (!trimmedPassword) errors.newPassword = "Password is required";
    if (!trimmedConfirmPassword) errors.confirmPassword = "Confirm password is required";

    if (trimmedPassword && trimmedConfirmPassword && trimmedPassword !== trimmedConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (trimmedPassword && !passwordRegex.test(trimmedPassword)) {
      errors.newPassword = "Password must contain uppercase letter, number and minimum 6 characters";
    }

    if (user.authProvider === "google") {
      errors.general = "Google accounts cannot change password";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, user };
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { success: true, user };
  }
}

module.exports = new ProfileService();
