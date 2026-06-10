const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');
const Course = require('../../models/courseModel');
const Module = require('../../models/moduleModel');
const Lesson = require('../../models/lessonModel');
const Resource = require('../../models/resourceModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const createTransporter = require('../../config/mail');

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

exports.postAdminCourseResourcesUploadFile =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {
      moduleId,
      lessonId
    } = req.body;

    const file =
      req.file;

    // VALIDATION

    if (
      !moduleId ||
      !lessonId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Select a module and lesson"

      });

    }

    if (!file) {

      return res.status(400).json({

        success: false,

        error:
          "Please upload a file"

      });

    }

    // CHECK MODULE

    const module =

      await Module.findOne({

        _id: moduleId,

        courseId

      });

    if (!module) {

      return res.status(404).json({

        success: false,

        error:
          "Module not found"

      });

    }

    // CHECK LESSON

    const lesson =

      await Lesson.findOne({

        _id: lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      resource =

        new Resource({

          courseId,

          moduleId,

          lessonId,

          files: [],

          links: [],

          notes: ""

        });

    }

    // FILE SIZE

    const fileSizeString =

      formatBytes(
        file.size
      );

    // ADD FILE

    resource.files.push({

      name:
        file.originalname,

      path:
        "/uploads/" +
        file.filename,

      size:
        fileSizeString

    });

    await resource.save();

    return res.json({

      success: true,

      files:
        resource.files

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

exports.postAdminCourseResourcesDeleteFile =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {
      moduleId,
      lessonId,
      fileId
    } = req.body;

    // VALIDATION

    if (
      !moduleId ||
      !lessonId ||
      !fileId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Missing required parameters"

      });

    }

    // RESOURCE

    const resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      return res.status(404).json({

        success: false,

        error:
          "Resource not found"

      });

    }

    // FILE EXISTS

    const fileExists =

      resource.files.some(

        file =>

          file._id.toString()

          ===

          fileId.toString()

      );

    if (!fileExists) {

      return res.status(404).json({

        success: false,

        error:
          "File not found"

      });

    }

    // DELETE FILE

    resource.files =

      resource.files.filter(

        file =>

          file._id.toString()

          !==

          fileId.toString()

      );

    await resource.save();

    return res.json({

      success: true,

      files:
        resource.files

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

exports.postAdminCourseResourcesAddLink =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    let {

      moduleId,

      lessonId,

      title,

      url,

      description

    } = req.body;


    // TRIM

    title =
      title?.trim();

    url =
      url?.trim();

    description =
      description?.trim();

    // VALIDATION

    if (
      !moduleId ||
      !lessonId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Select a module and lesson"

      });

    }

    if (!title) {

      return res.status(400).json({

        success: false,

        error:
          "Enter link title"

      });

    }

    if (!url) {

      return res.status(400).json({

        success: false,

        error:
          "Enter link URL"

      });

    }

    // URL VALIDATION

    const urlRegex =
      /^https?:\/\/.+/i;

    if (
      !urlRegex.test(url)
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Enter a valid URL"

      });

    }

    // MODULE CHECK

    const module =

      await Module.findOne({

        _id: moduleId,

        courseId

      });

    if (!module) {

      return res.status(404).json({

        success: false,

        error:
          "Module not found"

      });

    }

    // LESSON CHECK

    const lesson =

      await Lesson.findOne({

        _id: lessonId,

        moduleId

      });

    if (!lesson) {

      return res.status(404).json({

        success: false,

        error:
          "Lesson not found"

      });

    }

    // RESOURCE

    let resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      resource =

        new Resource({

          courseId,

          moduleId,

          lessonId,

          files: [],

          links: [],

          notes: ""

        });

    }

    // ADD LINK

    resource.links.push({

      title,

      url,

      description:
        description || ""

    });

    await resource.save();

    return res.json({

      success: true,

      links:
        resource.links

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

exports.postAdminCourseResourcesDeleteLink =
async (req, res) => {

  try {

    const { courseId } =
      req.params;

    const {

      moduleId,

      lessonId,

      linkId

    } = req.body;

    // VALIDATION

    if (

      !moduleId ||

      !lessonId ||

      !linkId

    ) {

      return res.status(400).json({

        success: false,

        error:
          "Missing required parameters"

      });

    }

    // RESOURCE

    const resource =

      await Resource.findOne({

        courseId,

        moduleId,

        lessonId

      });

    if (!resource) {

      return res.status(404).json({

        success: false,

        error:
          "Resource not found"

      });

    }

    // LINK EXISTS

    const linkExists =

      resource.links.some(

        link =>

          link._id.toString()

          ===

          linkId.toString()

      );

    if (!linkExists) {

      return res.status(404).json({

        success: false,

        error:
          "Link not found"

      });

    }

    // DELETE LINK

    resource.links =

      resource.links.filter(

        link =>

          link._id.toString()

          !==

          linkId.toString()

      );

    await resource.save();

    return res.json({

      success: true,

      links:
        resource.links

    });

  }

  catch (err) {

    console.log(err);

    return res.status(500).json({

      success: false,

      error:
        "Something went wrong"

    });

  }

};

