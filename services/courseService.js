const mongoose = require('mongoose');
const Category = require('../models/categoryModel');
const Course = require('../models/courseModel');
const Module = require('../models/moduleModel');
const Lesson = require('../models/lessonModel');
const Resource = require('../models/resourceModel');
const User = require('../models/userModel');
const cloudinaryUtil = require('../config/cloudinary');
const Enrollment=require('../models/enrollmentModel');


const calculateTotalDuration = (lessons) => {
  let totalMinutes = 0;
  lessons.forEach(l => {
    if (l.duration) {
      const raw = String(l.duration).trim();
      if (raw.includes(':')) {
        const parts = raw.split(':').map(Number);
        if (parts.length === 3) totalMinutes += (parts[0]*60) + parts[1] + (parts[2]/60);
        else if (parts.length === 2) totalMinutes += parts[0] + (parts[1]/60);
      } else {
        const n = parseFloat(raw);
        if (!isNaN(n)) totalMinutes += n;
      }
    }
  });
  return totalMinutes;
};

const formatDuration = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '00:00';
  let h = Math.floor(totalMinutes / 60);
  let m = Math.floor(totalMinutes % 60);
  let s = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
  
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    h += 1;
  }
  
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
};

const formatLessonDurationAsMMSS = (durationRaw) => {
  if (!durationRaw) return '00:00';
  const raw = String(durationRaw).trim();
  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length === 3) return raw;
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return raw;
  }
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return '00:00';
  let minutes = Math.floor(n);
  let seconds = Math.round((n - minutes) * 60);
  
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
exports.getAdminCoursesList = async (query) => {
  try {
    // SEARCH
    const search = query.search?.trim() || "";

    // FILTERS
    const filterStatus   = query.status   || "";
    const filterLevel    = query.level    || "";
    const filterCategory = query.category || "";
    const sortBy         = query.sortBy   || "newestUpdated";

    // PAGE
    const page  = Number(query.page) || 1;
    const LIMIT = 10;
    const skip  = (page - 1) * LIMIT;

    // BUILD FILTER
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { level: { $regex: search, $options: "i" } }
      ];
    }

    if (filterStatus)   filter.status   = filterStatus;
    if (filterLevel)    filter.level    = filterLevel;
    if (filterCategory) {
      if (mongoose.Types.ObjectId.isValid(filterCategory)) {
        filter.category = filterCategory;
      } else {
        filter.category = new mongoose.Types.ObjectId();
      }
    }

    // BUILD SORT
    const sortMap = {
      newestUpdated: { updatedAt: -1 },
      oldestUpdated: { updatedAt:  1 },
      titleAZ:       { title:      1 },
      titleZA:       { title:     -1 }
    };
    const sort = sortMap[sortBy] || { updatedAt: -1 };

    // QUERY
    const [courses, totalCourses] = await Promise.all([
      Course.find(filter).populate("category").sort(sort).skip(skip).limit(LIMIT),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / LIMIT);

    const publishedCourses  = await Course.countDocuments({ status: "published" });
    const draftCourses      = await Course.countDocuments({ status: "draft" });
    const instructorsCount  = await Course.distinct("instructor");

    // Gather all active categories for the filter dropdown
    const allCategories = await Category.find({ status: "active" }).sort({ name: 1 });

    return {
      success: true,
      data: {
        courses,
        search,
        currentPage: page,
        totalPages,
        totalCourses,
        publishedCourses,
        draftCourses,
        instructorsCount: instructorsCount.length,
        allCategories,
        LIMIT,
        filterStatus,
        filterLevel,
        filterCategory,
        sortBy
      }
    };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Something went wrong. Please try again." } };
  }
};

