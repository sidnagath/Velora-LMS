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

router.get("/admin-create-user",noCache,isAdmin,adminController.getAdminCreateUser);
router.post("/admin-create-user",upload.single("avatar"),isAdmin,adminController.postAdminCreateUser);

router.get("/admin-edit-user/:id",isAdmin,adminController.getAdminEditUser);
router.post("/admin-edit-user/:id", upload.single("avatar"),isAdmin,adminController.postAdminEditUser);

router.post("/admin-delete-user/:id",isAdmin,adminController.deleteUser);

router.get("/admin-logout",adminController.getAdminLogout);

module.exports=router;