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

exports.getLogin = (req, res) => {

  if (req.session.user) {
    return res.redirect("/user-dashboard");
  }

  let errors = {};

  if (
    req.query.error ===
    "inactive"
  ) {

    errors.general =
      "Account is inactive";

  }

  res.render("pages/guest/login", {

    title: "Velora - Login",

    isLoggedIn: false,

    errors,

    formData: {}

  });

};

exports.postLogin = async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
      password?.trim();

    let errors = {};

    // REQUIRED VALIDATIONS

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    if (!trimmedPassword) {

      errors.password =
        "Password is required";

    }

    // IF REQUIRED ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/login",
        {
          title: "Velora - Login",
          isLoggedIn: false,
          errors,

          formData: {
            email: trimmedEmail
          }
        }
      );

    }

    // FIND USER

    const user =
      await User.findOne({
        email: trimmedEmail
      });

    if (!user) {

      return res.render(
        "pages/guest/login",
        {
          title: "Velora - Login",
          isLoggedIn: false,

          errors: {
            email:
              "User not found"
          },

          formData: {
            email: trimmedEmail
          }
        }
      );

    }

    // PASSWORD CHECK

    const isMatch =
      await bcrypt.compare(
        trimmedPassword,
        user.password
      );

    if (!isMatch) {

      return res.render(
        "pages/guest/login",
        {
          title: "Velora - Login",
          isLoggedIn: false,

          errors: {
            password:
              "Invalid credentials"
          },

          formData: {
            email: trimmedEmail
          }
        }
      );

    }

    // ACCOUNT STATUS CHECK

    if (
      user.status === "inactive"
    ) {

      return res.render(
        "pages/guest/login",
        {
          title: "Velora - Login",
          isLoggedIn: false,

          errors: {
            general:
              "Account is inactive"
          },

          formData: {
            email: trimmedEmail
          }
        }
      );

    }

    // SESSION

    req.session.user = {

      id: user._id,
      name: user.name,
      email: user.email

    };

    res.redirect(
      "/user-dashboard"
    );

  }

  catch (err) {

    console.log(err);

    res.render(
      "pages/guest/login",
      {
        title: "Velora - Login",
        isLoggedIn: false,

        errors: {
          general:
            "Something went wrong"
        },

        formData: {
          email: req.body.email
        }
      }
    );

  }

};

exports.getSignup = (req, res) => {

  if (req.session.user) {
    return res.redirect("/user-dashboard");
  }

  res.render("pages/guest/signup", {
    title: "Velora - Sign Up",
    isLoggedIn: false,
    errors: {},
    formData: {}
  });

};

exports.postSignup = async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      confirmPassword
    } = req.body;

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
      password?.trim();

    const trimmedConfirmPassword =
      confirmPassword?.trim();

    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    // ERRORS OBJECT

    let errors = {};

    // REQUIRED VALIDATIONS

    if (!trimmedName) {
      errors.name = "Name is required";
    }

    else if (!nameRegex.test(trimmedName)) {
      errors.name =
        "Name should contain only letters";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required";
    }

    else if (!emailRegex.test(trimmedEmail)) {
      errors.email =
        "Invalid email format";
    }

    if (!trimmedPassword) {
      errors.password =
        "Password is required";
    }

    else if (
      !passwordRegex.test(trimmedPassword)
    ) {

      errors.password =
        "Password must contain uppercase letter and number";

    }

    if (!trimmedConfirmPassword) {

      errors.confirmPassword =
        "Confirm Password is required";

    }

    else if (
      trimmedPassword !==
      trimmedConfirmPassword
    ) {

      errors.confirmPassword =
        "Passwords do not match";

    }

    // CHECK EXISTING USER

    const existingUser =
      await User.findOne({
        email: trimmedEmail
      });

    if (existingUser) {

      errors.email =
        "User already exists";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/signup",
        {
          title: "Velora - Sign Up",
          isLoggedIn: false,
          errors,

          formData: {
            name: trimmedName,
            email: trimmedEmail
          }
        }
      );

    }

    // GENERATE OTP

    const otp = generateOTP();

    // STORE TEMP SIGNUP DATA

    req.session.signupData = {

      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword

    };

    // STORE OTP

    req.session.signupOTP = otp;

    req.session.signupOTPExpires =
      Date.now() + 60 * 1000;

    // SEND EMAIL

    const transporter =
      await createTransporter();

    const info =
      await transporter.sendMail({

        from:
          '"Velora" <no-reply@velora.com>',

        to: trimmedEmail,

        subject:
          "Signup OTP",

        text:
          `Your OTP is ${otp}`

      });

    console.log(
      "Preview URL:",
      nodemailer.getTestMessageUrl(info)
    );

    res.redirect("/verify-signupotp");

  }

  catch (err) {

    console.log(err);

    res.render(
      "pages/guest/signup",
      {
        title: "Velora - Sign Up",
        isLoggedIn: false,

        errors: {
          general:
            "Something went wrong"
        },

        formData: {
          name: req.body.name,
          email: req.body.email
        }
      }
    );

  }

};