exports.getAdminCreateCourseData = async () => {
  try {
    const categories = await Category.find({ status: "active" }).sort({ name: 1 });
    return { success: true, data: { categories } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to load categories." } };
  }
};

exports.createCourse = async (data, files, fileValidationErrors) => {
  try {
    let { title, description, category, instructor, level } = data;

    title = title?.trim();
    description = description?.trim();
    category = category?.trim();
    instructor = instructor?.trim();
    level = level?.trim();

    const thumbnailFile = files?.thumbnail?.[0];
    const trailerFile = files?.trailer?.[0];

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

    if (!title) {errors.title = "Enter course title";
    } else if (title.length < 5) {
    errors.title = "Title must be at least 5 characters";
} else if (title.length > 100) {
    errors.title = "Title cannot exceed 100 characters";
}
    if (!description) {errors.description = "Enter course description";
    } else if (description.length < 10) {
    errors.description = "Description must be at least 10 characters";
}
    if (!category) {
      errors.category = "Select category";
    } else if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.category = "Invalid category format";
    }
    if (!instructor) errors.instructor = "Enter instructor name";
    if (!level) errors.level = "Select course level";
    if (!thumbnailFile && !errors.thumbnail) errors.thumbnail = "Upload thumbnail";
    if (!trailerFile && !errors.trailer) errors.trailer = "Upload trailer";

    if (Object.keys(errors).length > 0) {
      const categories = await Category.find({ status: "active" }).sort({ name: 1 });
      return { success: false, errors, data: { categories } };
    }

    let thumbnailPath = "";
    if (thumbnailFile) {
      const thumbResult = await cloudinaryUtil.uploadToCloudinary(thumbnailFile.path, 'course_thumbnails', 'image');
      thumbnailPath = thumbResult ? thumbResult.secure_url : "";
    }

    let trailerPath = "";
    if (trailerFile) {
      const trailerResult = await cloudinaryUtil.uploadToCloudinary(trailerFile.path, 'course_trailers', 'video');
      trailerPath = trailerResult ? trailerResult.secure_url : "";
    }

    const course = await Course.create({
      title,
      description,
      category,
      instructor,
      level,
      thumbnail: thumbnailPath,
      trailer: trailerPath,
      status: "draft"
    });

    return { success: true, data: { course } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to create course." } };
  }
};

exports.getAdminEditCourseData = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, errors: { general: "Course not found." } };
    }
    const categories = await Category.find({ status: "active" }).sort({ name: 1 });
    return { success: true, data: { course, categories } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to load course" } };
  }
};

