const Course = require("../models/courseModel");

exports.getHome = async (req, res) => {
  const isLoggedIn = !!(req.session && req.session.user);
  res.render("pages/guest/home", { title: "Home - Velora", isLoggedIn });
};

exports.getCourses= async (req, res) => {
  try {
    const courses =
      await Course.find({
        status: "published"
      });
    res.render(
      "pages/guest/courses",
      {
        title:
        "Velora - Courses",
        isLoggedIn:false,
        courses
      }
    );
  }
  catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getCourseDetails = async (req, res) => {
  res.render("pages/guest/course-detail", { title: "Course Detail - Velora", isLoggedIn:false,course});
};

