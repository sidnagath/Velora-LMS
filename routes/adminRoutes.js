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
const authController = require('../controllers/admin/authController');
const { isAdmin } = require('../middleware/adminMiddleware');
const {noCache} = require('../middleware/noCache');
const {isAdminGuest}=require('../middleware/adminGuestMiddleware');
const upload = require("../config/multer");



router.get("/admin-dashboard",noCache,isAdmin,dashboardController.getAdminDashboard);

// User Management
router.get("/admin-users",noCache,isAdmin,userController.getAdminUsers);

router.get("/admin-create-user",noCache,isAdmin,userController.getAdminCreateUser);
router.post("/admin-create-user",upload.single("avatar"),isAdmin,userController.postAdminCreateUser);

router.get("/admin-edit-user/:id",noCache,isAdmin,userController.getAdminEditUser);
router.post("/admin-edit-user/:id", upload.single("avatar"),isAdmin,userController.postAdminEditUser);

router.post("/admin-delete-user/:id",isAdmin,userController.deleteUser);


// Category Management
router.get("/admin-categories",noCache, isAdmin, categoryController.getAdminCategories);

// Create Category  
router.get("/admin-categories/create", noCache, isAdmin, categoryController.getAdminAddCategory);
router.post("/admin-categories/create",  upload.single("thumbnail"), noCache, isAdmin, categoryController.postAdminAddCategory);

// Edit Category
router.get("/admin-categories/:categoryId/edit",noCache, isAdmin, categoryController.getAdminEditCategory);
router.post("/admin-categories/:categoryId/edit",upload.single("thumbnail"), noCache, isAdmin, categoryController.postAdminEditCategory);

// Delete Category
router.post("/admin-categories/:categoryId/delete", noCache, isAdmin, categoryController.postAdminDeleteCategory);

// Course Management
router.get("/admin-courses",noCache,isAdmin,courseController.getAdminCourses);

// Create Course
router.get("/admin-courses/create",noCache,isAdmin,courseController.getAdminCreateCourse);
router.post("/admin-courses/create",upload.fields([{ name: "thumbnail" },{ name: "trailer" }]),noCache,isAdmin,courseController.postAdminCreateCourse);

// Edit Course
router.get("/admin-courses/:courseId/edit",noCache,isAdmin,courseController.getAdminEditCourse);
router.post("/admin-courses/:courseId/edit",upload.fields([{ name: "thumbnail" },{ name: "trailer" }]),noCache,isAdmin,courseController.postAdminEditCourse);

// View Course
router.get("/admin-courses/:courseId/view",noCache,isAdmin,courseController.getViewCourse);

// Delete Course
router.post("/admin-courses/:courseId/delete",noCache,isAdmin,courseController.postAdminDeleteCourse);

// Modules
router.get('/admin-courses/:courseId/modules', noCache, isAdmin, moduleController.getAdminCourseModules);

// Add Module
router.post('/admin-courses/:courseId/modules/create', noCache, isAdmin, moduleController.postAdminAddModule);

// Edit Module
router.post('/admin-courses/:courseId/modules/:moduleId/edit', noCache, isAdmin, moduleController.postAdminEditModule);

// Delete Module
router.post('/admin-courses/:courseId/modules/:moduleId/delete', noCache, isAdmin, moduleController.postAdminDeleteModule);

// Add Lesson
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/create', upload.single("video"),noCache, isAdmin, lessonController.postAdminAddLesson);

// Edit Lesson
router.post("/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/edit",upload.single("video"), noCache,isAdmin,lessonController.postAdminEditLesson);

// Delete Lesson
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/delete', noCache, isAdmin, lessonController.postAdminDeleteLesson);

// Resources 
router.post('/admin-courses/:courseId/resources/upload-file', upload.single("resourceFile"), noCache, isAdmin, resourceController.postAdminCourseResourcesUploadFile);
router.post('/admin-courses/:courseId/resources/delete-file', noCache, isAdmin, resourceController.postAdminCourseResourcesDeleteFile);
router.post('/admin-courses/:courseId/resources/add-link', noCache, isAdmin, resourceController.postAdminCourseResourcesAddLink);
router.post('/admin-courses/:courseId/resources/delete-link', noCache, isAdmin, resourceController.postAdminCourseResourcesDeleteLink);


// Publish Course
router.get('/admin-courses/:courseId/publish', noCache, isAdmin, courseController.getAdminCoursePublish);
router.post('/admin-courses/:courseId/publish', noCache, isAdmin, courseController.postAdminCoursePublish);
router.post('/admin-courses/:courseId/toggle-status', noCache, isAdmin, courseController.postAdminToggleCourseStatus);


// Orders
const orderController = require("../controllers/admin/orderController");
router.get("/admin-orders", noCache, isAdmin, orderController.getAdminOrders);
router.get("/admin-orders/:id", noCache, isAdmin, orderController.getAdminOrderDetails);

//Coupons
router.get("/admin-coupons", noCache, isAdmin, couponController.getAdminCoupons);
router.get("/admin-coupons/create", noCache, isAdmin, couponController.getAdminCreateCoupon);
router.post("/admin-coupons/create", noCache, isAdmin, couponController.postAdminCreateCoupon);
router.get("/admin-coupons/:couponId/edit", noCache, isAdmin, couponController.getAdminEditCoupon);
router.post("/admin-coupons/:couponId/edit", noCache, isAdmin, couponController.postAdminEditCoupon);
router.post("/admin-delete-coupon/:couponId", noCache, isAdmin, couponController.postAdminDeleteCoupon);

// Logout
router.get("/admin-logout",noCache,authController.getAdminLogout);

module.exports=router;


