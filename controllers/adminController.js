const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Lesson = require("../models/lessonModel");
const Resource = require("../models/resourceModel");

exports.getAdminLogin=(req, res) => {
  
  if (req.session.user) {
    return res.redirect("/user-dashboard");
  }

  if (req.session.admin) {
  return res.redirect("/admin-dashboard");
}

    res.render("pages/guest/admin-login", { 
        title: 'Velora - Admin Login', 
        isLoggedIn: false
    });
};


exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.render(
        "pages/guest/admin-login",
        {
          title: 'Admin Login',
          error: ['Invalid email or password'],
          isLoggedIn: false,
        }
      );
    }

    const isMatch =
      await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render(
        "pages/guest/admin-login",
        {
          title: 'Admin Login',
          error: ['Invalid email or password'],
          isLoggedIn: false
        }
      );
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email
    };


    req.session.save(err => {
      if (err) {
        console.log(err);
        return res.redirect("/admin-login");
      }
      return res.redirect("/admin-dashboard");
    });
  }

  catch (err) {
    console.log(err);
    res.redirect('/admin-login');
  }
}

exports.getAdminDashboard= (req, res) => {

const activities = [
    {
      name: "John Doe",
      email: "john@example.com",
      course: "React Mastery",
      status: "completed",
      amount: 120
    },
    {
      name: "Sarah Lee",
      email: "sarah@example.com",
      course: "Node.js Bootcamp",
      status: "pending",
      amount: 80
    }
  ];

    res.render('pages/admin/dashboard/dashboard', { 
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        activities,
        isAdmin: true
    });
  }


exports.getAdminUsers = async (req, res) => {

  try {

    // SEARCH
    const search =
      req.query.search || "";

    // PAGINATION
    const page =
      parseInt(req.query.page) || 1;

    const limit = 5;

    const skip =
      (page - 1) * limit;

    // FILTER
    const filter = {

      isDeleted: false,

      $or: [

        {
          name: {
            $regex: search,
            $options: "i"
          }
        },

        {
          email: {
            $regex: search,
            $options: "i"
          }
        },

        {
          status: {
            $regex: search,
            $options: "i"
          }
        }

      ]

    };

    // USERS
    const users =
      await User.find(filter)

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);

    // TOTAL USERS
    const totalUsers =
      await User.countDocuments(filter);

    // TOTAL PAGES
    const totalPages =
      Math.ceil(totalUsers / limit);

    res.render(
      "pages/admin/user-management/users",
      {

        title:
          "Velora - Admin Users",

        isLoggedIn: true,
        
        isAdmin: true,

        users,

        currentPage: page,

        totalPages,
        
        totalUsers,

        search

      }
    );

  }

  catch (err) {

    console.log(err);

    res.redirect("/admin-dashboard");

  }

};

exports.getAdminCreateUser = (req, res) => {
    res.render('pages/admin/user-management/create-user', { 
        title: 'Velora - Admin Create User', 
        isLoggedIn: true,
        isAdmin: true
    });
};

