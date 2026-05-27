const User=require("../models/userModel");
const Course=require("../models/courseModel");
const Module=require("../models/moduleModel");
const Lesson=require("../models/lessonModel");
const bcrypt=require("bcrypt");
const nodemailer = require("nodemailer");

const createTransporter = require("../config/mail");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//Guest Home
exports.getHome=(req, res) => {

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  if (req.session.user) {

    return res.redirect(
      "/user-dashboard"
    );

  }
    res.render('pages/guest/home', { 
        title: 'Velora - Master Coding With Focus', 
        isLoggedIn: false 
    })
  }


//Login
exports.getLogin = (req, res) => {

  if (req.session.user) {
    return res.redirect("/user-dashboard");
  }

  if (req.session.admin) {
    return res.redirect("/admin-dashboard");
  }

  res.render("pages/guest/login", {

    title: "Velora - Login",

    isLoggedIn: false,

    errors: {},

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


//SignUp

exports.getSignup = (req, res) => {

  if (req.session.user) {
    return res.redirect("/user-dashboard");
  }

  if (req.session.admin) {
    return res.redirect("/admin-dashboard");
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



exports.getVerifySignupOtp = (req, res) => {

  res.render(
    "pages/guest/verify-signupotp",
    {
      title:
        "Velora - Verify Signup OTP",

      isLoggedIn: false,

      errors: {}
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
        "OTP expired";

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

          errors
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

        }
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

exports.googleAuthCallback =
async (req, res) => {

  try {

    // GOOGLE AUTH FAILED

    if (!req.user) {

      return res.render(
        "pages/guest/login",
        {
          title:
            "Velora - Login",

          isLoggedIn: false,

          errors: {
            general:
              "Google authentication failed"
          },

          formData: {}
        }
      );

    }

    // INACTIVE ACCOUNT

    if (
      req.user.status ===
      "inactive"
    ) {

      return res.render(
        "pages/guest/login",
        {
          title:
            "Velora - Login",

          isLoggedIn: false,

          errors: {
            general:
              "Account is inactive"
          },

          formData: {}
        }
      );

    }

    // SESSION

    req.session.user = {

      id:
        req.user._id,

      name:
        req.user.name,

      email:
        req.user.email

    };

    res.redirect(
      "/user-dashboard"
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

// --- New Authentication Flows ---


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

    const user =
      await User.findOne({
        email: trimmedEmail
      });

    if (!user) {

      errors.email =
        "User not found";

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

exports.getVerifyOtp = (req, res) => {

  res.render(
    "pages/guest/verify-otp",
    {
      title:
        "Velora - Verify OTP",

      isLoggedIn: false,

      errors: {},

      formData: {
  otp
}
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

          errors
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

        }
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

        }
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


//User-Home
exports.getDashboard = async (req, res) => {

  try {

    const user = await User.findById(
      req.session.user.id
    );

    res.render(
      "pages/user/home/dashboard",
      {
        title: "Velora - Dashboard",

        isLoggedIn: true,

        user
      }
    );

  }

  catch (err) {

    console.log(err);

    res.redirect("/login");
  }

};

//User-Profile-Account Details

exports.getProfileAccountDetails = async (req, res) => {

  try {

    const user = await User.findById(
      req.session.user.id
    );

    res.render(
      "pages/user/profile/account-details",
      {
        title:
          "Velora - Profile",

        isLoggedIn: true,

        user
      }
    );

  }

  catch(err) {

    console.log(err);

    res.redirect("/login");
  }

};

exports.postUpdateAvatar = async (req, res) => {

  try {

    if (!req.file) {

      req.flash(
        "error",
        "Please select an image"
      );

      return res.redirect(
        "/user-profile"
      );
    }

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.redirect("/login");
    }

    user.avatar =
      "/uploads/" + req.file.filename;

    await user.save();

    req.flash(
      "success",
      "Profile picture updated"
    );

    res.redirect("/user-profile");

  }

  catch (err) {

    console.log(err);

    res.redirect("/user-profile");
  }

};


exports.getEditProfile = async (req, res) => {

  try {

    const user = await User.findById(
      req.session.user.id
    );

    res.render(
      'pages/user/profile/edit-profile',
      {
        title: 'Edit Profile',
        isLoggedIn: true,
        user
      }
    );

  } catch (err) {

    console.log(err);

    res.redirect('/user-profile');
  }
};

exports.getChangePassword = async (req, res) => {

  try {

    const user = await User.findById(
      req.session.user.id
    );


    res.render(
      'pages/user/profile/change-password',
      {
        title: 'Change Password',
        isLoggedIn: true,
        user,
      }
    );

  } catch (err) {

    console.log(err);

    res.redirect('/user-profile');
  }
};

// ==============================
// POST EDIT PROFILE
// ==============================

exports.postProfileDetails = async (req, res) => {


  try {

    const {
      name,
      email,
      phone
    } = req.body;

    // TRIM VALUES
    const trimmedName =
      name.trim();

    const trimmedEmail =
      email.trim();

    const trimmedPhone =
      phone ? phone.trim() : "";



    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
       /^[6-9]\d{9}$/;



    // REQUIRED VALIDATION

    if (
      !trimmedName ||
      !trimmedEmail
    ) {

      req.flash(
        "error",
        "Name and email are required"
      );

      return res.redirect(
        "/user-profile/edit"
      );
    }



    // NAME VALIDATION

    if (
      !nameRegex.test(trimmedName)
    ) {

      req.flash(
        "error",
        "Name should contain only letters"
      );

      return res.redirect(
        "/user-profile/edit"
      );
    }



    // EMAIL VALIDATION

    if (
      !emailRegex.test(trimmedEmail)
    ) {

      req.flash(
        "error",
        "Invalid email format"
      );

      return res.redirect(
        "/user-profile/edit"
      );
    }



    // PHONE VALIDATION
    // only validate if phone exists

    if (
      trimmedPhone &&
      !phoneRegex.test(trimmedPhone)
    ) {

      req.flash(
        "error",
        "Enter valid 10 digit phone number"
      );

      return res.redirect(
        "/user-profile/edit"
      );
    }



    // FIND USER

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.redirect("/login");
    }
 
  // GOOGLE USER CHECK

  if(user.authProvider === "google"){

  req.flash(
    "error",

    "Google accounts cannot edit profile details"
  );

  return res.redirect(
    "/user-profile"
  );
  }

    // DUPLICATE EMAIL CHECK

    const existingUser =
      await User.findOne({

        email: trimmedEmail,

        _id: {
          $ne: user._id
        }

      });

    if (existingUser) {

      req.flash(
        "error",
        "Email already exists"
      );

      return res.redirect(
        "/user-profile/edit"
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

    name: trimmedName,

    email: trimmedEmail,

    phone: trimmedPhone

  };



  // STORE OTP

  req.session.emailChangeOTP =
    otp;

  req.session.emailChangeOTPExpires =
    Date.now() + 60 * 1000;



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
    nodemailer.getTestMessageUrl(info)
  );



  req.flash(
    "success",
    "OTP sent to new email"
  );



  return res.redirect(
    "/verify-email-change-otp"
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



    req.flash(
      "success",
      "Profile updated successfully"
    );

    res.redirect(
      "/user-profile"
    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/user-profile/edit"
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

      isLoggedIn: true

    }

  );

};


exports.postVerifyEmailChangeOtp =
async (req, res) => {

  const { otp } =
    req.body;



  // EXPIRY CHECK

  if (
    Date.now() >
    req.session.emailChangeOTPExpires
  ) {

    req.flash(
      "error",
      "OTP expired"
    );

    return res.redirect(
      "/verify-email-change-otp"
    );

  }



  // OTP CHECK

  if (
    otp !==
    req.session.emailChangeOTP
  ) {

    req.flash(
      "error",
      "Invalid OTP"
    );

    return res.redirect(
      "/verify-email-change-otp"
    );

  }



  // FIND USER

  const user =
    await User.findById(
      req.session.user.id
    );



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



  req.flash(
    "success",
    "Email updated successfully"
  );



  res.redirect(
    "/user-profile"
  );

};

// ==============================
// POST CHANGE PASSWORD
// ==============================

exports.postUpdatePassword = async (req, res) => {


  try {

    const {
      newPassword,
      confirmPassword
    } = req.body;



    // TRIM

    const trimmedPassword =
      newPassword.trim();

    const trimmedConfirmPassword =
      confirmPassword.trim();



    // REGEX

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;



    // REQUIRED VALIDATION

    if (
      !trimmedPassword ||
      !trimmedConfirmPassword
    ) {

      req.flash(
        "error",
        "All fields are required"
      );

      return res.redirect(
        "/user-profile/change-password"
      );
    }



    // PASSWORD MATCH

    if (
      trimmedPassword !==
      trimmedConfirmPassword
    ) {

      req.flash(
        "error",
        "Passwords do not match"
      );

      return res.redirect(
        "/user-profile/change-password"
      );
    }



    // PASSWORD REGEX VALIDATION

    if (
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      req.flash(
        "error",

        "Password must contain uppercase letter, number and minimum 6 characters"
      );

      return res.redirect(
        "/user-profile/change-password"
      );
    }



    // FIND USER

    const user =
      await User.findById(
        req.session.user.id
      );

    if (!user) {

      return res.redirect("/login");
    }

// GOOGLE USER CHECK

     if(user.authProvider === "google"){

  req.flash(
    "error",

    "Google accounts cannot change password"
  );

  return res.redirect(
    "/user-profile"
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



    req.flash(
      "success",
      "Password updated successfully"
    );



    res.redirect(
      "/user-profile"
    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/user-profile/change-password"
    );

  }

};


// ─── Courses Listing ─────────────────────────────────────────────────────────
exports.getCourses = async (req, res) => {
  try {
    const { category, level, price, search, page = 1 } = req.query;
    const LIMIT = 6;
    const skip = (parseInt(page) - 1) * LIMIT;

const selectedCategory = category || "html";

const filter = {
  status: "published",
  isDeleted: false,

  category: {
    $regex: new RegExp(`^${selectedCategory}$`, "i")
  }
};

if (level) {
  filter.level = {
    $regex: new RegExp(`^${level}$`, "i")
  };
}

if (price === "free") {
  filter.pricingType = "free";
}

if (price === "paid") {
  filter.pricingType = "paid";
}

if (search) {
  filter.title = {
    $regex: search,
    $options: "i"
  };
}

    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
  .sort({
  rating: -1,
  reviewsCount: -1,
  createdAt: -1,
  _id: -1
})
  .skip(skip)
  .limit(LIMIT)
  .lean(),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / LIMIT);

    const isLoggedIn = !!(req.session && req.session.user);
    const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;

//     const wishlist = await Wishlist.findOne({
//   userId: req.user._id
// });

// const wishlistCourseIds =
//   wishlist?.courses.map(
//     course => course.toString()
//   ) || [];

// const cart = await Cart.findOne({
//   userId: req.user._id
// });

// const cartCourseIds =
//   cart?.courses.map(
//     course => course.toString()
//   ) || [];

    res.render('pages/user/courses/courses', {
      title: 'Velora - Explore Courses',
      isLoggedIn,
      user,
      courses,
      totalPages,
      currentPage:      parseInt(page),
      selectedCategory: selectedCategory,
      selectedLevel:    level    || '',
      selectedPrice:    price    || '',
      search:           search   || '',
      wishlistCourseIds:[],
      cartCourseIds:[]
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
};

// ─── Course Detail ────────────────────────────────────────────────────────────
exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id:       req.params.courseId,
      status:    'published',
      isDeleted: false
    }).lean();

    if (!course) return res.redirect('/user-courses');

    const modules = await Module.find({ courseId: course._id })
      .sort({ order: 1 }).lean();

    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ moduleId: mod._id })
          .sort({ order: 1 }).lean();
        return { ...mod, lessons };
      })
    );

    const totalLessons = modulesWithLessons.reduce(
      (sum, m) => sum + m.lessons.length, 0
    );

    const relatedCourses = await Course.find({
      category:  course.category,
      _id:       { $ne: course._id },
      status:    'published',
      isDeleted: false
    }).limit(4).lean();

    const isLoggedIn = !!(req.session && req.session.user);
    const user = isLoggedIn ? await User.findById(req.session.user.id).lean() : null;

    res.render('pages/user/courses/course-detail', {
      title:              `Velora - ${course.title}`,
      isLoggedIn,
      user,
      course,
      modulesWithLessons,
      totalLessons,
      relatedCourses
    });
  } catch (err) {
    console.log(err);
    res.redirect('/user-courses');
  }
};



//User-Profile-Logout
exports.getUserLogout =
(req, res) => {

  delete req.session.user;

  req.logout?.(() => {});

  res.setHeader(

    "Cache-Control",

    "no-store, no-cache, must-revalidate, private"
  );

  res.redirect("/login");

};