exports.googleAuthCallback =
(req, res, next) => {

  passport.authenticate(
    "google",
    (
      err,
      user,
      info
    ) => {

      if (err) {

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

      if (!user) {

        return res.render(
          "pages/guest/login",
          {
            title:
              "Velora - Login",

            isLoggedIn: false,

            errors: {
              general:
                info?.message ||
                "Google authentication failed"
            },

            formData: {}
          }
        );

      }

      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email
      };

      res.redirect("/user-dashboard");
    }

  )(req, res, next);

};

exports.getVerifySignupOtp =
(req, res) => {

  res.render(
    "pages/guest/verify-signupotp",
    {

      title:
        "Velora - Verify Signup OTP",

      isLoggedIn: false,

      errors: {},

      otpExpires:
        req.session.signupOTPExpires || 0

    }
  );

};

exports.postVerifySignupOtp = async (req, res) => {

  try {

    const { otp } = req.body;

    let errors = {};

    // EMPTY OTP

    if (!otp?.trim()) {

      errors.otp =
        "OTP is required";

    }

    // SESSION CHECK

    if (
      !req.session.signupOTP ||
      !req.session.signupOTPExpires ||
      !req.session.signupData
    ) {

      errors.general =
        "Session expired. Please signup again.";

    }

    // OTP EXPIRY

    else if (
      Date.now() >
      req.session.signupOTPExpires
    ) {

    errors.general =
  "OTP has expired. Please resend a new OTP.";

    }

    // OTP VALIDATION

    else if (
      otp.trim() !==
      req.session.signupOTP
    ) {

      errors.otp =
        "Invalid OTP";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
  "pages/guest/verify-signupotp",
  {
    title:
      "Velora - Verify Signup OTP",

    isLoggedIn: false,

    errors,

    otpExpires:
      req.session.signupOTPExpires || 0
  }
);

    }

    // GET SESSION DATA

    const {
      name,
      email,
      password
    } = req.session.signupData;

    // HASH PASSWORD

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // CREATE USER

    await User.create({

      name,

      email,

      password:
        hashedPassword

    });

    // CLEANUP

    delete req.session.signupData;

    delete req.session.signupOTP;

    delete req.session.signupOTPExpires;

    res.redirect("/login");

  }

  catch (err) {

    console.log(err);

   res.render(
  "pages/guest/verify-signupotp",
  {
    title:
      "Velora - Verify Signup OTP",

    isLoggedIn: false,

    errors: {

      general:
        "Something went wrong"

    },

    otpExpires:
      req.session.signupOTPExpires || 0
  }
);

  }

};

exports.resendSignupOtp = async (req, res) => {

  try {

    // SESSION CHECK

    if (
      !req.session.signupData
    ) {

      return res.render(
        "pages/guest/verify-signupotp",
        {
          title:
            "Velora - Verify Signup OTP",

          isLoggedIn: false,

          errors: {
            general:
              "Session expired. Please signup again."
          }
        }
      );

    }

    // GENERATE OTP

    const otp =
      generateOTP();

    // STORE OTP

    req.session.signupOTP =
      otp;

    req.session.signupOTPExpires =
      Date.now() + 60 * 1000;

    // SEND MAIL

    const transporter =
      await createTransporter();

    const info =
      await transporter.sendMail({

        from:
          '"Velora" <no-reply@velora.com>',

        to:
          req.session.signupData.email,

        subject:
          "Resend OTP",

        text:
          `Your OTP is ${otp}`

      });

    console.log(
      "Preview URL:",
      nodemailer.getTestMessageUrl(info)
    );

    res.redirect(
      "/verify-signupotp"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/verify-signupotp",
      {
        title:
          "Velora - Verify Signup OTP",

        isLoggedIn: false,

        errors: {
          general:
            "Failed to resend OTP"
        }
      }
    );

  }

};

