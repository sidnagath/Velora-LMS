import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import Lesson from '../models/lessonModel.js';
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

const extractPublicId = (url) => {
  if (!url) return null;
  const regex = /res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  if (match) return match[3];

  const regexNoVersion = /res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/(.+)\.\w+$/;
  const matchNoVersion = url.match(regexNoVersion);
  if (matchNoVersion) return matchNoVersion[3];

  return null;
};

const secureVideos = async () => {
  await connectDB();

  try {
    const lessons = await Lesson.find({ video: { $ne: null, $ne: "" }, videoPublicId: { $exists: false } });
    console.log(`Found ${lessons.length} lessons to secure.`);

    let successCount = 0;
    let skippedCount = 0;
    let failCount = 0;

    for (const lesson of lessons) {
      const publicId = extractPublicId(lesson.video);

      if (!publicId) {
        console.error(`Skipped ${lesson._id}: Could not extract publicId from ${lesson.video}`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`Verifying video asset: ${publicId}`);
        // Verify it exists as a video
        await cloudinary.api.resource(publicId, { resource_type: 'video' });
      } catch(e) {
        console.error(`Failed ${lesson._id}: Asset not found as video on Cloudinary for ${publicId}`);
        failCount++;
        continue;
      }

      try {
        console.log(`Securing video: ${publicId}`);
        // Change delivery type from upload to authenticated by renaming to itself
        const result = await cloudinary.uploader.rename(publicId, publicId, {
          to_type: 'authenticated',
          resource_type: 'video'
        });

        lesson.videoPublicId = publicId;
        lesson.video = result.secure_url;
        await lesson.save();

        console.log(`Success ${lesson._id}: Migrated to authenticated delivery.`);
        successCount++;
      } catch (err) {
         if (err && err.message && err.message.includes('already exists')) {
             console.log(`Skipped ${lesson._id}: Asset already authenticated on Cloudinary. Updating DB.`);
             lesson.videoPublicId = publicId;
             lesson.video = lesson.video.replace('/upload/', '/authenticated/');
             await lesson.save();
             skippedCount++;
         } else {
            console.error(`Failed ${lesson._id}: Could not secure ${publicId}:`, err);
            failCount++;
         }
      }
    }

    console.log(`\nMigration completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Failed: ${failCount}`);
  } catch (error) {
    console.error("Migration script error:", error);
  } finally {
    mongoose.disconnect();
  }
};

secureVideos();