exports.updateCourse = async (courseId, data, files, fileValidationErrors) => {
  try {
    let { title, description, category, instructor, level } = data;

    title = title?.trim();
    description = description?.trim();
    category = category?.trim();
    instructor = instructor?.trim();
    level = level?.trim();

    const thumbnailFile = files?.thumbnail?.[0];
    const trailerFile = files?.trailer?.[0];

    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return { success: false, errors: { general: "Course not found" } };
    }

    let errors = {};
    if (fileValidationErrors) {
      Object.assign(errors, fileValidationErrors);
    }

    if (!title) errors.title = "Enter course title";
    if (!description) errors.description = "Enter course description";
    if (!category) {
      errors.category = "Select category";
    } else if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.category = "Invalid category format";
    }
    if (!instructor) errors.instructor = "Enter instructor name";
    if (!level) errors.level = "Select course level";

    if (!thumbnailFile && !existingCourse.thumbnail && !errors.thumbnail) errors.thumbnail = "Upload thumbnail image";
    if (!trailerFile && !existingCourse.trailer && !errors.trailer) errors.trailer = "Upload trailer video";

    if (title && title.length < 5) errors.title = "Title must be minimum 5 characters";
    if (description && description.length < 10) errors.description = "Description must be minimum 10 characters";

    const instructorRegex = /^[A-Za-z ]{3,30}$/;
    if (instructor && !instructorRegex.test(instructor)) {
      errors.instructor = "Instructor name is invalid";
    }

    const allowedLevels = ["Beginner", "Intermediate", "Advanced"];
    if (level && !allowedLevels.includes(level)) {
      errors.level = "Invalid course level";
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (thumbnailFile && !allowedImageTypes.includes(thumbnailFile.mimetype) && !errors.thumbnail) {
      errors.thumbnail = "Thumbnail must be JPG, PNG or WEBP";
    }

    const allowedVideoTypes = ["video/mp4", "video/quicktime"];
    if (trailerFile && !allowedVideoTypes.includes(trailerFile.mimetype) && !errors.trailer) {
      errors.trailer = "Trailer must be MP4 or MOV";
    }

    const maxThumbnailSize = 5 * 1024 * 1024;
    const maxTrailerSize = 100 * 1024 * 1024;

    if (thumbnailFile && thumbnailFile.size > maxThumbnailSize) errors.thumbnail = "Thumbnail exceeds 5MB";
    if (trailerFile && trailerFile.size > maxTrailerSize) errors.trailer = "Trailer exceeds 100MB";

    if (Object.keys(errors).length > 0) {
      const categories = await Category.find({ status: "active" }).sort({ name: 1 });
      return { success: false, errors, data: { course: existingCourse, categories } };
    }

    let thumbnailPath = existingCourse.thumbnail;
    if (thumbnailFile) {
      const thumbResult = await cloudinaryUtil.uploadToCloudinary(thumbnailFile.path, 'course_thumbnails', 'image');
      if (thumbResult) thumbnailPath = thumbResult.secure_url;
    }
    
    let trailerPath = existingCourse.trailer;
    if (trailerFile) {
      const trailerResult = await cloudinaryUtil.uploadToCloudinary(trailerFile.path, 'course_trailers', 'video');
      if (trailerResult) trailerPath = trailerResult.secure_url;
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        title,
        description,
        category,
        instructor,
        level,
        thumbnail: thumbnailPath,
        trailer: trailerPath,
        status: existingCourse.status || "draft"
      },
      { new: true }
    );

    return { success: true, data: { course } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Something went wrong" } };
  }
};

exports.deleteCourse = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, errors: { general: "Course not found" } };
    }

    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(module => module._id);

    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } });
    const lessonIds = lessons.map(lesson => lesson._id);

    await Resource.deleteMany({ lessonId: { $in: lessonIds } });
    await Lesson.deleteMany({ moduleId: { $in: moduleIds } });
    await Module.deleteMany({ courseId });
    await Course.findByIdAndDelete(courseId);

    return { success: true, data: { courseTitle: course.title } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to delete course" } };
  }
};

exports.getAdminCoursePublishData = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, errors: { general: "Course not found" } };
    }

    const modules = await Module.find({ courseId }).lean();
    const lessons = await Lesson.find({ moduleId: { $in: modules.map(m => m._id) } }).lean();

    const formattedLessons = lessons.map(lesson => ({
      ...lesson,
      durationFormatted: formatLessonDurationAsMMSS(lesson.duration)
    }));

    const totalMinutes = calculateTotalDuration(lessons);
    const totalDurationFormatted = formatDuration(totalMinutes);

    const canPublish = modules.length > 0 && lessons.length > 0 && course.title && course.description && course.thumbnail && course.trailer;

    return { success: true, data: { course, modules, lessons: formattedLessons, canPublish, totalDurationFormatted } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to load course publish data" } };
  }
};