exports.postAdminCreateUser = async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      status
    } = req.body;



    // TRIM VALUES

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPhone =
      phone?.trim();

    const trimmedPassword =
      password?.trim();



    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
      /^[0-9]{10}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;



    // REQUIRED FIELD VALIDATION

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPassword
    ) {

      req.flash(
        "error",
        "Name, email and password are required"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // NAME VALIDATION

    if (
      !nameRegex.test(trimmedName)
    ) {

      req.flash(
        "error",
        "Name should contain only letters"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // EMAIL VALIDATION

    if (
      !emailRegex.test(trimmedEmail)
    ) {

      req.flash(
        "error",
        "Invalid email format"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // PHONE VALIDATION
    // OPTIONAL FIELD

    if (
      trimmedPhone &&
      !phoneRegex.test(trimmedPhone)
    ) {

      req.flash(
        "error",
        "Enter valid 10 digit phone number"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // PASSWORD VALIDATION

    if (
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      req.flash(
        "error",

        "Password must contain uppercase letter, number and minimum 6 characters"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // DUPLICATE EMAIL CHECK

    const existingUser =
      await User.findOne({

        email: trimmedEmail

      });

    if (existingUser) {

      req.flash(
        "error",
        "Email already exists"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // HASH PASSWORD

    const hashedPassword =
      await bcrypt.hash(
        trimmedPassword,
        10
      );



    // IMAGE

    let avatar = "";

    if (req.file) {

      avatar =
        "/uploads/" +
        req.file.filename;
    }



    // CREATE USER

    await User.create({

      name: trimmedName,

      email: trimmedEmail,

      phone: trimmedPhone,

      password: hashedPassword,

      status,

      avatar

    });



    req.flash(
      "success",
      "User created successfully"
    );



    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
      "/admin-create-user"
    );

  }

};

exports.getAdminEditUser = async(req, res) => {

try{

  const user=await User.findById(req.params.id);
  if(!user){
    return res.redirect("/admin-users");
  }
  
   res.render('pages/admin/user-management/edit-user', { 
        title: 'Velora - Admin Edit User', 
        isLoggedIn: true,
        isAdmin: true,
        user
    });
}

catch(err){
   console.log(err);
   res.redirect("/admin-users");
  }
   
};


exports.postAdminEditUser = async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      status,
      password
    } = req.body;



    // TRIM VALUES

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
  password? password.trim(): "";

    const trimmedPhone =
    phone? String(phone).trim(): "";


    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
       /^[6-9]\d{9}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;


      // FIND CURRENT USER

    const currentUser =
      await User.findById(
        req.params.id
      );

    if (!currentUser) {

      req.flash(
        "error",
        "User not found"
      );

      return res.redirect(
        "/admin-users"
      );
    }

    // GOOGLE ACCOUNT PROTECTION

if (
  currentUser.authProvider ===
  "google"
) {

  // PHONE VALIDATION

  if (
    trimmedPhone &&
    !phoneRegex.test(trimmedPhone)
  ) {

    req.flash(
      "error",
      "Enter valid 10 digit phone number"
    );

    return res.redirect(
      `/admin-edit-user/${req.params.id}`
    );

  }



  await User.findByIdAndUpdate(

    req.params.id,

    {
      phone: trimmedPhone,
      status
    }

  );



  req.flash(

    "success",

    "Google account updated successfully"
  );



  return res.redirect(
    "/admin-users"
  );

}

    // REQUIRED VALIDATION

    if (
      !trimmedName ||
      !trimmedEmail
    ) {

      req.flash(
        "error",
        "Name and email are required"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // NAME VALIDATION

    if (
      !nameRegex.test(trimmedName)
    ) {

      req.flash(
        "error",
        "Name should contain only letters"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // EMAIL VALIDATION

    if (
      !emailRegex.test(trimmedEmail)
    ) {

      req.flash(
        "error",
        "Invalid email format"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // PHONE VALIDATION
    // OPTIONAL FIELD

    if (
      trimmedPhone &&
      !phoneRegex.test(trimmedPhone)
    ) {

      req.flash(
        "error",
        "Enter valid 10 digit phone number"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // PASSWORD VALIDATION
    // ONLY IF PASSWORD EXISTS

    if (
      trimmedPassword &&
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      req.flash(
        "error",

        "Password must contain uppercase letter, number and minimum 6 characters"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }


    // DUPLICATE EMAIL CHECK

    const existingUser =
      await User.findOne({

        email: trimmedEmail,

        _id: {
          $ne: req.params.id
        }

      });

    if (existingUser) {

      req.flash(
        "error",
        "Email already exists"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // UPDATE DATA

    const updateData = {

      name: trimmedName,

      email: trimmedEmail,

      phone: trimmedPhone,

      status

    };



    // AVATAR

    if (req.file) {

      updateData.avatar =
        "/uploads/" +
        req.file.filename;
    }



    // PASSWORD UPDATE

    if (trimmedPassword) {

      updateData.password =
        await bcrypt.hash(
          trimmedPassword,
          10
        );
    }



    // UPDATE USER

    await User.findByIdAndUpdate(
      req.params.id,
      updateData
    );



    req.flash(
      "success",
      "User updated successfully"
    );



    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
      "/admin-users"
    );

  }

};


exports.deleteUser = async (req, res) => {

  try {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        status: "inactive"
      }
    );

    res.redirect("/admin-users");

  } catch (err) {

    console.log(err);

    res.redirect("/admin-users");
  }
};

// Course Management Methods

exports.getAdminCourses =
async (req, res) => {

  try {

    // SEARCH

    const search =
      req.query.search?.trim();



    // FILTER OBJECT

    const filter = {};



    // SEARCH FILTER

    if (search) {

      filter.$or = [

        {

          title: {

            $regex: search,

            $options: "i"

          }

        },

        {

          category: {

            $regex: search,

            $options: "i"

          }

        },

        {

          level: {

            $regex: search,

            $options: "i"

          }

        }

      ];

    }



    // GET COURSES

    const courses =

      await Course.find(filter)

      .sort({

        updatedAt: -1

      });



    // RENDER PAGE

    res.render(

      "pages/admin/courses/courses",

      {

        title:
        "Velora - Course Management",

        isLoggedIn: true,

        isAdmin: true,

        courses,

        search

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.getAdminCreateCourse = async (req, res) => {

   try {
    // CREATE EMPTY DRAFT
    const course =
      await Course.create({
        title: "",
        description: "",
        category: "",
        instructor: "",
        level: "Beginner",
        thumbnail: "",
        trailer: "",
        status: "draft"
      });

      

    // REDIRECT TO BASIC INFO
    res.redirect(`/admin-courses/${course._id}/basic-info`);
  }

  catch (err) {
    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
      "/admin-courses"
    );
  }
};

//Delete Course

exports.postAdminDeleteCourse =
async (req, res) => {

  try {
    const courseId =
      req.params.courseId;

    // CHECK COURSE
    const course =
    await Course.findById(
        courseId
      );

    if (!course) {
      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );
    }


    // GET MODULES OF COURSE
    const modules =
      await Module.find({courseId});
    const moduleIds =modules.map(module => module._id);


    // GET LESSONS OF MODULES
    const lessons =
      await Lesson.find({
        moduleId: {
          $in: moduleIds
        }
      });



    const lessonIds =
      lessons.map(lesson => lesson._id);

    // DELETE RESOURCES
    await Resource.deleteMany({
      lessonId: { $in: lessonIds}
    });

    // DELETE LESSONS
    await Lesson.deleteMany({
      moduleId: {
       $in: moduleIds
      }
    });


    // DELETE MODULES
    await Module.deleteMany({
      courseId
    });

    // DELETE COURSE
    await Course.findByIdAndDelete(
      courseId
    );

    req.flash(
      "success",
      "Course deleted successfully"
    );

    res.redirect(
      "/admin-courses"
    );
  }

  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};



//Basic Info

exports.getAdminCourseBasicInfo = async (req, res) => {

  try{
   const course=await Course.findById(req.params.courseId);

   if(!course){
      req.flash("error","Course not found");

      return  res.redirect("/admin-courses");
   }

    res.render('pages/admin/courses/basic-info', {
        title: 'Velora - Course Basic Info',
        isLoggedIn: true,
        isAdmin: true,
        course
    });

  }

  catch (err) {
    console.log(err);
    res.redirect("/admin-courses");
  }
};


exports.postAdminCourseBasicInfo= async (req, res)=>{

  try{
  //Get body data
  let {title,description,category,instructor,level}=req.body;

  //Trim values 
  title=title?.trim();
  description=description?.trim();
  category=category?.trim();
  instructor=instructor?.trim();
  level=level?.trim();

 //Get files 
  const thumbnailFile=req.files?.thumbnail?.[0];

  const trailerFile=req.files?.trailer?.[0];


  const existingCourse =
await Course.findById(
  req.params.courseId
);

//Title Validation
if (!title) {

  req.flash(
    "error",
    "Enter course title"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );
}

//Description Validation
if (!description) {

  req.flash(
    "error",
    "Enter course description"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}

//Category Validation
if (!category) {
  req.flash(
    "error",
    "Select category"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}

// Instructor Validation
if (!instructor) {

  req.flash(
    "error",
    "Enter instructor name"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}

// Level Validation

if (!level) {

  req.flash(
    "error",
    "Select course level"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}

// Thumbnail Validation

if ( !thumbnailFile &&
  !existingCourse.thumbnail) {

  req.flash(
    "error",
    "Upload thumbnail image"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}


// Trailer Validation

if ( !trailerFile &&
  !existingCourse.trailer) {

  req.flash(
    "error",
    "Upload trailer video"
  );

  return res.redirect(
     `/admin-courses/${req.params.courseId}/basic-info`
  );

}


  //Title Validation

  if(title.length<5){
  req.flash("error","Title must be minimum 5 characters");
  return res.redirect( `/admin-courses/${req.params.courseId}/basic-info`);
  }

  //Instructor Validation

  const instructorRegex = /^[A-Za-z ]{3,30}$/;
  
  if(!instructorRegex.test(instructor)){
  req.flash("error","Instructor name is invalid");
  return res.redirect( `/admin-courses/${req.params.courseId}/basic-info`);
  }

  //Level Validation

  const allowedLevels=["Beginner","Intermediate","Advanced"];

  if(!allowedLevels.includes(level)){
    req.flash("error","Invalid course level");
  return res.redirect( `/admin-courses/${req.params.courseId}/basic-info`);
  }
  
  //Thumbnail type validation

  const allowedImageTypes=[
     "image/jpeg",
      "image/png",
      "image/webp"
  ];

  if (thumbnailFile && !allowedImageTypes.includes(thumbnailFile.mimetype)
){
    req.flash("error","Thumbnail must be JPG,PNG or WEBP");
  return res.redirect( `/admin-courses/${req.params.courseId}/basic-info`);
  }


  //Trailer type validation

    const allowedVideoTypes=[
     "video/mp4",
      "video/quicktime",
  ];

  if(trailerFile && !allowedVideoTypes.includes(trailerFile.mimetype)){
    req.flash("error","Trailer must be MP4 or MOV");
  return res.redirect( `/admin-courses/${req.params.courseId}/basic-info`);
  }


  //File size validation

    // 5MB
    const maxThumbnailSize =
      5 * 1024 * 1024;

    // 100MB
    const maxTrailerSize =
      100 * 1024 * 1024;


    if (thumbnailFile &&
      thumbnailFile.size >
      maxThumbnailSize
    ) {

      req.flash(
        "error",
        "Thumbnail exceeds 5MB"
      );

      return res.redirect(
        "/admin-course/create"
      );

    }


    if (trailerFile &&
      trailerFile.size >
      maxTrailerSize
    ) {

      req.flash(
        "error",
        "Trailer exceeds 100MB"
      );

      return res.redirect(
        "/admin-course/create"
      );

    }

//create file paths

const thumbnailPath =thumbnailFile? "/uploads/" + thumbnailFile.filename : existingCourse.thumbnail;

const trailerPath = trailerFile ? "/uploads/" + trailerFile.filename : existingCourse.trailer;

      await Course.findByIdAndUpdate(req.params.courseId,{
       title,
       description,
       category,
       instructor,
       level:level,
       thumbnail:thumbnailPath,
       trailer:trailerPath
      }
    );
   

    res.redirect(`/admin-courses/${req.params.courseId}/modules`);

  }

  catch(err){
    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
       `/admin-courses/${req.params.courseId}/basic-info`
    );
  }
}


//Edit Course
exports.getAdminEditCourse =
async (req, res) => {
  try {
    // GET COURSE
    const course =
      await Course.findById(
        req.params.courseId
      );

    // COURSE NOT FOUND
    if (!course) {
      req.flash(
        "error",
        "Course not found"
      );
      return res.redirect(
        "/admin-courses"
      );
    }

    // RENDER EDIT PAGE
    res.render("pages/admin/courses/basic-info",
      {
        title:
        "Velora - Edit Course",
        isLoggedIn: true,
        isAdmin: true,
        isEdit: true,
        course
      }

    );
  }
  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};

//Modules

exports.getAdminCourseModules =
async (req, res) => {

  try {

    //GET COURSE
    const course =
      await Course.findById(
        req.params.courseId
      );



    if (!course) {

      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }


    // GET MODULES

    const modules =
      await Module.find({
        courseId:
        req.params.courseId
      })
      .sort({
      order: 1
      });


    // GET LESSONS

    const lessons =
       await Lesson.find({

      moduleId: {
      $in:
      modules.map(
        module => module._id
       )
       }
     })
  .sort({
    order: 1
  });


    res.render(
      "pages/admin/courses/modules",
      {
        title:
        "Velora - Course Modules",
        isLoggedIn: true,
        isAdmin: true,
        course,
        modules,
        lessons
      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.getAdminAddModule =
async (req, res) => {

  try {

    // GET COURSE

    const course =
      await Course.findById(
        req.params.courseId
      );



    // COURSE NOT FOUND

    if (!course) {

      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }



    // RENDER PAGE

    res.render(
      "pages/admin/courses/add-module",
      {

        title:
        "Velora - Add Module",

        activePage:
        "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.postAdminAddModule = async (req, res) => {
try{

let{title,description}=req.body;

title =title?.trim();
description =description?.trim();

if(!title){
  req.flash("error","Enter Module title");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/create`);
}

if(!description){
  req.flash("error","Enter Module description");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/create`);
}

if(title.length<3){
  req.flash("error","Module title must be at least 3 characters");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/create`);
}


 // CHECK COURSE EXISTS

    const course =await Course.findById(req.params.courseId);

    if (!course) {
      req.flash("error","Course not found");
      return res.redirect( "/admin-courses");
    }


 // MODULE ORDER

    const moduleCount =await Module.countDocuments({
        courseId:req.params.courseId
      });

  // CREATE MODULE

    await Module.create({
      courseId: req.params.courseId,
      title,
      description,
      order: moduleCount + 1
    });

 req.flash("success","Module added successfully");

    // REDIRECT BACK TO MODULES PAGE
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
}

catch (err) {
    console.log(err);
    res.redirect("/admin-courses");
  }

};


exports.getAdminEditModule = async (req, res) => {

  try {

    // GET COURSE

    const course =
      await Course.findById(
        req.params.courseId
      );


    //GET MODULE
    
    const module=
    await Module.findOne({

  _id: req.params.moduleId,

  courseId: req.params.courseId

});

    // VALIDATION

    if (!course||!module) {

      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }



    // RENDER PAGE

    res.render(
      "pages/admin/courses/add-module",
      {

        title:
        "Velora - Edit Module",

        activePage:
        "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

        module

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};



exports.postAdminEditModule = async (req, res) => {

try{
  //GET FORM DATA

  let{title,description}=req.body;

//TRIM VALUES
title=title?.trim();
description=description?.trim();

//VALIDATION

if(!title){
  req.flash("error","Enter Module title");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/edit`)
}

if(!description){
  req.flash("error","Enter Module description");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/edit`)
}


//TITLE LENGTH
if(title.length<3){
  req.flash("error", "Module title must be at least 3 characters");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/edit`)
}


//FIND MODULE

const module=await Module.findOne({

  _id: req.params.moduleId,

  courseId: req.params.courseId

});

if(!module){
   req.flash(
        "error",
        "Module not found"
      );

      return res.redirect(
        "/admin-courses"
      );
}

//UPDATE MODULE

module.title=title;
module.description=description;

await module.save();
res.redirect(`/admin-courses/${req.params.courseId}/modules`);

}
catch(err){
    console.log(err);
    res.redirect("/admin-courses");
   }
};


exports.postAdminDeleteModule = async (req, res) => 
{
try{
const module=await Module.findById(req.params.moduleId);

if(!module){
  req.flash("error","Module not found");
  return res.redirect("/admin-courses");
}

await Module.findByIdAndDelete(req.params.moduleId);

req.flash("success","Module deleted successfully");

res.redirect(`/admin-courses/${req.params.courseId}/modules`);

}
catch(err){
    console.log(err);
    res.redirect("/admin-courses");
   }
}



exports.getAdminAddLesson = async (req, res) => {
  try {

    // GET COURSE

    const course =
      await Course.findById(
        req.params.courseId
      );



    // COURSE NOT FOUND

    if (!course) {

      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }


     // GET MODULE

    const module =
      await Module.findOne({

  _id: req.params.moduleId,

  courseId: req.params.courseId

});



    // MODULE NOT FOUND

    if (!module) {

      req.flash(
        "error",
        "Module not found"
      );

      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules`
      );

    }


    // RENDER PAGE

    res.render(
      "pages/admin/courses/add-lesson",
      {

        title:
        "Velora - Add Lesson",

        activePage:
        "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: false,

        course,

        module,

        lesson:null

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};


exports.postAdminAddLesson = async (req, res) => {
try{

let{title,description}=req.body;

title =title?.trim();
description =description?.trim();

const video=req.file;

if(!title){
  req.flash("error","Enter Lesson title");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/create`);
}

if(!description){
  req.flash("error","Enter Lesson description");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/create`);
}

if(title.length<3){
  req.flash("error","Module title must be at least 3 characters");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/create`);
}

if(!video){
  req.flash("error","Upload lesson video");
  return res.redirect(`/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/create`);
}




 // CHECK MODULE EXISTS

    const module =await Module.findOne({

  _id: req.params.moduleId,

  courseId: req.params.courseId

});

    if (!module) {
      req.flash("error","Module not found");
      return res.redirect( `/admin-courses`);
    }


 // LESSON ORDER

    const lessonCount =await Lesson.countDocuments({
        moduleId:req.params.moduleId
      });

  // VIDEO PATH
    const videoPath = "/uploads/" + video.filename;



  // CREATE LESSON

    await Lesson.create({
      moduleId: req.params.moduleId,
      title,
      description,
      video:"/uploads/" + video.filename,
      order: lessonCount + 1
    });

 req.flash("success","Lesson added successfully");

    // REDIRECT BACK TO MODULES PAGE
    res.redirect(`/admin-courses/${req.params.courseId}/modules`);
}

catch (err) {
    console.log(err);
    res.redirect("/admin-courses");
  }

};


exports.getAdminEditLesson =
async (req, res) => {
  try {

    // GET COURSE
    const course =
      await Course.findById(
        req.params.courseId
      );


    // GET MODULE
    const module =
      await Module.findOne({
        _id:
        req.params.moduleId,
        courseId:
        req.params.courseId
      });


    // GET LESSON
    const lesson =
      await Lesson.findOne({
        _id:
        req.params.lessonId,
        moduleId:
        req.params.moduleId
      });


    // VALIDATION
    if (
      !course ||
      !module ||
      !lesson
    ) {
      req.flash(
        "error",
        "Lesson not found"
      );
      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules`
      );
    }



    // RENDER
    res.render("pages/admin/courses/add-lesson",
      {

        title:
        "Velora - Edit Lesson",

        activePage:
        "courses",

        isLoggedIn: true,

        isAdmin: true,

        isEdit: true,

        course,

        module,

        lesson

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect(
      "/admin-courses"
    );

  }

};

exports.postAdminEditLesson =async (req, res) => {
  try {
    // GET FORM DATA
    let {
      title,
      description
    } = req.body;

    // TRIM VALUES
    title =
      title?.trim();
    description =
      description?.trim();

    // GET VIDEO FILE
    const video =
      req.file;

    // VALIDATION
    if (!title) {
      req.flash(
        "error",
        "Enter lesson title"
      );
      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/${req.params.lessonId}/edit`
      );
    }

    if (!description) {
      req.flash(
        "error",
        "Enter lesson description"
      );
      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/${req.params.lessonId}/edit`
      );
    }

    if (
      title.length < 3
    ) {
      req.flash(
        "error",
        "Lesson title must be at least 3 characters"
      );

      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules/${req.params.moduleId}/lessons/${req.params.lessonId}/edit`
      );
    }


    // FIND LESSON
    const lesson =
      await Lesson.findOne({
        _id:
        req.params.lessonId,
        moduleId:
        req.params.moduleId
      });

    // LESSON NOT FOUND
    if (!lesson) {
      req.flash(
        "error",
        "Lesson not found"
      );

      return res.redirect(
        `/admin-courses/${req.params.courseId}/modules`
      );
    }



    // UPDATE DATA
    lesson.title =
      title;

    lesson.description =
      description;


    // OPTIONAL VIDEO UPDATE
    if (video) {
      lesson.video =
        "/uploads/" +
        video.filename;
    }

    // SAVE
    await lesson.save();

    req.flash(
      "success",
      "Lesson updated successfully"
    );

    // REDIRECT
    res.redirect(
      `/admin-courses/${req.params.courseId}/modules`
    );
  }

  catch (err) {

    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }

};

exports.postAdminDeleteLesson =async (req, res) => {
  try {
    // FIND LESSON
    const lesson =
      await Lesson.findOne({
        _id:
        req.params.lessonId,
        moduleId:
        req.params.moduleId
      });

    // LESSON NOT FOUND
    if (!lesson) {
      req.flash(
        "error",
        "Lesson not found"
      );
      return res.redirect(`/admin-courses/${req.params.courseId}/modules`);
    }


    // DELETE LESSON
    await Lesson.findByIdAndDelete(
      req.params.lessonId
    );

    req.flash(
      "success",
      "Lesson deleted successfully"
    );

    // REDIRECT
    res.redirect(
      `/admin-courses/${req.params.courseId}/modules`
    );
  }

  catch (err) {
    console.log(err);
    res.redirect(
      "/admin-courses"
    );
  }
};




// Helper function for human-readable file sizes
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


exports.getAdminCourseResources = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/admin-courses");
    }

    const modules = await Module.find({ courseId: req.params.courseId }).sort({ order: 1 });
    const lessons = await Lesson.find({
      moduleId: { $in: modules.map(m => m._id) }
    }).sort({ order: 1 });

    res.render('pages/admin/courses/resources', {
      title: 'Velora - Course Resources',
      activePage: 'courses',
      isLoggedIn: true,
      isAdmin: true,
      course,
      modules,
      lessons
    });
  } catch (err) {
    console.error("Error in getAdminCourseResources:", err);
    res.redirect("/admin-courses");
  }
};


exports.getAdminCourseResourcesData = async (req, res) => {
  try {
    const { moduleId, lessonId } = req.query;
    const { courseId } = req.params;

    if (!moduleId || !lessonId) {
      return res.status(400).json({ error: "Missing module or lesson reference" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = { files: [], links: [], notes: "" };
    }

    res.json({
      files: resource.files || [],
      links: resource.links || [],
      notes: resource.notes || ""
    });
  } catch (err) {
    console.error("Error in getAdminCourseResourcesData:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesUploadFile = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;
    const file = req.file;

    if (!moduleId || !lessonId) {
      return res.status(400).json({ error: "Missing module or lesson reference" });
    }
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    const fileSizeString = formatBytes(file.size);
    resource.files.push({
      name: file.originalname,
      path: "/uploads/" + file.filename,
      size: fileSizeString
    });

    await resource.save();
    res.json({ success: true, files: resource.files });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesUploadFile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesDeleteFile = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, fileId } = req.body;

    if (!moduleId || !lessonId || !fileId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    resource.files = resource.files.filter(f => f._id.toString() !== fileId.toString());
    await resource.save();

    res.json({ success: true, files: resource.files });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesDeleteFile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesAddLink = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, title, url, description } = req.body;

    if (!moduleId || !lessonId || !title || !url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    resource.links.push({
      title,
      url,
      description: description || ""
    });

    await resource.save();
    res.json({ success: true, links: resource.links });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesAddLink:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesDeleteLink = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, linkId } = req.body;

    if (!moduleId || !lessonId || !linkId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    resource.links = resource.links.filter(l => l._id.toString() !== linkId.toString());
    await resource.save();

    res.json({ success: true, links: resource.links });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesDeleteLink:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postAdminCourseResourcesSaveNotes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, lessonId, notes } = req.body;

    if (!moduleId || !lessonId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    let resource = await Resource.findOne({ courseId, moduleId, lessonId });
    if (!resource) {
      resource = new Resource({
        courseId,
        moduleId,
        lessonId,
        files: [],
        links: [],
        notes: ""
      });
    }

    resource.notes = notes || "";
    await resource.save();

    res.json({ success: true, notes: resource.notes });
  } catch (err) {
    console.error("Error in postAdminCourseResourcesSaveNotes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAdminCoursePublish = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/admin-courses");
    }

    const modules = await Module.find({ courseId: req.params.courseId });
    const lessons = await Lesson.find({
      moduleId: { $in: modules.map(m => m._id) }
    });

    res.render('pages/admin/courses/publish', {
      title: 'Velora - Publish Course',
      activePage: 'courses',
      isLoggedIn: true,
      isAdmin: true,
      course,
      modules,
      lessons
    });
  } catch (err) {
    console.error("Error in getAdminCoursePublish:", err);
    res.redirect("/admin-courses");
  }
};

exports.postAdminCoursePublish =
async (req, res) => {

  try {
    // GET COURSE
    const course =
      await Course.findById(
        req.params.courseId
      );



    // COURSE NOT FOUND

    if (!course) {
      req.flash(
        "error",
        "Course not found"
      );

      return res.redirect(
        "/admin-courses"
      );

    }



    // =========================
    // VALIDATE MODULES
    // =========================

    const modules =
      await Module.find({
        courseId:
        course._id
      });



    if (
      modules.length === 0
    ) {

      req.flash(
        "error",
        "Add at least one module before publishing"
      );



      return res.redirect(
        `/admin-courses/${course._id}/publish`
      );

    }



    // =========================
    // VALIDATE LESSONS
    // =========================

    const moduleIds =
      modules.map(
        module => module._id
      );



    const lessons =
      await Lesson.find({
        moduleId: {
          $in: moduleIds
        }
      });



    if (
      lessons.length === 0
    ) {
      req.flash(
        "error",
        "Add at least one lesson before publishing"
      );

      return res.redirect(
        `/admin-courses/${course._id}/publish`
      );

    }



    // =========================
    // GET FORM DATA
    // =========================

    const {
      pricingType,
      currency,
      basePrice,
      discountPrice,
      lifetimeAccess,
      downloadableResources,
      completionCertificate,
      publishStatus
    } = req.body;



    // =========================
    // SAVE COURSE SETTINGS
    // =========================

    course.pricingType =
      pricingType || "paid";

    course.currency =
      currency || "INR";



    course.basePrice =
      pricingType === "free"
      ? 0
      : Number(
          basePrice || 0
        );



    course.discountPrice =
      pricingType === "free"
      ? 0
      : Number(
          discountPrice || 0
        );



    course.lifetimeAccess =
      lifetimeAccess === "on" ||
      lifetimeAccess === true;



    course.downloadableResources =
      downloadableResources === "on" ||
      downloadableResources === true;



    course.completionCertificate =
      completionCertificate === "on" ||
      completionCertificate === true;



    // =========================
    // STATUS
    // =========================

    if (
      publishStatus ===
      "Published (Live Now)"
    ) {
      course.status =
        "published";
    }

    else {
      course.status =
        "draft";
    }

    // SAVE
    await course.save();
    req.flash( "success","Course published successfully"
    );
    res.redirect(
      "/admin-courses"
    );
  }
  catch (err) {
    console.log(err);
    req.flash("error","Failed to publish course")
    res.redirect(
      "/admin-courses"
    );
  }
};


exports.getAdminLogout =
(req, res) => {

  delete req.session.admin;

  res.setHeader(

    "Cache-Control",

    "no-store, no-cache, must-revalidate, private"
  );

  res.redirect("/admin-login");

};


