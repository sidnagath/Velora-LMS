import express from 'express';
import passport from 'passport';
import authController from '../controllers/user/authController.js';
import profileController from '../controllers/user/profileController.js';
import courseController from '../controllers/user/courseController.js';
import {isUser} from '../middleware/userMiddleware.js';
import {noCache} from '../middleware/noCache.js';
import {isUserGuest} from '../middleware/userGuestMiddleware.js';
import {ensureActiveUser} from '../middleware/ensureActiveUser.js';
import upload from '../config/multer.js';
import wishlistController from '../controllers/user/wishlistController.js';
import cartController from '../controllers/user/cartController.js';
import checkoutController from '../controllers/user/checkoutController.js';
import userOrderController from '../controllers/user/userOrderController.js';


const router=express.Router();

// PAGE ROUTES
router.get("/user/dashboard", noCache, isUser, ensureActiveUser, profileController.getDashboard);
router.get("/user/courses", noCache, isUser, ensureActiveUser, courseController.getCourses);
router.get("/user/courses/:courseId", noCache, isUser, ensureActiveUser, courseController.getCourseDetails);
router.get("/user/profile", noCache, isUser, ensureActiveUser, profileController.getProfileAccountDetails);
router.get("/user/address", noCache, isUser, ensureActiveUser, profileController.getAddressDetails);
router.get("/user/profile/edit", noCache, isUser, ensureActiveUser, profileController.getEditProfile);
router.get("/user/verify-email-change-otp", noCache, isUser, ensureActiveUser, profileController.getVerifyEmailChangeOtp);
router.get("/user/profile/change-password", noCache, isUser, ensureActiveUser, profileController.getChangePassword);
router.get("/user/profile/edit-address", noCache, isUser, ensureActiveUser, profileController.getEditAddress);
router.get("/user/logout", noCache, authController.getUserLogout);
router.get("/user/wishlist", noCache, isUser, ensureActiveUser, wishlistController.getWishlistPage);
router.get("/user/cart", noCache, isUser, ensureActiveUser, cartController.getCartPage);
router.get("/user/checkout", noCache, isUser, ensureActiveUser, checkoutController.getCheckoutPage);
router.get("/user/payment-success/:orderId", noCache, isUser, ensureActiveUser, checkoutController.getPaymentSuccess);
router.get("/user/payment-failure/:orderId", noCache, isUser, ensureActiveUser, checkoutController.getPaymentFailure);
router.get("/user/orders", noCache, isUser, ensureActiveUser, userOrderController.getUserOrders);
router.get("/user/orders/:id/invoice", noCache, isUser, ensureActiveUser, userOrderController.downloadInvoice);
router.get("/user/coupons", noCache, isUser, ensureActiveUser, profileController.getMyCoupons);
router.get("/user/my-courses", noCache, isUser, ensureActiveUser, courseController.getMyCourses);
router.get("/user/my-courses/:courseId", noCache,isUser, ensureActiveUser, courseController.getMyCourseDetails);
router.get("/user/my-courses/:courseId/lessons/:lessonId/video", noCache, isUser, ensureActiveUser, courseController.streamLessonVideo);
router.get("/user/my-courses/:courseId/certificate", noCache, isUser, ensureActiveUser, courseController.getCourseCertificate);
router.get("/user/wallet", noCache, isUser, ensureActiveUser, profileController.getWallet);

// API ROUTES
router.patch("/api/v1/user/profile/avatar", isUser, ensureActiveUser, upload.single("avatar"), profileController.postUpdateAvatar);
router.patch("/api/v1/user/profile", isUser, ensureActiveUser, profileController.postProfileDetails);
router.post("/api/v1/user/profile/verify-email-otp", isUser, ensureActiveUser, profileController.postVerifyEmailChangeOtp);
router.post("/api/v1/user/profile/resend-otp", isUser, ensureActiveUser, profileController.resendProfileOtp);
router.patch("/api/v1/user/profile/password", isUser, ensureActiveUser, profileController.postUpdatePassword);
router.patch("/api/v1/user/profile/address", isUser, ensureActiveUser, profileController.postUpdateAddress);

router.delete("/api/v1/user/wishlist/:courseId", isUser, ensureActiveUser, wishlistController.removeCourse);
router.post("/api/v1/user/wishlist/:courseId/cart", isUser, ensureActiveUser, wishlistController.moveToCart);
router.post("/api/v1/user/wishlist/toggle", isUser, ensureActiveUser, wishlistController.toggleWishlist);

router.delete("/api/v1/user/cart/:courseId", isUser, ensureActiveUser, cartController.removeCourse);
router.post("/api/v1/user/cart/:courseId/wishlist", isUser, ensureActiveUser, cartController.moveToWishlist);
router.post("/api/v1/user/cart/toggle", isUser, ensureActiveUser, cartController.toggleCart);

router.post("/api/v1/user/checkout/coupon", isUser, ensureActiveUser, checkoutController.applyCoupon);
router.post("/api/v1/user/order", isUser, ensureActiveUser, checkoutController.createRazorpayOrder);
router.post("/api/v1/user/order/wallet", isUser, ensureActiveUser, checkoutController.processWalletPayment);
router.post("/api/v1/user/order/verify", isUser, ensureActiveUser, checkoutController.verifyPayment);

router.post("/api/v1/user/orders/:id/refund", isUser, ensureActiveUser, userOrderController.refund);
router.post("/api/v1/user/orders/:id/cancel", isUser, ensureActiveUser, userOrderController.cancelOrder);
router.post("/api/v1/user/payment/cancel", isUser, ensureActiveUser, userOrderController.cancelPayment);
router.post("/api/v1/user/payment/failed", isUser, ensureActiveUser, userOrderController.failPayment);
router.post("/api/v1/user/payment/retry", isUser, ensureActiveUser, userOrderController.retryPayment);

router.post("/api/v1/user/mycourses/:courseId/lessons/:lessonId/complete", isUser, ensureActiveUser, courseController.markLessonComplete);

export default router;

