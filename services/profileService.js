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

  async updateAvatar(userId, filename, fileValidationErrors) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }
    
    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }
    
    if (!filename && Object.keys(errors).length === 0) {
      errors.avatar = "Please select an image";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, user };
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
      errors.phone = "Please enter a valid phone number.";
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
      errors.email = "Email address is already in use.";
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
      return { success: false, errors: { otp: "Verification code has expired." } };
    }

    if (inputOtp !== sessionOtp) {
      return { success: false, errors: { otp: "Invalid verification code." } };
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

  async updateAddress(userId, addressData) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, errors: { general: "User not found" } };
    }

    const { addressLine1, addressLine2, city, state, country, postalCode } = addressData;
    let errors = {};

    const trimmedLine1 = addressLine1?.trim();
    const trimmedLine2 = addressLine2?.trim() || "";
    const trimmedCity = city?.trim();
    const trimmedState = state?.trim();
    const trimmedCountry = country?.trim();
    const trimmedPostal = postalCode?.trim();

    if (!trimmedLine1) errors.addressLine1 = "Address Line 1 is required.";
    if (!trimmedCity) errors.city = "City is required.";
    if (!trimmedState) errors.state = "State is required.";
    if (!trimmedCountry) errors.country = "Country is required.";
    if (!trimmedPostal) errors.postalCode = "Postal Code is required.";

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, user, formData: addressData };
    }

    user.address = {
      addressLine1: trimmedLine1,
      addressLine2: trimmedLine2,
      city: trimmedCity,
      state: trimmedState,
      country: trimmedCountry,
      postalCode: trimmedPostal
    };

    await user.save();
    return { success: true, user };
  }
}

module.exports = new ProfileService();
