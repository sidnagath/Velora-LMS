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

const wishlistController = require('../controllers/user/wishlistController');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController');
const userOrderController = require('../controllers/user/userOrderController');



router.get("/user-dashboard", noCache, isUser,ensureActiveUser,profileController.getDashboard);

router.get("/user-courses", noCache, isUser,ensureActiveUser, courseController.getCourses);

router.get("/user-courses/:courseId", noCache, isUser,ensureActiveUser,courseController.getCourseDetails);

router.get("/user-profile",noCache,isUser,ensureActiveUser,profileController.getProfileAccountDetails);

router.get("/user-address",noCache,isUser,ensureActiveUser,profileController.getAddressDetails);

router.post("/user-profile/update-avatar",isUser,ensureActiveUser,upload.single("avatar"),profileController.postUpdateAvatar);

router.get("/user-profile/edit",noCache,isUser,ensureActiveUser,profileController.getEditProfile);

router.post("/user-profile/edit",isUser,ensureActiveUser,profileController.postProfileDetails);


router.get("/verify-email-change-otp",noCache,isUser,ensureActiveUser,profileController.getVerifyEmailChangeOtp);

router.post("/verify-email-change-otp",isUser,ensureActiveUser,profileController.postVerifyEmailChangeOtp);

router.post("/resend-profile-otp",isUser,ensureActiveUser,profileController.resendProfileOtp);

router.get("/user-profile/change-password",noCache,isUser,ensureActiveUser,profileController.getChangePassword);

router.post("/user-profile/change-password",isUser,ensureActiveUser,profileController.postUpdatePassword);

router.get("/user-profile/edit-address",noCache,isUser,ensureActiveUser,profileController.getEditAddress);

router.post("/user-profile/edit-address",isUser,ensureActiveUser,profileController.postUpdateAddress);

router.get("/user-logout",noCache,authController.getUserLogout);

router.get("/user-wishlist", noCache, isUser, ensureActiveUser, wishlistController.getWishlistPage);
router.post("/user-wishlist/remove/:courseId", isUser, ensureActiveUser, wishlistController.removeCourse);
router.post("/user-wishlist/move-to-cart/:courseId",isUser,ensureActiveUser,wishlistController.moveToCart);
router.post("/api/user-wishlist/toggle", isUser, ensureActiveUser, wishlistController.toggleWishlist);

router.get("/user-cart", noCache, isUser, ensureActiveUser, cartController.getCartPage);
router.post("/user-cart/remove/:courseId", isUser, ensureActiveUser, cartController.removeCourse);
router.post("/user-cart/move-to-wishlist/:courseId", isUser, ensureActiveUser, cartController.moveToWishlist);
router.post("/api/user-cart/toggle", isUser, ensureActiveUser, cartController.toggleCart);
router.get("/user-checkout",noCache, isUser, ensureActiveUser, checkoutController.getCheckoutPage);
router.post("/api/user-checkout/apply-coupon", isUser, ensureActiveUser, checkoutController.applyCoupon);

// Razorpay endpoints
router.post("/api/create-order", isUser, ensureActiveUser, checkoutController.createRazorpayOrder);
router.post("/api/verify-payment", isUser, ensureActiveUser, checkoutController.verifyPayment);
router.get("/payment-success/:orderId", noCache, isUser, ensureActiveUser, checkoutController.getPaymentSuccess);

router.get("/user-orders", noCache, isUser, ensureActiveUser, userOrderController.getUserOrders);
router.post("/payment/cancel", isUser, ensureActiveUser, userOrderController.cancelPayment);
router.post("/payment/failed", isUser, ensureActiveUser, userOrderController.failPayment);
router.post("/api/retry-payment", isUser, ensureActiveUser, userOrderController.retryPayment);

router.get("/user-profile/my-coupons", noCache, isUser, ensureActiveUser, profileController.getMyCoupons);
router.get("/my-courses", noCache, isUser, ensureActiveUser, courseController.getMyCourses);
router.get("/user-courses", noCache, isUser, ensureActiveUser, courseController.getCourses);

module.exports=router;