exports.getAccountCreated = (req, res) => {
  res.render("pages/guest/account-created", {
      title: 'Velora - Account Created Successfully',
      isLoggedIn: false
  });
};

exports.getForgotPassword = (req, res) => {

  res.render(
    "pages/guest/forgot-password",
    {
      title:
        "Velora - Forgot Password",

      isLoggedIn: false,

      errors: {},

      formData: {}

    }
  );

};

exports.postForgotPassword = async (req, res) => {

  try {

    const { email } = req.body;

    const trimmedEmail =
      email?.trim();

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    // USER CHECK

    const user = await User.findOne({
  email: trimmedEmail
});

if (!user) {

  errors.email = "User not found";

}
else if (user.status === "inactive") {

  errors.email = "Account is blocked. Please contact support.";

}

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/forgot-password",
        {
          title:
            "Velora - Forgot Password",

          isLoggedIn: false,

          errors,

          formData: {
            email: trimmedEmail
          }
        }
      );

    }

    // GENERATE OTP

    const otp =
      generateOTP();

    // STORE SESSION DATA

    req.session.resetOTP =
      otp;

    req.session.resetEmail =
      trimmedEmail;

    req.session.otpExpires =
      Date.now() + 60 * 1000;

    // SEND EMAIL

    const transporter =
      await createTransporter();

    const info =
      await transporter.sendMail({

        from:
          '"Velora" <no-reply@velora.com>',

        to:
          trimmedEmail,

        subject:
          "Password Reset OTP",

        text:
          `Your OTP is ${otp}`

      });

    console.log(
      "Preview URL:",
      nodemailer.getTestMessageUrl(info)
    );

    res.redirect(
      "/verify-otp"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/forgot-password",
      {
        title:
          "Velora - Forgot Password",

        isLoggedIn: false,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {
          email: req.body.email
        }
      }
    );

  }

};

exports.getVerifyOtp =
(req, res) => {


  res.render(
    "pages/guest/verify-otp",
    {
      title:
        "Velora - Verify OTP",

      isLoggedIn: false,

      errors: {},

      otpExpires:
        req.session.otpExpires || 0
    }
  );

};

exports.postVerifyOtp = (req, res) => {

  try {

    const { otp } = req.body;

    let errors = {};

    // EMPTY OTP

    if (!otp?.trim()) {

      errors.otp =
        "OTP is required";

    }

    // SESSION CHECK

    if (
      !req.session.resetOTP ||
      !req.session.otpExpires ||
      !req.session.resetEmail
    ) {

      errors.general =
        "Session expired. Please try again.";

    }

    // OTP EXPIRY

    else if (
      Date.now() >
      req.session.otpExpires
    ) {

      errors.general =
        "OTP expired";

    }

    // INVALID OTP

    else if (
      otp.trim() !==
      req.session.resetOTP
    ) {

      errors.otp =
        "Invalid OTP";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

     return res.render(

  "pages/guest/verify-otp",

  {

    title:
      "Velora - Verify OTP",

    isLoggedIn: false,

    errors,

    formData: {

      otp

    },
    otpExpires:
  req.session.otpExpires || 0

  }

);

    }

    // VERIFIED

    req.session.otpVerified =
      true;

    res.redirect(
      "/reset-password"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/verify-otp",
      {
        title:
          "Velora - Verify OTP",

        isLoggedIn: false,

        errors: {

          general:
            "Something went wrong"

        },
    otpExpires:
  req.session.otpExpires || 0
      }
    );

  }

};

exports.getResetPassword = (req, res) => {

  // OTP NOT VERIFIED

  if (!req.session.otpVerified) {

    return res.redirect(
      "/forgot-password"
    );

  }

  res.render(
    "pages/guest/reset-password",
    {
      title:
        "Velora - Reset Password",

      isLoggedIn: false,

      errors: {},

      formData: {}

    }
  );

};

