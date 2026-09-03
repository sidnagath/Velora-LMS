import express from 'express';
import passport from 'passport';
import guestCourseController from '../controllers/guest/courseController.js';
import guestAuthController from '../controllers/guest/authController.js';
import {isUser} from '../middleware/userMiddleware.js';
import {noCache} from '../middleware/noCache.js';
import {isUserGuest} from '../middleware/userGuestMiddleware.js';
import {isAdminGuest} from '../middleware/adminGuestMiddleware.js';


const router=express.Router();

router.get("/", noCache, isUserGuest, guestCourseController.getHome);
router.get("/home", noCache, isUserGuest, guestCourseController.getHome);

router.get("/courses",noCache,guestCourseController.getCourses);
router.get("/courses/:courseId",noCache,guestCourseController.getCourseDetails);

router.get("/auth/admin-login", noCache,isAdminGuest,guestAuthController.getAdminLogin);
router.post("/api/v1/auth/admin-login", guestAuthController.postAdminLogin);

router.get("/auth/login",noCache,isUserGuest,guestAuthController.getLogin);
router.post("/api/v1/auth/login", guestAuthController.postLogin);

router.get("/account-blocked", noCache, isUserGuest, guestAuthController.getAccountBlocked);

router.get("/auth/google",noCache,passport.authenticate("google",{scope: ["profile", "email"], prompt: "select_account"}));
router.get("/auth/google/callback",noCache,guestAuthController.googleAuthCallback);

router.get("/auth/signup", noCache,isUserGuest,guestAuthController.getSignup);
router.post("/api/v1/auth/signup", guestAuthController.postSignup);

router.get("/auth/verify-signupotp",noCache,guestAuthController.getVerifySignupOtp);
router.post("/api/v1/auth/verify-signupotp",guestAuthController.postVerifySignupOtp);

router.post("/api/v1/auth/resend-signupotp", guestAuthController.resendSignupOtp);

router.get("/auth/account-created",noCache,guestAuthController.getAccountCreated);

router.get("/auth/forgot-password",noCache,isUserGuest,guestAuthController.getForgotPassword);
router.post("/api/v1/auth/forgot-password", guestAuthController.postForgotPassword);

router.get("/auth/verify-otp",noCache,isUserGuest,guestAuthController.getVerifyOtp);
router.post("/api/v1/auth/verify-otp", guestAuthController.postVerifyOtp);

router.get("/auth/reset-password",noCache,isUserGuest,guestAuthController.getResetPassword);
router.post("/api/v1/auth/reset-password", guestAuthController.postResetPassword);

router.post("/api/v1/auth/resend-otp", guestAuthController.resendOtp);

router.get("/auth/password-updated",noCache,isUserGuest,guestAuthController.getPasswordUpdated);

export default router;