exports.publishCourse = async (courseId, data) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, errors: { general: "Course not found" } };
    }

    const modules = await Module.find({ courseId });
    const lessons = await Lesson.find({ moduleId: { $in: modules.map(m => m._id) } });

    let { pricingType, currency, basePrice, discountPrice, lifetimeAccess, downloadableResources, completionCertificate, publishStatus } = data;

    pricingType = pricingType?.trim() || "paid";
    currency = currency?.trim() || "INR";
    const isPublishing = publishStatus === "Published (Live Now)";
    let errors = {};

    let bPrice = pricingType === "free" ? 0 : Number(basePrice || 0);
    let dPrice = pricingType === "free" ? 0 : Number(discountPrice || 0);

    if (pricingType !== "free") {
      if (isNaN(bPrice) || bPrice <= 0) {
        errors.basePrice = "Base price must be greater than 0";
      }
      if (isNaN(dPrice) || dPrice < 0) {
        errors.discountPrice = "Discount price must be a valid positive number";
      } else if (bPrice > 0 && dPrice >= bPrice) {
        errors.discountPrice = "Discount price must be less than base price";
      }
    }

    if (isPublishing) {
      if (modules.length === 0) errors.general = "Add at least one module before publishing";
      else if (lessons.length === 0) errors.general = "Add at least one lesson before publishing";
      else if (!course.title) errors.general = "Course title missing";
      else if (!course.description) errors.general = "Course description missing";
      else if (!course.thumbnail) errors.general = "Course thumbnail missing";
      else if (!course.trailer) errors.general = "Course trailer missing";
    }

    if (Object.keys(errors).length > 0) {
      const totalMinutes = calculateTotalDuration(lessons);
      const totalDurationFormatted = formatDuration(totalMinutes);
      return { success: false, errors, data: { course, modules, lessons, totalDurationFormatted } };
    }

    course.pricingType = pricingType;
    course.currency = currency;
    course.basePrice = bPrice;
    course.discountPrice = dPrice;
    course.lifetimeAccess = lifetimeAccess === "on" || lifetimeAccess === true;
    course.downloadableResources = downloadableResources === "on" || downloadableResources === true;
    course.completionCertificate = completionCertificate === "on" || completionCertificate === true;
    course.status = isPublishing ? "published" : "draft";

    await course.save();

    return { success: true, data: { courseTitle: course.title, isPublishing } };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to publish course" } };
  }
};

exports.toggleCourseStatus = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) return { success: false, errors: { general: "Course not found" } };

    const newPublishStatus = course.status === "published" ? "Draft" : "Published (Live Now)";

    const data = {
      pricingType: course.pricingType,
      currency: course.currency,
      basePrice: course.basePrice,
      discountPrice: course.discountPrice,
      lifetimeAccess: course.lifetimeAccess,
      downloadableResources: course.downloadableResources,
      completionCertificate: course.completionCertificate,
      publishStatus: newPublishStatus
    };

    return await exports.publishCourse(courseId, data);
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to toggle status" } };
  }
};

exports.getPublishedCourses = async (query) => {
  try {
    const { category, level, sortBy, search } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 6;
    const skip = (page - 1) * limit;

    const allCategories = await Category.find({ status: "active" }).sort({ name: 1 }).lean();
    const activeCategoryIds = allCategories.map(c => c._id);

    let selectedCategoryDoc = null;
    let selectedCategoryId = null;

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        selectedCategoryDoc = allCategories.find(c => c._id.toString() === category);
      } else {
        selectedCategoryDoc = allCategories.find(c => c.name.toLowerCase() === category.toLowerCase());
      }
      if (selectedCategoryDoc) selectedCategoryId = selectedCategoryDoc._id;
    }

    const filter = { status: { $in: ["published", "draft"] }, isDeleted: false };

    if (selectedCategoryId) {
      filter.category = selectedCategoryId;
    } else {
      filter.category = { $in: activeCategoryIds };
    }
    if (level) filter.level = { $regex: new RegExp(`^${level}$`, "i") };
    
    if (search) filter.title = { $regex: search, $options: "i" };

    const sortMap = {
      priceLowToHigh: { basePrice: 1, _id: -1 },
      priceHighToLow: { basePrice: -1, _id: -1 },
      newest: { createdAt: -1, _id: -1 }
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
        .populate("category")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / limit);

    return {
      success: true,
      data: {
        courses,
        currentPage: page,
        totalPages,
        allCategories,
        selectedCategoryDoc,
        selectedCategoryId: selectedCategoryId ? selectedCategoryId.toString() : null,
        selectedLevel: level || "",
        selectedPrice: query.price || "",
        sortBy: sortBy || "newest",
        search: search || ""
      }
    };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to get courses" } };
  }
};

