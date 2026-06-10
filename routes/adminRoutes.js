const express=require("express");
const router=express.Router();
const adminController=require("../controllers/adminController");
const { isAdmin } = require('../middleware/adminMiddleware');
const {noCache} = require('../middleware/noCache');
const {isAdminGuest}=require('../middleware/adminGuestMiddleware');
const upload = require("../config/multer");



router.get("/admin-login", noCache,isAdminGuest,adminController.getAdminLogin);
router.post("/admin-login", adminController.postAdminLogin);

router.get("/admin-dashboard",noCache,isAdmin,adminController.getAdminDashboard);

// User Management
router.get("/admin-users",noCache,isAdmin,adminController.getAdminUsers);

router.get("/admin-create-user",noCache,isAdmin,adminController.getAdminCreateUser);
router.post("/admin-create-user",upload.single("avatar"),isAdmin,adminController.postAdminCreateUser);

router.get("/admin-edit-user/:id",noCache,isAdmin,adminController.getAdminEditUser);
router.post("/admin-edit-user/:id", upload.single("avatar"),isAdmin,adminController.postAdminEditUser);

router.post("/admin-delete-user/:id",isAdmin,adminController.deleteUser);


// Category Management
router.get("/admin-categories",noCache, isAdmin, adminController.getAdminCategories);

// Create Category  
router.get("/admin-categories/create", noCache, isAdmin, adminController.getAdminAddCategory);
router.post("/admin-categories/create",  upload.single("thumbnail"), noCache, isAdmin, adminController.postAdminAddCategory);

// Edit Category
router.get("/admin-categories/:categoryId/edit",noCache, isAdmin, adminController.getAdminEditCategory);
router.post("/admin-categories/:categoryId/edit",upload.single("thumbnail"), noCache, isAdmin, adminController.postAdminEditCategory);

// Delete Category
router.post("/admin-categories/:categoryId/delete", noCache, isAdmin, adminController.postAdminDeleteCategory);

// Course Management
router.get("/admin-courses",noCache,isAdmin,adminController.getAdminCourses);

// Create Course
router.get("/admin-courses/create",noCache,isAdmin,adminController.getAdminCreateCourse);
router.post("/admin-courses/create",upload.fields([{ name: "thumbnail" },{ name: "trailer" }]),noCache,isAdmin,adminController.postAdminCreateCourse);

// Edit Course
router.get("/admin-courses/:courseId/edit",noCache,isAdmin,adminController.getAdminEditCourse);
router.post("/admin-courses/:courseId/edit",upload.fields([{ name: "thumbnail" },{ name: "trailer" }]),noCache,isAdmin,adminController.postAdminEditCourse);

// Delete Course
router.post("/admin-courses/:courseId/delete",noCache,isAdmin,adminController.postAdminDeleteCourse);

// Modules
router.get('/admin-courses/:courseId/modules', noCache, isAdmin, adminController.getAdminCourseModules);

// Add Module
router.post('/admin-courses/:courseId/modules/create', noCache, isAdmin, adminController.postAdminAddModule);

// Edit Module
router.post('/admin-courses/:courseId/modules/:moduleId/edit', noCache, isAdmin, adminController.postAdminEditModule);

// Delete Module
router.post('/admin-courses/:courseId/modules/:moduleId/delete', noCache, isAdmin, adminController.postAdminDeleteModule);

// Add Lesson
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/create', upload.single("video"), noCache, isAdmin, adminController.postAdminAddLesson);

// Edit Lesson
router.post("/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/edit",upload.single("video"),noCache,isAdmin,adminController.postAdminEditLesson);

// Delete Lesson
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/delete', noCache, isAdmin, adminController.postAdminDeleteLesson);

// Resources 
router.post('/admin-courses/:courseId/resources/upload-file', upload.single("resourceFile"), noCache, isAdmin, adminController.postAdminCourseResourcesUploadFile);
router.post('/admin-courses/:courseId/resources/delete-file', noCache, isAdmin, adminController.postAdminCourseResourcesDeleteFile);
router.post('/admin-courses/:courseId/resources/add-link', noCache, isAdmin, adminController.postAdminCourseResourcesAddLink);
router.post('/admin-courses/:courseId/resources/delete-link', noCache, isAdmin, adminController.postAdminCourseResourcesDeleteLink);
// router.post('/admin-courses/:courseId/resources/bulk-save', upload.array("resourceFiles", 10), noCache, isAdmin, adminController.postAdminCourseResourcesBulkSave);
// router.post('/admin-courses/:courseId/resources/edit-file', noCache, isAdmin, adminController.postAdminCourseResourcesEditFile);
// router.post('/admin-courses/:courseId/resources/edit-link', noCache, isAdmin, adminController.postAdminCourseResourcesEditLink);

// Publish Course
router.get('/admin-courses/:courseId/publish', noCache, isAdmin, adminController.getAdminCoursePublish);
router.post('/admin-courses/:courseId/publish', noCache, isAdmin, adminController.postAdminCoursePublish);

// Logout
router.get("/admin-logout",noCache,adminController.getAdminLogout);

module.exports=router;