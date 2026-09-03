import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';
import Lesson from '../models/lessonModel.js';
import Course from '../models/courseModel.js';
import Module from '../models/moduleModel.js';
import 'dotenv/config.js';


.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

const parseCloudinaryUrl = (url) => {
  if (!url) return null;
  // Expected format: https://res.cloudinary.com/<cloud_name>/<resource_type>/<type>/v<version>/<public_id>.<ext>
  // Let's use a regex to extract these parts
  const regex = /res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);

  if (match) {
    return {
      resourceType: match[1],
      deliveryType: match[2],
      publicId: match[3]
    };
  }

  // Fallback for URLs without version
  const regexNoVersion = /res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/(.+)\.\w+$/;
  const matchNoVersion = url.match(regexNoVersion);

  if (matchNoVersion) {
      return {
          resourceType: matchNoVersion[1],
          deliveryType: matchNoVersion[2],
          publicId: matchNoVersion[3]
      };
  }

  return null;
};

const runInvestigation = async () => {
  await connectDB();
  const report = [];

  try {
    const lessons = await Lesson.find({ video: { $ne: null, $ne: "" } }).populate('moduleId');

    // We need course info too
    for (const lesson of lessons) {
      const moduleDoc = lesson.moduleId;
      let courseName = "Unknown Course";
      if (moduleDoc) {
          const course = await Course.findById(moduleDoc.courseId);
          if (course) courseName = course.title;
      }

      const parsed = parseCloudinaryUrl(lesson.video);
      let exists = false;
      let actualResourceType = null;
      let actualDeliveryType = null;

      let publicId = "Unknown";
      let resourceType = "video";
      let deliveryType = "upload";

      if (parsed) {
        publicId = parsed.publicId;
        resourceType = parsed.resourceType || "video";
        deliveryType = parsed.deliveryType || "upload";

        try {
          // Verify if asset exists
          const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });
          exists = true;
          actualResourceType = result.resource_type;
          actualDeliveryType = result.type;
        } catch (err) {
          exists = false;
        }
      } else {
        // Could not parse
        publicId = "Unparseable";
      }

      report.push({
        lessonId: lesson._id.toString(),
        course: courseName,
        title: lesson.title,
        storedUrl: lesson.video,
        extractedPublicId: publicId,
        existsInCloudinary: exists,
        resourceType: parsed ? parsed.resourceType : 'N/A',
        deliveryType: parsed ? parsed.deliveryType : 'N/A',
        actualDeliveryType: exists ? actualDeliveryType : 'N/A'
      });
    }

    fs.writeFileSync('cloudinary_investigation_results.json', JSON.stringify(report, null, 2));
    console.log("Investigation complete. Results written to cloudinary_investigation_results.json");

  } catch (err) {
    console.error("Script error:", err);
  } finally {
    mongoose.disconnect();
  }
};

runInvestigation();
