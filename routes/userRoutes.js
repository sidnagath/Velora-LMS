const express=require("express");
const passport = require("passport");
const router=express.Router();
const userController=require("../controllers/userController");
const {isUser}=require("../middleware/userMiddleware");
const {noCache} = require('../middleware/noCache');
const {isUserGuest}=require('../middleware/userGuestMiddleware');
const upload = require("../config/multer");


router.get("/login",noCache,isUserGuest,userController.getLogin);
router.post("/login", userController.postLogin);

router.get("/auth/google",noCache,passport.authenticate("google",{scope: ["profile", "email"], prompt: "select_account"}));
router.get("/auth/google/callback",noCache,passport.authenticate("google",{failureRedirect: "/login", failureFlash: true}),userController.googleAuthCallback);


router.get("/signup", noCache,userController.getSignup);
router.post("/signup", userController.postSignup);

router.get("/verify-signupotp",noCache,userController.getVerifySignupOtp);
router.post("/verify-signupotp",userController.postVerifySignupOtp);


router.post("/resend-signupotp", userController.resendSignupOtp);

router.get("/account-created",noCache,userController.getAccountCreated);

router.get("/forgot-password",noCache,userController.getForgotPassword);
router.post("/forgot-password", userController.postForgotPassword);

router.get("/verify-otp",noCache,userController.getVerifyOtp);
router.post("/verify-otp", userController.postVerifyOtp);

router.get("/reset-password",noCache,userController.getResetPassword);
router.post("/reset-password", userController.postResetPassword);

router.post("/resend-otp", userController.resendOtp);

router.get("/password-updated",noCache,userController.getPasswordUpdated);

router.get("/user-dashboard", noCache, isUser,userController.getDashboard);

router.get("/user-courses", noCache, isUser,userController.getCourses);

router.get("/user-courses/:courseId", noCache, isUser,userController.getCourseDetails);

router.get("/user-profile",noCache,isUser,userController.getProfileAccountDetails);

router.post("/user-profile/update-avatar",isUser,upload.single("avatar"),userController.postUpdateAvatar);

router.get("/user-profile/edit",noCache,isUser,userController.getEditProfile);

router.post("/user-profile/edit",isUser,userController.postProfileDetails);


router.get("/verify-email-change-otp",noCache,isUser,userController.getVerifyEmailChangeOtp);

router.post("/verify-email-change-otp",isUser,userController.postVerifyEmailChangeOtp);

router.get("/user-profile/change-password",noCache,isUser,userController.getChangePassword);

router.post("/user-profile/change-password",isUser,userController.postUpdatePassword);

router.get("/user-logout",noCache,userController.getUserLogout);

module.exports=router;