exports.getCourseDetails = async (courseId, isAdmin = false) => {
  try {
    const query = {
      _id: courseId,
      isDeleted: false
    };
    if (!isAdmin) {
      query.status = { $in: ["published", "draft"] };
    }
    const course = await Course.findOne(query).populate("category").lean();

    if (!course) {
      return { success: false, errors: { general: "Course not found" } };
    }

    if (!isAdmin && course.category) {
      if (course.category.status !== "active") {
        return { success: false, errors: { general: "Course unavailable" } };
      }
    }

    const modules = await Module.find({ courseId: course._id }).sort({ order: 1 }).lean();

    let allLessons = [];
    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ moduleId: mod._id }).sort({ order: 1 }).lean();
        
        const formattedLessons = lessons.map(lesson => ({
          ...lesson,
          durationFormatted: formatLessonDurationAsMMSS(lesson.duration)
        }));

        allLessons = allLessons.concat(formattedLessons);
        
        const moduleMinutes = calculateTotalDuration(formattedLessons);
        const moduleDurationFormatted = formatDuration(moduleMinutes);
        
        return { ...mod, lessons: formattedLessons, moduleDurationFormatted };
      })
    );

    const totalLessons = allLessons.length;
    
    // Calculate Duration
    const totalMinutes = calculateTotalDuration(allLessons);
    const totalDurationFormatted = formatDuration(totalMinutes);
    
    // Count Resources
    const totalResourcesCount = await Resource.countDocuments({ courseId: course._id });

    const categoryId = course.category ? (course.category._id || course.category) : new mongoose.Types.ObjectId();
    const relatedCourses = await Course.find({
      category: categoryId,
      _id: { $ne: course._id },
      status: "published",
      isDeleted: false
    }).populate("category").limit(4).lean();

    return {
      success: true,
      data: {
        course,
        modulesWithLessons,
        totalLessons,
        totalDurationFormatted,
        totalResourcesCount,
        relatedCourses
      }
    };
  } catch (err) {
    console.log(err);
    return { success: false, errors: { general: "Failed to get course details" } };
  }
};

exports.getMyCoursesData = async (userId) => {
  try {
    const Enrollment = require('../models/enrollmentModel');
    const enrollments = await Enrollment.find({ 
      userId,
      status: { $in: ['active', 'completed'] }
    })
      .populate('courseId')
      .sort({ createdAt: -1 });
    return { success: true, enrollments };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Error fetching user courses" };
  }
};


exports.myCourseDetails = async (courseId, userId, lessonId) => {
    try {
const enrollment= await Enrollment.findOne({userId,courseId,status: { $in: ["active", "completed"] }}).lean();

if(!enrollment){
  return {success:false,
    errors:{ general:"Course not found" }
  }
}
    const course = await Course.findOne({   
    _id: courseId,
    isDeleted: false,
    status: "published"}).populate("category").lean();


    if (!course) {
      return { success: false, errors: { general: "Course not found" } };
    }

    const modules = await Module.find({ courseId }).sort({ order: 1 }).lean();

    if (modules.length === 0) {
      return { success: false, errors: { general: "Modules not found" } };
    }

    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        let lessons = await Lesson.find({
            moduleId: module._id
        }).sort({ order: 1 }).lean();

        lessons = lessons.map(lesson => ({
          ...lesson,
          durationFormatted: formatLessonDurationAsMMSS(lesson.duration)
        }));

        return {
            ...module,
            lessons
        };
      })
    );

    // Flatten in correct sequence after Promise.all resolves
    const allLessons = modulesWithLessons.reduce((acc, module) => acc.concat(module.lessons), []);


let activeLesson = null;
let previousLesson = null;
let nextLesson = null;
let resources = [];

