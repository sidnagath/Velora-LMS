import Module from '../models/moduleModel.js';
import Lesson from '../models/lessonModel.js';
import Resource from '../models/resourceModel.js';
import cloudinaryUtil from '../config/cloudinary.js';


function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const uploadFile = async (courseId, moduleId, lessonId, file, fileValidationErrors) => {
  if (fileValidationErrors && fileValidationErrors.resourceFile) return { success: false, error: fileValidationErrors.resourceFile, status: 400 };
  if (!moduleId || !lessonId) return { success: false, error: "Select a module and lesson", status: 400 };
  if (!file) return { success: false, error: "Please upload a file", status: 400 };

  const module = await Module.findOne({ _id: moduleId, courseId });
  if (!module) return { success: false, error: "Module not found", status: 404 };

  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
  if (!lesson) return { success: false, error: "Lesson not found", status: 404 };

  let resource = await Resource.findOne({ courseId, moduleId, lessonId });
  if (!resource) {
    resource = new Resource({ courseId, moduleId, lessonId, files: [], links: [], notes: "" });
  }

  let fileUrl = "";
  if (file) {
    const uploadResult = await cloudinaryUtil.uploadToCloudinary(file.path, 'course_resources', 'auto');
    fileUrl = uploadResult ? uploadResult.secure_url : "";
  }

  resource.files.push({
    name: file.originalname,
    path: fileUrl,
    size: formatBytes(file.size)
  });

  await resource.save();
  return { success: true, files: resource.files };
};

export const deleteFile = async (courseId, moduleId, lessonId, fileId) => {
  if (!moduleId || !lessonId || !fileId) return { success: false, error: "Missing required parameters", status: 400 };

  const resource = await Resource.findOne({ courseId, moduleId, lessonId });
  if (!resource) return { success: false, error: "Resource not found", status: 404 };

  const fileExists = resource.files.some(f => f._id.toString() === fileId.toString());
  if (!fileExists) return { success: false, error: "File not found", status: 404 };

  resource.files = resource.files.filter(f => f._id.toString() !== fileId.toString());
  await resource.save();

  return { success: true, files: resource.files };
};

export const addLink = async (courseId, moduleId, lessonId, title, url, description) => {
  const trimmedTitle = title?.trim();
  const trimmedUrl = url?.trim();
  const trimmedDesc = description?.trim();

  if (!moduleId || !lessonId) return { success: false, error: "Select a module and lesson", status: 400 };
  if (!trimmedTitle) return { success: false, error: "Enter link title", status: 400 };
  if (!trimmedUrl) return { success: false, error: "Enter link URL", status: 400 };

  if (!/^https?:\/\/.+/i.test(trimmedUrl)) return { success: false, error: "Enter a valid URL", status: 400 };

  const module = await Module.findOne({ _id: moduleId, courseId });
  if (!module) return { success: false, error: "Module not found", status: 404 };

  const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
  if (!lesson) return { success: false, error: "Lesson not found", status: 404 };

  let resource = await Resource.findOne({ courseId, moduleId, lessonId });
  if (!resource) {
    resource = new Resource({ courseId, moduleId, lessonId, files: [], links: [], notes: "" });
  }

  resource.links.push({ title: trimmedTitle, url: trimmedUrl, description: trimmedDesc || "" });
  await resource.save();

  return { success: true, links: resource.links };
};

export const deleteLink = async (courseId, moduleId, lessonId, linkId) => {
  if (!moduleId || !lessonId || !linkId) return { success: false, error: "Missing required parameters", status: 400 };

  const resource = await Resource.findOne({ courseId, moduleId, lessonId });
  if (!resource) return { success: false, error: "Resource not found", status: 404 };

  const linkExists = resource.links.some(l => l._id.toString() === linkId.toString());
  if (!linkExists) return { success: false, error: "Link not found", status: 404 };

  resource.links = resource.links.filter(l => l._id.toString() !== linkId.toString());
  await resource.save();

  return { success: true, links: resource.links };
};


export default {
  uploadFile,
  deleteFile,
  addLink,
  deleteLink
};
