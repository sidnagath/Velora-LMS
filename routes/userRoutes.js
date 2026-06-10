const express=require("express");
const passport = require("passport");
const router=express.Router();
const authController = require('../controllers/user/authController');
const profileController = require('../controllers/user/profileController');
const courseController = require('../controllers/user/courseController');
const {isUser}=require("../middleware/userMiddleware");
const {noCache} = require('../middleware/noCache');
const {isUserGuest}=require('../middleware/userGuestMiddleware');
const {ensureActiveUser}=require('../middleware/ensureActiveUser');
const upload = require("../config/multer");



router.get("/user-dashboard", noCache, isUser,ensureActiveUser,profileController.getDashboard);

router.get("/user-courses", noCache, isUser,ensureActiveUser, courseController.getCourses);

router.get("/user-courses/:courseId", noCache, isUser,ensureActiveUser,courseController.getCourseDetails);

router.get("/user-profile",noCache,isUser,ensureActiveUser,profileController.getProfileAccountDetails);

router.post("/user-profile/update-avatar",isUser,ensureActiveUser,upload.single("avatar"),profileController.postUpdateAvatar);

router.get("/user-profile/edit",noCache,isUser,ensureActiveUser,profileController.getEditProfile);

router.post("/user-profile/edit",isUser,ensureActiveUser,profileController.postProfileDetails);


router.get("/verify-email-change-otp",noCache,isUser,ensureActiveUser,profileController.getVerifyEmailChangeOtp);

router.post("/verify-email-change-otp",isUser,ensureActiveUser,profileController.postVerifyEmailChangeOtp);

router.post("/resend-profile-otp",isUser,ensureActiveUser,profileController.resendProfileOtp);

router.get("/user-profile/change-password",noCache,isUser,ensureActiveUser,profileController.getChangePassword);

router.post("/user-profile/change-password",isUser,ensureActiveUser,profileController.postUpdatePassword);

router.get("/user-logout",noCache,authController.getUserLogout);

module.exports=router;


