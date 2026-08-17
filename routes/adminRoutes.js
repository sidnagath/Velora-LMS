const express=require("express");
const router=express.Router();
const dashboardController = require('../controllers/admin/dashboardController');
const userController = require('../controllers/admin/userController');
const categoryController = require('../controllers/admin/categoryController');
const courseController = require('../controllers/admin/courseController');
const moduleController = require('../controllers/admin/moduleController');
const lessonController = require('../controllers/admin/lessonController');
const resourceController = require('../controllers/admin/resourceController');
const couponController = require("../controllers/admin/couponController");
const reportController = require("../controllers/admin/reportController");
const authController = require('../controllers/admin/authController');
const { isAdmin } = require('../middleware/adminMiddleware');
const {noCache} = require('../middleware/noCache');
const {isAdminGuest}=require('../middleware/adminGuestMiddleware');
const upload = require("../config/multer");

// =======================
// PAGE RENDER ROUTES
// =======================

// Dashboard
router.get("/admin/dashboard",noCache, isAdmin, dashboardController.getDashboard);


// User Management
router.get("/admin/users", noCache, isAdmin, userController.getAdminUsers);
router.get("/admin/users/create", noCache, isAdmin, userController.getAdminCreateUser);
router.get("/admin/users/:id/edit", noCache, isAdmin, userController.getAdminEditUser);

// Category Management
router.get("/admin/categories", noCache, isAdmin, categoryController.getAdminCategories);
router.get("/admin/categories/create", noCache, isAdmin, categoryController.getAdminAddCategory);
router.get("/admin/categories/:categoryId/edit", noCache, isAdmin, categoryController.getAdminEditCategory);

// Course Management
router.get("/admin/courses", noCache, isAdmin, courseController.getAdminCourses);
router.get("/admin/courses/create", noCache, isAdmin, courseController.getAdminCreateCourse);
router.get("/admin/courses/:courseId/edit", noCache, isAdmin, courseController.getAdminEditCourse);
router.get("/admin/courses/:courseId", noCache, isAdmin, courseController.getViewCourse);
router.get('/admin/courses/:courseId/modules', noCache, isAdmin, moduleController.getAdminCourseModules);
router.get('/admin/courses/:courseId/publish', noCache, isAdmin, courseController.getAdminCoursePublish);

// Orders
const orderController = require("../controllers/admin/orderController");
router.get("/admin/orders", noCache, isAdmin, orderController.getAdminOrders);
router.get("/admin/orders/:id", noCache, isAdmin, orderController.getAdminOrderDetails);

// Coupons
router.get("/admin/coupons", noCache, isAdmin, couponController.getAdminCoupons);
router.get("/admin/coupons/create", noCache, isAdmin, couponController.getAdminCreateCoupon);
router.get("/admin/coupons/:couponId/edit", noCache, isAdmin, couponController.getAdminEditCoupon);

// Reports
router.get("/admin/reports",noCache, isAdmin, reportController.getReports);
router.get("/admin/reports/export", noCache, isAdmin, reportController.exportReportPDF);

// Logout
router.get("/admin/logout", noCache, authController.getAdminLogout);

// =======================
// API ROUTES (/api/v1/admin)
// =======================

// User Management API
router.post("/api/v1/admin/users", upload.single("avatar"), isAdmin, userController.postAdminCreateUser);
router.patch("/api/v1/admin/users/:id", upload.single("avatar"), isAdmin, userController.postAdminEditUser);
router.delete("/api/v1/admin/users/:id", isAdmin, userController.deleteUser);

// Category Management API
router.post("/api/v1/admin/categories", upload.single("thumbnail"), noCache, isAdmin, categoryController.postAdminAddCategory);
router.patch("/api/v1/admin/categories/:categoryId", upload.single("thumbnail"), noCache, isAdmin, categoryController.postAdminEditCategory);
router.delete("/api/v1/admin/categories/:categoryId", noCache, isAdmin, categoryController.postAdminDeleteCategory);

// Course Management API
router.post("/api/v1/admin/courses", upload.fields([{ name: "thumbnail" },{ name: "trailer" }]), noCache, isAdmin, courseController.postAdminCreateCourse);
router.patch("/api/v1/admin/courses/:courseId", upload.fields([{ name: "thumbnail" },{ name: "trailer" }]), noCache, isAdmin, courseController.postAdminEditCourse);
router.delete("/api/v1/admin/courses/:courseId", noCache, isAdmin, courseController.postAdminDeleteCourse);
router.post('/api/v1/admin/courses/:courseId/publish', noCache, isAdmin, courseController.postAdminCoursePublish);
router.patch('/api/v1/admin/courses/:courseId/toggle-status', noCache, isAdmin, courseController.postAdminToggleCourseStatus);

// Modules API
router.post('/api/v1/admin/courses/:courseId/modules', noCache, isAdmin, moduleController.postAdminAddModule);
router.patch('/api/v1/admin/courses/:courseId/modules/:moduleId', noCache, isAdmin, moduleController.postAdminEditModule);
router.delete('/api/v1/admin/courses/:courseId/modules/:moduleId', noCache, isAdmin, moduleController.postAdminDeleteModule);

// Lessons API
router.post('/api/v1/admin/courses/:courseId/modules/:moduleId/lessons', upload.single("video"), noCache, isAdmin, lessonController.postAdminAddLesson);
router.patch("/api/v1/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId", upload.single("video"), noCache, isAdmin, lessonController.postAdminEditLesson);
router.delete('/api/v1/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId', noCache, isAdmin, lessonController.postAdminDeleteLesson);

// Resources API
router.post('/api/v1/admin/courses/:courseId/resources/file', upload.single("resourceFile"), noCache, isAdmin, resourceController.postAdminCourseResourcesUploadFile);
router.delete('/api/v1/admin/courses/:courseId/resources/file', noCache, isAdmin, resourceController.postAdminCourseResourcesDeleteFile);
router.post('/api/v1/admin/courses/:courseId/resources/link', noCache, isAdmin, resourceController.postAdminCourseResourcesAddLink);
router.delete('/api/v1/admin/courses/:courseId/resources/link', noCache, isAdmin, resourceController.postAdminCourseResourcesDeleteLink);

// Orders API
router.patch("/api/v1/admin/orders/:id/status", noCache, isAdmin, orderController.updateOrderStatus);
router.post("/api/v1/admin/orders/:id/refund/approve", noCache, isAdmin, orderController.approveRefund);
router.post("/api/v1/admin/orders/:id/refund/reject", noCache, isAdmin, orderController.rejectRefund);
router.post("/api/v1/admin/orders/:id/cancel", noCache, isAdmin, orderController.cancelOrder);

// Coupons API
router.post("/api/v1/admin/coupons", noCache, isAdmin, couponController.postAdminCreateCoupon);
router.patch("/api/v1/admin/coupons/:couponId", noCache, isAdmin, couponController.postAdminEditCoupon);
router.delete("/api/v1/admin/coupons/:couponId", noCache, isAdmin, couponController.postAdminDeleteCoupon);

module.exports=router;



