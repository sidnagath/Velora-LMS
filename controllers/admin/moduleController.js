import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import moduleService from '../../services/moduleService.js';


export const getAdminCourseModules = async (req, res) => {
  try {
    const result = await moduleService.getCourseModules(req.params.courseId);
    if (!result.success) {
      req.flash("error", result.error || "Course not found");
      return res.redirect("/admin/courses");
    }

    res.render("pages/admin/courses/modules", {
      title: "Velora - Course Curriculum",
      isLoggedIn: true,
      isAdmin: true,
      course: result.course,
      modules: result.modules,
      lessons: result.lessons,
      resources: result.resources,
      flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
      flashType: req.query.flashType || "success",
      errors: {},
      formData: {}
    });
  } catch (err) {
    console.log(err);
    res.redirect("/admin/courses");
  }
};

export const postAdminAddModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await moduleService.addModule(req.params.courseId, title, description);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to add module', errors: result.errors });
    }

    return res.status(HTTP_STATUS_CODES.CREATED).json({ success: true, message: 'Module added successfully', module: result.module });
  } catch (err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};

export const postAdminEditModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await moduleService.editModule(req.params.courseId, req.params.moduleId, title, description);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to edit module', errors: result.errors });
    }

    return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: 'Module updated successfully', module: result.module });
  } catch (err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};

export const postAdminDeleteModule = async (req, res) => {
  try {
    const result = await moduleService.deleteModule(req.params.courseId, req.params.moduleId);
    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.error });
    }

    return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: 'Module deleted successfully' });
  } catch(err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};


export default {
  getAdminCourseModules,
  postAdminAddModule,
  postAdminEditModule,
  postAdminDeleteModule
};
