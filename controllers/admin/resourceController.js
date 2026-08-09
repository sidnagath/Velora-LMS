const resourceService = require('../../services/resourceService');

exports.postAdminCourseResourcesUploadFile = async (req, res) => {
  try {
    const { moduleId, lessonId } = req.body;
    const result = await resourceService.uploadFile(req.params.courseId, moduleId, lessonId, req.file, req.fileValidationError);

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.status(201).json({ success: true, message: 'File uploaded successfully', data: { files: result.files } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.postAdminCourseResourcesDeleteFile = async (req, res) => {
  try {
    const { moduleId, lessonId, fileId } = req.body;
    const result = await resourceService.deleteFile(req.params.courseId, moduleId, lessonId, fileId);

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: 'File deleted successfully', data: { files: result.files } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.postAdminCourseResourcesAddLink = async (req, res) => {
  try {
    const { moduleId, lessonId, title, url, description } = req.body;
    const result = await resourceService.addLink(req.params.courseId, moduleId, lessonId, title, url, description);

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.status(201).json({ success: true, message: 'Link added successfully', data: { links: result.links } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.postAdminCourseResourcesDeleteLink = async (req, res) => {
  try {
    const { moduleId, lessonId, linkId } = req.body;
    const result = await resourceService.deleteLink(req.params.courseId, moduleId, lessonId, linkId);

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: 'Link deleted successfully', data: { links: result.links } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
