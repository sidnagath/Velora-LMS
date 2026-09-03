import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import lessonService from '../../services/lessonService.js';


export const postAdminAddLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.addLesson(req.params.courseId, req.params.moduleId, title, description, duration, req.file, req.fileValidationError);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to add lesson', errors: result.errors });
    }

    return res.status(HTTP_STATUS_CODES.CREATED).json({ success: true, message: 'Lesson added successfully', lesson: result.lesson });
  } catch (err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};

export const postAdminEditLesson = async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const result = await lessonService.editLesson(req.params.courseId, req.params.moduleId, req.params.lessonId, title, description, duration, req.file, req.fileValidationError);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Failed to edit lesson', errors: result.errors });
    }

    return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: 'Lesson updated successfully', lesson: result.lesson });
  } catch (err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};

export const postAdminDeleteLesson = async (req, res) => {
  try {
    const result = await lessonService.deleteLesson(req.params.courseId, req.params.moduleId, req.params.lessonId);
    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.error });
    }

    return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: 'Lesson deleted successfully' });
  } catch (err) {
    console.log(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
  }
};


export default {
  postAdminAddLesson,
  postAdminEditLesson,
  postAdminDeleteLesson
};
