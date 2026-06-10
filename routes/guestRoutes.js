const express=require("express");
const passport = require("passport");
const router=express.Router();
const guestCourseController = require('../controllers/guest/courseController');
const guestAuthController= require('../controllers/guest/authController');
const {isUser}=require("../middleware/userMiddleware");
const {noCache} = require('../middleware/noCache');
const {isUserGuest}=require('../middleware/userGuestMiddleware');
const {isAdminGuest}=require('../middleware/adminGuestMiddleware');

router.get("/",noCache,guestCourseController.getHome);
router.get("/home",noCache,guestCourseController.getHome);

router.get("/courses",noCache,guestCourseController.getCourses);
router.get("/courses/:courseId",noCache,guestCourseController.getCourseDetails);

router.get("/admin-login", noCache,isAdminGuest,guestAuthController.getAdminLogin);
router.post("/admin-login", guestAuthController.postAdminLogin);


router.get("/login",noCache,isUserGuest,guestAuthController.getLogin);
router.post("/login", guestAuthController.postLogin);

router.get("/auth/google",noCache,passport.authenticate("google",{scope: ["profile", "email"], prompt: "select_account"}));
router.get("/auth/google/callback",noCache,guestAuthController.googleAuthCallback);


router.get("/signup", noCache,isUserGuest,guestAuthController.getSignup);
router.post("/signup", guestAuthController.postSignup);

router.get("/verify-signupotp",noCache,guestAuthController.getVerifySignupOtp);
router.post("/verify-signupotp",guestAuthController.postVerifySignupOtp);


router.post("/resend-signupotp", guestAuthController.resendSignupOtp);

router.get("/account-created",noCache,guestAuthController.getAccountCreated);

router.get("/forgot-password",noCache,isUserGuest,guestAuthController.getForgotPassword);
router.post("/forgot-password", guestAuthController.postForgotPassword);

router.get("/verify-otp",noCache,isUserGuest,guestAuthController.getVerifyOtp);
router.post("/verify-otp", guestAuthController.postVerifyOtp);

router.get("/reset-password",noCache,isUserGuest,guestAuthController.getResetPassword);
router.post("/reset-password", guestAuthController.postResetPassword);

router.post("/resend-otp", guestAuthController.resendOtp);

router.get("/password-updated",noCache,isUserGuest,guestAuthController.getPasswordUpdated);

module.exports=router;
