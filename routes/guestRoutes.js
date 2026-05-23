const express=require("express");
const router=express.Router();
const guestController=require("../controllers/guestController");
const {isUser}=require("../middleware/userMiddleware");
const {noCache} = require('../middleware/noCache');
const {isUserGuest}=require('../middleware/userGuestMiddleware');

router.get("/",noCache,guestController.getHome);
router.get("/home",noCache,guestController.getHome);
router.get("/courses",noCache,guestController.getCourses);
router.get("/courses/:courseId",noCache,guestController.getCourseDetails);

module.exports=router;
