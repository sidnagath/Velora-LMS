const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');
const Course = require('../../models/courseModel');
const Module = require('../../models/moduleModel');
const Lesson = require('../../models/lessonModel');
const Resource = require('../../models/resourceModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const createTransporter = require('../../config/mail');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.getDashboard = async (req, res) => {

  try {

    const user = await User.findById(
      req.session.user.id
    );

    if (!user) {

      return res.render(

        "pages/guest/login",

        {

          title:
            "Velora - Login",

          isLoggedIn: false,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    res.render(

      "pages/user/home/dashboard",

      {

        title:
          "Velora - Dashboard",

        isLoggedIn: true,

        user,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/guest/login",

      {

        title:
          "Velora - Login",

        isLoggedIn: false,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.getProfileAccountDetails =
async (req, res) => {

  try {

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.render(

        "pages/user/profile/account-details",

        {

          title:
            "Velora - Profile",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.postUpdateAvatar =
async (req, res) => {

  try {

    const user =

      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.render(

        "pages/user/profile/account-details",

        {

          title:
            "Velora - Profile",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    // IMAGE REQUIRED

    if (!req.file) {

      return res.render(

        "pages/user/profile/account-details",

        {

          title:
            "Velora - Profile",

          isLoggedIn: true,

          user,

          errors: {

            avatar:
              "Please select an image"

          },

          formData: {}

        }

      );

    }

    // UPDATE AVATAR

    user.avatar =

      "/uploads/" +
      req.file.filename;

    await user.save();

    return res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user,

        errors: {},

        success: {

          avatar:
            "Profile picture updated"

        },

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.getEditProfile = async (req, res) => {

  try {

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.render(

        "pages/user/profile/edit-profile",

        {

          title:
            "Edit Profile",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    res.render(

      "pages/user/profile/edit-profile",

      {

        title:
          "Edit Profile",

        isLoggedIn: true,

        user,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/user/profile/edit-profile",

      {

        title:
          "Edit Profile",

        isLoggedIn: true,

        user: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.postProfileDetails =
async (req, res) => {

  try {

    const {
      name,
      email,
      phone
    } = req.body;

    // FIND USER

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.render(

        "pages/user/profile/edit-profile",

        {

          title:
            "Edit Profile",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: req.body

        }

      );

    }

    // TRIM VALUES
    let trimmedName = name?.trim();
    let trimmedEmail = email?.trim();
    let trimmedPhone = phone?.trim() || "";

    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
      /^[6-9]\d{9}$/;

    // ERRORS

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedName) {

      errors.name =
        "Name is required";

    }

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    // NAME VALIDATION

    if (

      trimmedName &&

      !nameRegex.test(
        trimmedName
      )

    ) {

      errors.name =
        "Name should contain only letters";

    }

    // EMAIL VALIDATION

    if (

      trimmedEmail &&

      !emailRegex.test(
        trimmedEmail
      )

    ) {

      errors.email =
        "Invalid email format";

    }

    // PHONE VALIDATION

    if (

      trimmedPhone &&

      !phoneRegex.test(
        trimmedPhone
      )

    ) {

      errors.phone =
        "Enter valid 10 digit phone number";

    }

    // GOOGLE USER CHECK
    if (user.authProvider === "google") {
      trimmedEmail = user.email; // Override manual email change
    }

    // RETURN ERRORS

    if (

      Object.keys(errors).length > 0

    ) {

      return res.render(

        "pages/user/profile/edit-profile",

        {

          title:
            "Edit Profile",

          isLoggedIn: true,

          user,

          errors,

          formData: {

            name:
              trimmedName,

            email:
              trimmedEmail,

            phone:
              trimmedPhone

          }

        }

      );

    }


// FIND USER


if (!user) {

  return res.render(

    "pages/user/profile/edit-profile",

    {

      title:
        "Edit Profile",

      isLoggedIn: true,

      user: null,

      errors: {

        general:
          "User not found"

      },

      formData: req.body

    }

  );

}

       // DUPLICATE EMAIL CHECK

    const existingUser =

      await User.findOne({

        email:
          trimmedEmail,

        _id: {

          $ne:
            user._id

        }

      });

    if (existingUser) {

      return res.render(

        "pages/user/profile/edit-profile",

        {

          title:
            "Edit Profile",

          isLoggedIn: true,

          user,

          errors: {

            email:
              "Email already exists"

          },

          formData: {

            name:
              trimmedName,

            email:
              trimmedEmail,

            phone:
              trimmedPhone

          }

        }

      );

    }

    // EMAIL CHANGED

    if (

      trimmedEmail !==

      user.email

    ) {

      // GENERATE OTP

      const otp =

        generateOTP();

      // STORE PENDING DATA

      req.session.pendingProfileUpdate = {

        name:
          trimmedName,

        email:
          trimmedEmail,

        phone:
          trimmedPhone

      };

      // STORE OTP

      req.session.emailChangeOTP =
        otp;

      req.session.emailChangeOTPExpires =

        Date.now() +

        60 * 1000;

      // SEND OTP

      const transporter =

        await createTransporter();

      const info =

        await transporter.sendMail({

          from:

            '"Velora" <no-reply@velora.com>',

          to:
            trimmedEmail,

          subject:
            "Verify Email Change",

          text:
            `Your OTP is ${otp}`

        });

      console.log(

        "Preview URL:",

        nodemailer.getTestMessageUrl(
          info
        )

      );

      return res.render(

        "pages/user/profile/verify-email-change-otp",

        {

          title:
            "Verify Email Change",

          isLoggedIn: true,

          user,

          errors: {},

          success: {

            general:
              "OTP sent to new email"

          },

          formData: {},
           otpExpires:
      req.session.emailChangeOTPExpires || 0

        }

      );

    }


     // UPDATE DATA

    user.name =
      trimmedName;

    user.email =
      trimmedEmail;

    user.phone =
      trimmedPhone;

    await user.save();

    // UPDATE SESSION

    req.session.user.name =
      user.name;

    req.session.user.email =
      user.email;

    return res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user,

        errors: {},

        success: {

          general:
            "Profile updated successfully"

        },

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    const user =

      await User.findById(
        req.session.user?.id
      );

    return res.render(

      "pages/user/profile/edit-profile",

      {

        title:
          "Edit Profile",

        isLoggedIn: true,

        user,

        errors: {

          general:
            "Something went wrong"

        },

        formData: req.body

      }

    );

  }

};

exports.getVerifyEmailChangeOtp =
(req, res) => {

  res.render(
  "pages/user/profile/verify-email-change-otp",
  {
    title:
      "Verify Email Change",

    isLoggedIn: true,

    errors: {},

    success: {},

    formData: {},

    otpExpires:
      req.session.emailChangeOTPExpires || 0
  }
);

};

exports.postVerifyEmailChangeOtp =
async (req, res) => {

  try {

    const { otp } =
      req.body;

    // EXPIRY CHECK

    if (

      Date.now() >

      req.session.emailChangeOTPExpires

    ) {

      return res.render(

        "pages/user/profile/verify-email-change-otp",

        {

          title:
            "Verify Email Change",

          isLoggedIn: true,

          errors: {

            otp:
              "OTP expired"

          },

          success: {},

          formData: {

            otp

          },
          otpExpires:
  req.session.emailChangeOTPExpires || 0

        }

      );

    }

    // OTP CHECK

    if (

      otp !==

      req.session.emailChangeOTP

    ) {

      return res.render(

        "pages/user/profile/verify-email-change-otp",

        {

          title:
            "Verify Email Change",

          isLoggedIn: true,

          errors: {

            otp:
              "Invalid OTP"

          },

          success: {},

          formData: {

            otp

          },
          otpExpires:
  req.session.emailChangeOTPExpires || 0

        }

      );

    }

    // FIND USER

    const user =

      await User.findById(

        req.session.user.id

      );

    if (!user) {

      return res.render(

        "pages/user/profile/verify-email-change-otp",

        {

          title:
            "Verify Email Change",

          isLoggedIn: true,

          errors: {

            general:
              "User not found"

          },

          success: {},

          formData: {},
          otpExpires:
  req.session.emailChangeOTPExpires || 0

        }

      );

    }

    // GET PENDING DATA

    const pendingData =

      req.session.pendingProfileUpdate;

    // UPDATE USER

    user.name =
      pendingData.name;

    user.email =
      pendingData.email;

    user.phone =
      pendingData.phone;

    await user.save();

    // UPDATE SESSION

    req.session.user.name =
      user.name;

    req.session.user.email =
      user.email;

    // CLEANUP

    delete req.session.pendingProfileUpdate;

    delete req.session.emailChangeOTP;

    delete req.session.emailChangeOTPExpires;

    return res.render(

      "pages/user/profile/account-details",

      {

        title:
          "Velora - Profile",

        isLoggedIn: true,

        user,

        errors: {},

        success: {

          general:
            "Email updated successfully"

        },

        formData: {},
        otpExpires:
  req.session.emailChangeOTPExpires || 0

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/user/profile/verify-email-change-otp",

      {

        title:
          "Verify Email Change",

        isLoggedIn: true,

        errors: {

          general:
            "Something went wrong"

        },

        success: {},

        formData: {},
        otpExpires:
  req.session.emailChangeOTPExpires || 0

      }

    );

  }

};

exports.resendProfileOtp = async (req, res) => {

  try {

    if (
      !req.session.pendingProfileUpdate ||
      !req.session.pendingProfileUpdate.email
    ) {

      return res.render(
        "pages/user/profile/verify-email-change-otp",
        {
          title: "Verify Email Change",
          isLoggedIn: true,
          errors: {
            general: "Session expired. Please try again."
          },
          success: {},
          formData: {},
           otpExpires:
      req.session.emailChangeOTPExpires || 0
        }
      );

    }

    const otp = generateOTP();

    req.session.emailChangeOTP = otp;

    req.session.emailChangeOTPExpires =
      Date.now() + 60 * 1000;

    const transporter =
      await createTransporter();

    const info =
      await transporter.sendMail({

        from:
          '"Velora" <no-reply@velora.com>',

        to:
          req.session.pendingProfileUpdate.email,

        subject:
          "Email Change Verification OTP",

        text:
          `Your OTP is ${otp}`

      });

    console.log(
      nodemailer.getTestMessageUrl(info)
    );

    res.redirect(
      "/verify-email-change-otp"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/user/profile/verify-email-change-otp",
      {
        title: "Verify Email Change",
        isLoggedIn: true,
        errors: {
          general: "Failed to resend OTP"
        },
        success: {},
        formData: {},
        otpExpires:
      req.session.emailChangeOTPExpires || 0
      }
    );

  }

};

exports.getChangePassword = async (req, res) => {

  try {

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.render(

        "pages/user/profile/change-password",

        {

          title:
            "Change Password",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    res.render(

      "pages/user/profile/change-password",

      {

        title:
          "Change Password",

        isLoggedIn: true,

        user,

        errors: {},

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    return res.render(

      "pages/user/profile/change-password",

      {

        title:
          "Change Password",

        isLoggedIn: true,

        user: null,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

exports.postUpdatePassword =
async (req, res) => {

  try {

    const {

      newPassword,

      confirmPassword

    } = req.body;

    // FIND USER

    const user =

      await User.findById(

        req.session.user.id

      );

    if (!user) {

      return res.render(

        "pages/user/profile/change-password",

        {

          title:
            "Change Password",

          isLoggedIn: true,

          user: null,

          errors: {

            general:
              "User not found"

          },

          formData: {}

        }

      );

    }

    // TRIM

    const trimmedPassword =

      newPassword?.trim();

    const trimmedConfirmPassword =

      confirmPassword?.trim();

    // REGEX

    const passwordRegex =

      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    // ERRORS

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedPassword) {

      errors.newPassword =

        "Password is required";

    }

    if (!trimmedConfirmPassword) {

      errors.confirmPassword =

        "Confirm password is required";

    }

    // PASSWORD MATCH

    if (

      trimmedPassword &&

      trimmedConfirmPassword &&

      trimmedPassword !==

      trimmedConfirmPassword

    ) {

      errors.confirmPassword =

        "Passwords do not match";

    }

    // PASSWORD REGEX

    if (

      trimmedPassword &&

      !passwordRegex.test(

        trimmedPassword

      )

    ) {

      errors.newPassword =

        "Password must contain uppercase letter, number and minimum 6 characters";

    }

    // GOOGLE USER CHECK

    if (

      user.authProvider ===

      "google"

    ) {

      errors.general =

        "Google accounts cannot change password";

    }

    // RETURN ERRORS

    if (

      Object.keys(errors).length > 0

    ) {

      return res.render(

        "pages/user/profile/change-password",

        {

          title:
            "Change Password",

          isLoggedIn: true,

          user,

          errors,

          formData: {}

        }

      );

    }

    // HASH PASSWORD

    const hashedPassword =

      await bcrypt.hash(

        trimmedPassword,

        10

      );

    // UPDATE PASSWORD

    user.password =

      hashedPassword;

    await user.save();

    return res.render(

      "pages/guest/login",

      {

        title:
          "Velora - Login",

        isLoggedIn: false,

        user,

        errors: {},

        success: {

          general:
            "Password updated successfully"

        },

        formData: {}

      }

    );

  }

  catch (err) {

    console.log(err);

    const user =

      await User.findById(

        req.session.user?.id

      );

    return res.render(

      "pages/user/profile/change-password",

      {

        title:
          "Change Password",

        isLoggedIn: true,

        user,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {}

      }

    );

  }

};

