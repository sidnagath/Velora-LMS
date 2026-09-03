import Course from '../models/courseModel.js';
import Module from '../models/moduleModel.js';
import Lesson from '../models/lessonModel.js';
import Resource from '../models/resourceModel.js';


export const getCourseModules = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) return { success: false, error: "Course not found" };

  const modules = await Module.find({ courseId }).sort({ order: 1 });
  const lessons = await Lesson.find({ moduleId: { $in: modules.map(m => m._id) } }).sort({ order: 1 });
  const resources = await Resource.find({ courseId });

  return { success: true, course, modules, lessons, resources };
};

export const addModule = async (courseId, title, description) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  let errors = {};

  if (!trimmedTitle) errors.title = "Enter module title";
  else if (trimmedTitle.length < 3) errors.title = "Module title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter module description";

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const course = await Course.findById(courseId);
  if (!course) return { success: false, error: "Course not found", status: 404 };

  const moduleCount = await Module.countDocuments({ courseId });
  const newModule = await Module.create({
    courseId,
    title: trimmedTitle,
    description: trimmedDesc,
    order: moduleCount + 1
  });

  return { success: true, module: newModule, course };
};

export const editModule = async (courseId, moduleId, title, description) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  let errors = {};

  if (!trimmedTitle) errors.title = "Enter module title";
  else if (trimmedTitle.length < 3) errors.title = "Module title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter module description";

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const course = await Course.findById(courseId);
  const module = await Module.findOne({ _id: moduleId, courseId });

  if (!course || !module) return { success: false, error: "Not found", status: 404 };

  module.title = trimmedTitle;
  module.description = trimmedDesc;
  await module.save();

  return { success: true, module, course };
};

export const deleteModule = async (courseId, moduleId) => {
  const module = await Module.findOne({ _id: moduleId, courseId });
  if (!module) return { success: false, error: "Module not found", status: 404 };

  await Module.findByIdAndDelete(moduleId);
  return { success: true };
};


export default {
  getCourseModules,
  addModule,
  editModule,
  deleteModule
};
