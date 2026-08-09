const lessonService = require('../../services/lessonService');

exports.postAdminAddLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.addLesson(req.params.courseId, req.params.moduleId, title, description, duration, req.file, req.fileValidationError);

    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Failed to add lesson', errors: result.errors });
    }

    return res.status(201).json({ success: true, message: 'Lesson added successfully', lesson: result.lesson });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.postAdminEditLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.editLesson(req.params.courseId, req.params.moduleId, req.params.lessonId, title, description, duration, req.file, req.fileValidationError);

    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Failed to edit lesson', errors: result.errors });
    }

    return res.status(200).json({ success: true, message: 'Lesson updated successfully', lesson: result.lesson });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.postAdminDeleteLesson = async (req, res) => {
  try {
    const result = await lessonService.deleteLesson(req.params.courseId, req.params.moduleId, req.params.lessonId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