exports.postResetPassword = async (req, res) => {

  try {

    const {
      password,
      confirmPassword
    } = req.body;

    // SESSION CHECK

    if (
      !req.session.otpVerified
    ) {

      return res.redirect(
        "/forgot-password"
      );

    }

    // TRIM

    const trimmedPassword =
      password?.trim();

    const trimmedConfirmPassword =
      confirmPassword?.trim();

    // REGEX

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    // ERRORS

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedPassword) {

      errors.password =
        "Password is required";

    }

    if (
      !trimmedConfirmPassword
    ) {

      errors.confirmPassword =
        "Confirm Password is required";

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

      errors.password =
        "Password must contain uppercase letter, number and minimum 6 characters";

    }

    // IF ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/reset-password",
        {
          title:
            "Velora - Reset Password",

          isLoggedIn: false,

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

    await User.updateOne(

      {
        email:
          req.session.resetEmail
      },

      {
        $set: {
          password:
            hashedPassword
        }
      }

    );

    // CLEAN SESSION

    delete req.session.resetOTP;

    delete req.session.resetEmail;

    delete req.session.otpExpires;

    delete req.session.otpVerified;

    res.redirect(
      "/password-updated"
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/reset-password",
      {
        title:
          "Velora - Reset Password",

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

exports.resendOtp = async (req, res) => {

  try {

    // SESSION CHECK

    if (
      !req.session.resetEmail
    ) {

      return res.render(
        "pages/guest/verify-otp",
        {
          title:
            "Velora - Verify OTP",

          isLoggedIn: false,

          errors: {

            general:
              "Session expired. Please try again."

        }
        ,
        otpExpires:
  req.session.otpExpires || 0
    }
     );

    }

    // GENERATE OTP

    const otp =
      generateOTP();

    // STORE OTP

    req.session.resetOTP =
      otp;

    req.session.otpExpires =
      Date.now() + 60 * 1000;

    // SEND EMAIL

    const transporter =
      await createTransporter();

    const info =
      await transporter.sendMail({

        from:
          '"Velora" <no-reply@velora.com>',

        to:
          req.session.resetEmail,

        subject:
          "Resend OTP",

        text:
          `Your OTP is ${otp}`

      });

    console.log(
      nodemailer.getTestMessageUrl(
        info
      )
    );

    res.redirect(
      "/verify-otp"
    );

  }


  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/verify-otp",
      {
        title:
          "Velora - Verify OTP",

        isLoggedIn: false,

        errors: {

          general:
            "Failed to resend OTP"
        },
 otpExpires:
  req.session.otpExpires || 0
        }
      );
  }


};

exports.getPasswordUpdated = (
  req,
  res
) => {

  res.render(
    "pages/guest/password-updated",
    {
      title:
        "Velora - Password Updated Successfully",

      isLoggedIn: false
    }
  );

};

exports.getAdminLogin = (req, res) => {

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  res.render(
    "pages/guest/admin-login",
    {
      title:
        "Velora - Admin Login",

      isLoggedIn: false,

      errors: {},

      formData: {}

    }
  );

};

exports.postAdminLogin =
async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
      password?.trim();

    let errors = {};

    // REQUIRED VALIDATION

    if (!trimmedEmail) {

      errors.email =
        "Email is required";

    }

    if (!trimmedPassword) {

      errors.password =
        "Password is required";

    }

    // IF REQUIRED ERRORS

    if (
      Object.keys(errors).length > 0
    ) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors,

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // FIND ADMIN

    const admin =
      await Admin.findOne({
        email:
          trimmedEmail
      });

    if (!admin) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors: {

            email:
              "Invalid email or password"

          },

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // PASSWORD CHECK

    const isMatch =
      await bcrypt.compare(
        trimmedPassword,
        admin.password
      );

    if (!isMatch) {

      return res.render(
        "pages/guest/admin-login",
        {
          title:
            "Velora - Admin Login",

          isLoggedIn: false,

          errors: {

            password:
              "Invalid email or password"

          },

          formData: {
            email:
              trimmedEmail
          }
        }
      );

    }

    // SESSION

    req.session.admin = {

      id:
        admin._id,

      email:
        admin.email

    };

    req.session.save(
      (err) => {

        if (err) {

          console.log(err);

          return res.render(
            "pages/guest/admin-login",
            {
              title:
                "Velora - Admin Login",

              isLoggedIn: false,

              errors: {

                general:
                  "Session error"

              },

              formData: {
                email:
                  trimmedEmail
              }
            }
          );

        }

        return res.redirect(
          "/admin-dashboard"
        );

      }
    );

  }

  catch (err) {

    console.log(err);

    return res.render(
      "pages/guest/admin-login",
      {
        title:
          "Velora - Admin Login",

        isLoggedIn: false,

        errors: {

          general:
            "Something went wrong"

        },

        formData: {
          email:
            req.body.email
        }
      }
    );

  }

};

exports.getAdminLogout = (req, res) => {

  delete req.session.admin;

  req.session.save(err => {

    if (err) {
      console.log(err);
      return res.redirect("/admin-login");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.redirect("/admin-login");
  });

};

