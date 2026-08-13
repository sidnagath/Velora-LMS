const Course = require('../models/courseModel');
const Module = require('../models/moduleModel');
const Lesson = require('../models/lessonModel');
const cloudinaryUtil = require('../config/cloudinary');

exports.addLesson = async (courseId, moduleId, title, description, duration, videoFile, fileValidationErrors) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  const trimmedDuration = duration?.toString().trim();

  const module = await Module.findOne({ _id: moduleId, courseId });
  if (!module) return { success: false, status: 404 };

  let errors = {};
  if (fileValidationErrors) {
    Object.assign(errors, fileValidationErrors);
  }
  if (!trimmedTitle) errors.title = "Enter lesson title";
  else if (trimmedTitle.length < 3) errors.title = "Lesson title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter lesson description";

  if (!trimmedDuration) {
    errors.duration = "Enter lesson duration";
  } else {
    const durNum = Number(trimmedDuration);
    if (isNaN(durNum) || durNum <= 0 || durNum > 600) {
      errors.duration = "Duration must be between 1 and 600 minutes";
    }
  }

  if (!videoFile && !errors.video) errors.video = "Upload lesson video";
  
  if (videoFile) {
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    if (!allowedVideoTypes.includes(videoFile.mimetype) && !errors.video) errors.video = "Video must be MP4 or MOV";
    const maxVideoSize = 500 * 1024 * 1024;
    if (videoFile.size > maxVideoSize) errors.video = "Video exceeds 500MB";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  let videoUrl = "";
  let videoPublicId = "";
  if (videoFile) {
    const uploadResult = await cloudinaryUtil.uploadToCloudinary(videoFile.path, 'lesson_videos', 'video', true, 'authenticated');
    videoUrl = uploadResult ? uploadResult.secure_url : "";
    videoPublicId = uploadResult ? uploadResult.public_id : "";
  }

  const lessonCount = await Lesson.countDocuments({ moduleId });
  const newLesson = await Lesson.create({
    moduleId,
    title: trimmedTitle,
    description: trimmedDesc,
    duration: trimmedDuration || null,
    video: videoUrl,
    videoPublicId: videoPublicId,
    order: lessonCount + 1
  });

  return { success: true, lesson: newLesson };
};

exports.editLesson = async (courseId, moduleId, lessonId, title, description, duration, videoFile, fileValidationErrors) => {
  const trimmedTitle = title?.trim();
  const trimmedDesc = description?.trim();
  const trimmedDuration = duration?.toString().trim();

  const course = await Course.findById(courseId);
  const module = await Module.findOne({ _id: moduleId, courseId });
  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });

  if (!course || !module || !lesson) return { success: false, status: 404 };

  let errors = {};
  if (fileValidationErrors) {
    Object.assign(errors, fileValidationErrors);
  }
  if (!trimmedTitle) errors.title = "Enter lesson title";
  else if (trimmedTitle.length < 3) errors.title = "Lesson title must be at least 3 characters";

  if (!trimmedDesc) errors.description = "Enter lesson description";

  if (!trimmedDuration) {
    errors.duration = "Enter lesson duration";
  } else {
    const durNum = Number(trimmedDuration);
    if (isNaN(durNum) || durNum <= 0 || durNum > 600) {
      errors.duration = "Duration must be between 1 and 600 minutes";
    }
  }

  if (videoFile) {
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    if (!allowedVideoTypes.includes(videoFile.mimetype) && !errors.video) errors.video = "Video must be MP4 or MOV";
    const maxVideoSize = 500 * 1024 * 1024;
    if (videoFile.size > maxVideoSize) errors.video = "Video exceeds 500MB";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  lesson.title = trimmedTitle;
  lesson.description = trimmedDesc;
  lesson.duration = trimmedDuration;
  
  if (videoFile) {
    const uploadResult = await cloudinaryUtil.uploadToCloudinary(videoFile.path, 'lesson_videos', 'video');
    if (uploadResult) {
      lesson.video = uploadResult.secure_url;
    }
  }

  await lesson.save();

  return { success: true, lesson };
};

exports.deleteLesson = async (courseId, moduleId, lessonId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
  if (!lesson) return { success: false, error: "Lesson not found" };

  await Lesson.findByIdAndDelete(lessonId);
  return { success: true };
};
