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
router.get("/admin-users",noCache,isAdmin,adminController.getAdminUsers);

// Course Management
router.get("/admin-courses", noCache, isAdmin, adminController.getAdminCourses);

//Create course
router.get("/admin-courses/create", noCache, isAdmin, adminController.getAdminCreateCourse);

//Delete course
router.post("/admin-courses/:courseId/delete", noCache, isAdmin, adminController.postAdminDeleteCourse);

//Basic Info
router.get("/admin-courses/:courseId/basic-info", noCache, isAdmin, adminController.getAdminCourseBasicInfo);
router.post("/admin-courses/:courseId/basic-info",upload.fields([{name:"thumbnail"},{name:"trailer"}]),noCache, isAdmin, adminController.postAdminCourseBasicInfo);

//Edit Course
router.get("/admin-courses/:courseId/basic-info/edit", noCache, isAdmin, adminController.getAdminEditCourse);

//Modules
router.get('/admin-courses/:courseId/modules', noCache, isAdmin, adminController.getAdminCourseModules);

// //Add Module
router.get('/admin-courses/:courseId/modules/create', noCache, isAdmin, adminController.getAdminAddModule);
router.post('/admin-courses/:courseId/modules/create', noCache, isAdmin, adminController.postAdminAddModule);

// //Edit Module
router.get('/admin-courses/:courseId/modules/:moduleId/edit', noCache, isAdmin, adminController.getAdminEditModule);
router.post('/admin-courses/:courseId/modules/:moduleId/edit', noCache, isAdmin, adminController.postAdminEditModule);

// //Delete Module
router.post('/admin-courses/:courseId/modules/:moduleId/delete', noCache, isAdmin, adminController.postAdminDeleteModule);

//Add Lesson
router.get('/admin-courses/:courseId/modules/:moduleId/lessons/create', noCache, isAdmin, adminController.getAdminAddLesson);
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/create', upload.single("video"), noCache, isAdmin, adminController.postAdminAddLesson);

// //Edit Lesson
router.get('/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/edit', noCache, isAdmin, adminController.getAdminEditLesson);
router.post("/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/edit",upload.single("video"),noCache,isAdmin,adminController.postAdminEditLesson);

//Delete Lesson
router.post('/admin-courses/:courseId/modules/:moduleId/lessons/:lessonId/delete', noCache, isAdmin, adminController.postAdminDeleteLesson);

// Resources 
router.get('/admin-courses/:courseId/resources', noCache, isAdmin, adminController.getAdminCourseResources);
router.get('/admin-courses/:courseId/resources/data', noCache, isAdmin, adminController.getAdminCourseResourcesData);
router.post('/admin-courses/:courseId/resources/upload-file', upload.single("resourceFile"), noCache, isAdmin, adminController.postAdminCourseResourcesUploadFile);
router.post('/admin-courses/:courseId/resources/delete-file', noCache, isAdmin, adminController.postAdminCourseResourcesDeleteFile);
router.post('/admin-courses/:courseId/resources/add-link', noCache, isAdmin, adminController.postAdminCourseResourcesAddLink);
router.post('/admin-courses/:courseId/resources/delete-link', noCache, isAdmin, adminController.postAdminCourseResourcesDeleteLink);
router.post('/admin-courses/:courseId/resources/save-notes', noCache, isAdmin, adminController.postAdminCourseResourcesSaveNotes);

// Publish Course
router.get('/admin-courses/:courseId/publish', noCache, isAdmin, adminController.getAdminCoursePublish);
router.post('/admin-courses/:courseId/publish', noCache, isAdmin, adminController.postAdminCoursePublish);

router.get("/admin-create-user",noCache,isAdmin,adminController.getAdminCreateUser);
router.post("/admin-create-user",upload.single("avatar"),isAdmin,adminController.postAdminCreateUser);

router.get("/admin-edit-user/:id",noCache,isAdmin,adminController.getAdminEditUser);
router.post("/admin-edit-user/:id", upload.single("avatar"),isAdmin,adminController.postAdminEditUser);

router.post("/admin-delete-user/:id",isAdmin,adminController.deleteUser);

router.get("/admin-logout",noCache,adminController.getAdminLogout);

module.exports=router;