const Course = require('../models/courseModel');
const Module = require('../models/moduleModel');
const Lesson = require('../models/lessonModel');

exports.addLesson = async (courseId, moduleId, title, description, duration, videoFile) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  const trimmedDuration = duration?.toString().trim();

  const module = await Module.findOne({ _id: moduleId, courseId });
  if (!module) return { success: false, status: 404 };

  let errors = {};
  if (!trimmedTitle) errors.title = "Enter lesson title";
  else if (trimmedTitle.length < 3) errors.title = "Lesson title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter lesson description";

  if (!videoFile) errors.video = "Upload lesson video";
  
  if (videoFile) {
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    if (!allowedVideoTypes.includes(videoFile.mimetype)) errors.video = "Video must be MP4 or MOV";
    const maxVideoSize = 500 * 1024 * 1024;
    if (videoFile.size > maxVideoSize) errors.video = "Video exceeds 500MB";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  const lessonCount = await Lesson.countDocuments({ moduleId });
  const newLesson = await Lesson.create({
    moduleId,
    title: trimmedTitle,
    description: trimmedDesc,
    duration: trimmedDuration || null,
    video: "/uploads/" + videoFile.filename,
    order: lessonCount + 1
  });

  return { success: true, lesson: newLesson };
};

exports.editLesson = async (courseId, moduleId, lessonId, title, description, duration, videoFile) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  const trimmedDuration = duration?.toString().trim();

  const course = await Course.findById(courseId);
  const module = await Module.findOne({ _id: moduleId, courseId });
  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });

  if (!course || !module || !lesson) return { success: false, status: 404 };

  let errors = {};
  if (!trimmedTitle) errors.title = "Enter lesson title";
  else if (trimmedTitle.length < 3) errors.title = "Lesson title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter lesson description";

  if (videoFile) {
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    if (!allowedVideoTypes.includes(videoFile.mimetype)) errors.video = "Video must be MP4 or MOV";
    const maxVideoSize = 500 * 1024 * 1024;
    if (videoFile.size > maxVideoSize) errors.video = "Video exceeds 500MB";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  lesson.title = trimmedTitle;
  lesson.description = trimmedDesc;
  if (trimmedDuration) lesson.duration = trimmedDuration;
  if (videoFile) lesson.video = "/uploads/" + videoFile.filename;

  await lesson.save();

  return { success: true, lesson };
};

exports.deleteLesson = async (courseId, moduleId, lessonId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
  if (!lesson) return { success: false, error: "Lesson not found" };

  await Lesson.findByIdAndDelete(lessonId);
  return { success: true };
};
