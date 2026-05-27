const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const Lesson = require("../models/lessonModel");

exports.getHome = async (req, res) => {
  const isLoggedIn = !!(req.session && req.session.user);
  res.render("pages/guest/home", { title: "Home - Velora", isLoggedIn });
};

exports.getCourses = async (req, res) => {

  try {

    // QUERY VALUES

    const {
      category,
      level,
      price,
      search
    } = req.query;



    // CURRENT PAGE

    const page = Number(req.query.page) || 1;



    // LIMIT

    const limit = 6;



    // SKIP

    const skip = (page - 1) * limit;



    // FILTER OBJECT

    const filter = {

      status: "published",

      isDeleted: false

    };


 const selectedCategory = category || "html";

filter.category = {
  $regex: new RegExp(`^${selectedCategory}$`, "i")
};



    // LEVEL FILTER

    if(level){

      filter.level = {

        $regex: new RegExp(`^${level}$`, "i")

      };

    }



    // PRICE FILTER

    if(price === "free"){

      filter.basePrice = 0;

    }

    else if(price === "paid"){

      filter.basePrice = {

        $gt: 0

      };

    }



    // SEARCH FILTER

    if(search){

      filter.title = {

        $regex: search,

        $options: "i"

      };

    }



    // TOTAL COURSES

    const totalCourses =

      await Course.countDocuments(filter);



    // TOTAL PAGES

    const totalPages =

      Math.ceil(totalCourses / limit);

  

    // COURSES

    const courses =

      await Course.find(filter)

    .sort({
  rating: -1,
  reviewsCount: -1,
  createdAt: -1,
  _id: -1
})

      .skip(skip)

      .limit(limit);



    const isLoggedIn = !!(req.session && req.session.user);

    // RENDER

    res.render(

      "pages/guest/courses",

      {

        title: "Velora Courses",

        courses,

        currentPage: page,

        totalPages,

        selectedCategory: selectedCategory,

        selectedLevel: level || "",

        selectedPrice: price || "",

        search: search || "",

        isLoggedIn

      }

    );

  }

  catch (err) {

    console.log(err);

    res.redirect("/");

  }

};

exports.getCourseDetails = async (req, res) => {

  try {

    const course = await Course.findOne({
      _id: req.params.courseId,
      status: "published",
      isDeleted: false
    }).lean();

    if (!course) {
      return res.redirect("/courses");
    }

    const modules = await Module.find({
      courseId: course._id
    })
    .sort({ order: 1 })
    .lean();

    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {

        const lessons = await Lesson.find({
          moduleId: mod._id
        })
        .sort({ order: 1 })
        .lean();

        return {
          ...mod,
          lessons
        };

      })
    );

    const totalLessons = modulesWithLessons.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );

    const relatedCourses = await Course.find({
      category: course.category,
      _id: { $ne: course._id },
      status: "published",
      isDeleted: false
    })
    .limit(4)
    .lean();

    res.render("pages/guest/course-detail", {

      title: `Velora - ${course.title}`,

      isLoggedIn: false,

      course,

      modulesWithLessons,

      totalLessons,

      relatedCourses

    });

  }

  catch (err) {

    console.log(err);

    res.redirect("/courses");

  }

};
