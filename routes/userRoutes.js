const express=require("express");
const passport = require("passport");
const router=express.Router();
const userController=require("../controllers/userController");
const {isUser}=require("../middleware/userMiddleware");
const {noCache} = require('../middleware/noCache');
const {isUserGuest}=require('../middleware/userGuestMiddleware');
const upload = require("../config/multer");

router.get("/",userController.getHome);
router.get("/home",userController.getHome);
router.get("/login",noCache,isUserGuest,userController.getLogin);
router.post("/login", userController.postLogin);

router.get("/auth/google",passport.authenticate("google",{scope: ["profile", "email"], prompt: "select_account"}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect: "/login"}),userController.googleAuthCallback);


router.get("/signup", noCache, userController.getSignup);
router.post("/signup", userController.postSignup);

router.get("/account-created", userController.getAccountCreated);

router.get("/forgot-password", userController.getForgotPassword);
router.post("/forgot-password", userController.postForgotPassword);

router.get("/verify-otp", userController.getVerifyOtp);
router.post("/verify-otp", userController.postVerifyOtp);

router.get("/reset-password", userController.getResetPassword);
router.post("/reset-password", userController.postResetPassword);

router.post("/resend-otp", userController.resendOtp);

router.get("/password-updated", userController.getPasswordUpdated);

router.get("/user-dashboard", noCache, isUser,userController.getDashboard);

router.get("/user-profile",noCache,isUser,userController.getProfileAccountDetails);

router.post("/user-profile/update-avatar",isUser,upload.single("avatar"),userController.postUpdateAvatar);

router.get("/user-profile/edit",noCache,isUser,userController.getEditProfile);

router.post("/user-profile/edit",isUser,userController.postProfileDetails);

router.get("/user-profile/change-password",noCache,isUser,userController.getChangePassword);

router.post("/user-profile/change-password",isUser,userController.postUpdatePassword);

router.get("/user-logout",noCache,userController.getUserLogout);

module.exports=router;


