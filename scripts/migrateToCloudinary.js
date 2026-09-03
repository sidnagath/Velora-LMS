import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import connectDB from '../config/db.js';
import cloudinaryUtil from '../config/cloudinary.js';
import User from '../models/userModel.js';
import Category from '../models/categoryModel.js';
import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';
import Resource from '../models/resourceModel.js';
import 'dotenv/config.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



async function migrateFile(doc, field, folder, resourceType, isArray = false, arrayField = '') {
  let migrated = false;
  let failed = false;

  const processPath = async (itemPath) => {
    if (!itemPath || typeof itemPath !== 'string') return null;
    if (itemPath.startsWith('http://') || itemPath.startsWith('https://')) return null; // already migrated

    // It's a local path like /uploads/filename.ext or just filename.ext
    let filename = itemPath;
    if (itemPath.startsWith('/uploads/')) {
      filename = itemPath.replace('/uploads/', '');
    } else if (itemPath.startsWith('uploads/')) {
      filename = itemPath.replace('uploads/', '');
    }

    const localFilePath = path.join(__dirname, '..', 'public', 'uploads', filename);

    if (!fs.existsSync(localFilePath)) {
      console.warn(`[WARN] File not found locally: ${localFilePath}`);
      failed = true;
      return null;
    }

    try {
      console.log(`Uploading ${localFilePath} to Cloudinary folder ${folder}...`);
      const result = await cloudinaryUtil.uploadToCloudinary(localFilePath, folder, resourceType, false);
      return result.secure_url;
    } catch (err) {
      console.error(`[ERROR] Failed to upload ${localFilePath}:`, err.message);
      failed = true;
      return null;
    }
  };

  if (!isArray) {
    const currentVal = doc[field];
    if (currentVal && !currentVal.startsWith('http')) {
      const newUrl = await processPath(currentVal);
      if (newUrl) {
        doc[field] = newUrl;
        migrated = true;
      }
    }
  } else {
    // Array of objects (e.g. resources.files)
    const items = doc[field];
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item[arrayField] && !item[arrayField].startsWith('http')) {
          const newUrl = await processPath(item[arrayField]);
          if (newUrl) {
            item[arrayField] = newUrl;
            migrated = true;
          }
        }
      }
    }
  }

  return { migrated, failed };
}

async function runMigration() {
  await connectDB();

  let stats = { processed: 0, migrated: 0, skipped: 0, failed: 0 };

  console.log("--- Migrating Users ---");
  const users = await User.find({});
  for (const user of users) {
    stats.processed++;
    if (user.avatar && !user.avatar.startsWith('http')) {
      const { migrated, failed } = await migrateFile(user, 'avatar', 'avatars', 'image');
      if (migrated) {
        await user.save();
        stats.migrated++;
        console.log(`Migrated avatar for user ${user._id}`);
      } else if (failed) {
        stats.failed++;
      } else {
        stats.skipped++;
      }
    } else {
      stats.skipped++;
    }
  }

  console.log("--- Migrating Categories ---");
  const categories = await Category.find({});
  for (const category of categories) {
    stats.processed++;
    if (category.thumbnail && !category.thumbnail.startsWith('http')) {
      const { migrated, failed } = await migrateFile(category, 'thumbnail', 'category_thumbnails', 'image');
      if (migrated) {
        await category.save();
        stats.migrated++;
        console.log(`Migrated thumbnail for category ${category._id}`);
      } else if (failed) {
        stats.failed++;
      } else {
        stats.skipped++;
      }
    } else {
      stats.skipped++;
    }
  }

  console.log("--- Migrating Courses ---");
  const courses = await Course.find({});
  for (const course of courses) {
    stats.processed++;
    let courseMigrated = false;
    let courseFailed = false;

    if (course.thumbnail && !course.thumbnail.startsWith('http')) {
      const { migrated, failed } = await migrateFile(course, 'thumbnail', 'course_thumbnails', 'image');
      if (migrated) courseMigrated = true;
      if (failed) courseFailed = true;
    }

    if (course.trailer && !course.trailer.startsWith('http')) {
      const { migrated, failed } = await migrateFile(course, 'trailer', 'course_trailers', 'video');
      if (migrated) courseMigrated = true;
      if (failed) courseFailed = true;
    }

    if (courseMigrated) {
      await course.save();
      stats.migrated++;
      console.log(`Migrated media for course ${course._id}`);
    } else if (courseFailed) {
      stats.failed++;
    } else {
      stats.skipped++;
    }
  }

  console.log("--- Migrating Lessons ---");
  const lessons = await Lesson.find({});
  for (const lesson of lessons) {
    stats.processed++;
    if (lesson.video && !lesson.video.startsWith('http')) {
      const { migrated, failed } = await migrateFile(lesson, 'video', 'lesson_videos', 'video');
      if (migrated) {
        await lesson.save();
        stats.migrated++;
        console.log(`Migrated video for lesson ${lesson._id}`);
      } else if (failed) {
        stats.failed++;
      } else {
        stats.skipped++;
      }
    } else {
      stats.skipped++;
    }
  }

  console.log("--- Migrating Resources ---");
  const resources = await Resource.find({});
  for (const resource of resources) {
    stats.processed++;
    const { migrated, failed } = await migrateFile(resource, 'files', 'course_resources', 'auto', true, 'path');
    if (migrated) {
      await resource.save();
      stats.migrated++;
      console.log(`Migrated files for resource ${resource._id}`);
    } else if (failed) {
      stats.failed++;
    } else {
      stats.skipped++;
    }
  }

  console.log("\n--- MIGRATION COMPLETE ---");
  console.log(`Processed Documents: ${stats.processed}`);
  console.log(`Migrated Documents: ${stats.migrated}`);
  console.log(`Skipped Documents: ${stats.skipped}`);
  console.log(`Failed Documents: ${stats.failed}`);

  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration Error:", err);
  process.exit(1);
});