if (allLessons.length > 0) {
  if(lessonId){
    activeLesson = allLessons.find(lesson => lesson._id.toString() === lessonId);
  }
  if (!activeLesson) {
    activeLesson = allLessons[0];
  }

  if (activeLesson) {
    let activeIndex = allLessons.findIndex(lesson => lesson._id.toString() === activeLesson._id.toString());
    previousLesson = activeIndex > 0 ? allLessons[activeIndex - 1] : null;
    nextLesson = activeIndex < allLessons.length - 1 ? allLessons[activeIndex + 1] : null;

    resources = await Resource.find({ lessonId: activeLesson._id }).lean();
  }
}

const totalLessons = allLessons.length;

return {
            success: true,
            data: {
              course,
              modules: modulesWithLessons,
              enrollment,
              completedLessons: (enrollment.completedLessons || []).map(id => id.toString()),
              ...(activeLesson && { activeLesson }),
              ...(previousLesson && { previousLesson }),
              ...(nextLesson && { nextLesson }),
              resources,
              totalLessons
            }
          };

       


}catch (error) {
        console.log(error);
        return {
            success: false,
            errors: {
                general: "Failed to load course"
            }
        };
    }
};

exports.markLessonComplete = async (userId, courseId, lessonId) => {
  try {

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) return { success: false, message: "Enrollment not found" };

    // $addToSet to add the lessonId to completedLessons without duplicates
    await Enrollment.updateOne(
      { _id: enrollment._id },
      { $addToSet: { completedLessons: lessonId } }
    );

    // Calculate progress
    const modules = await Module.find({ courseId }).lean();
    const moduleIds = modules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments({ moduleId: { $in: moduleIds } });

    // Fetch updated enrollment to get accurate completed count
    const updatedEnrollment = await Enrollment.findById(enrollment._id);
    const completedCount = updatedEnrollment.completedLessons.length;
    
    let progress = 0;
    if (totalLessons > 0) {
      progress = Math.round((completedCount / totalLessons) * 100);
    }
    
    updatedEnrollment.progress = progress;
    if (progress === 100) {
       updatedEnrollment.status = "completed";
    }
    await updatedEnrollment.save();

    return { success: true, progress, completedCount, totalLessons };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to mark lesson complete" };
  }
};

exports.validateCertificateAccess = async (userId, courseId) => {
  try {
    const course = await Course.findOne({ 
      _id: courseId, 
      status: "published" 
    })
    .populate('modules')
    .lean();
    
    if (!course) {
      return { success: false, message: "Course not found or inactive" };
    }

    const enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return { success: false, message: "You are not enrolled in this course" };
    }

    if (enrollment.progress < 100) {
      return { success: false, message: "You must complete the course to get a certificate" };
    }

    return { 
      success: true, 
      data: {
        course,
        enrollment
      }
    };
  } catch (error) {
    console.error("Certificate Validation Error:", error);
    throw error;
  }
};

exports.getAuthorizedVideoUrl = async (userId, courseId, lessonId) => {
  try {
    // 1. Verify user is enrolled and active
    // Accept either active or completed status so completed users can still view videos
    const enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return { success: false, message: "Unauthorized: Active enrollment required." };
    }

    // 2. Fetch the lesson and populate the module
    const lesson = await Lesson.findById(lessonId).populate('moduleId');
    if (!lesson || !lesson.moduleId) {
      return { success: false, message: "Lesson not found." };
    }

    // 3. Check if the lesson belongs to the course
    if (lesson.moduleId.courseId.toString() !== courseId.toString()) {
      return { success: false, message: "Lesson does not belong to this course." };
    }

    // 4. Generate highly restrictive signed URL (valid for only 10 minutes)
    // The player immediately follows the redirect, so 10 minutes is plenty of time
    // to establish the streaming session.
    let videoUrl = lesson.video;
    if (lesson.videoPublicId) {
      videoUrl = cloudinaryUtil.generateSignedVideoUrl(lesson.videoPublicId, 10);
    }

    if (!videoUrl) {
       return { success: false, message: "Video not available." };
    }

    return { success: true, url: videoUrl };
  } catch (error) {
    console.error("Authorized Video URL generation error:", error);
    throw error;
  }
};