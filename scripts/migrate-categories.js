import mongoose from 'mongoose';
import Course from '../models/courseModel.js';
import Category from '../models/categoryModel.js';
import 'dotenv/config.js';


// Update these to match your DB connection string if needed
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/velora";

async function migrateCategories() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected. Starting migration...");

    // Find all categories to build a mapping of Name -> ObjectId
    const categories = await Category.find();
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    console.log(`Found ${categories.length} categories.`);

    // Use raw collection to avoid Mongoose casting the string to an ObjectId (which results in undefined)
    const coursesCollection = mongoose.connection.db.collection('courses');
    const coursesToMigrate = await coursesCollection.find({ category: { $type: 2 } }).toArray();
    console.log(`Found ${coursesToMigrate.length} courses with string categories.`);

    let successCount = 0;
    let failCount = 0;
    let createdCount = 0;

    for (const course of coursesToMigrate) {
      const categoryNameRaw = (course.category || "").trim();
      if (!categoryNameRaw) {
        console.error(`Course "${course.title}" has no category name to migrate.`);
        failCount++;
        continue;
      }
      const categoryName = categoryNameRaw.toLowerCase();

      let matchedCategoryId = categoryMap[categoryName];

      if (!matchedCategoryId) {
        // Create the missing category
        const newCategory = await Category.create({
          name: categoryNameRaw, // use original case for display
          description: `Auto-generated category for ${categoryNameRaw}`,
          status: "active"
        });
        matchedCategoryId = newCategory._id;
        categoryMap[categoryName] = matchedCategoryId; // cache it for the next courses
        createdCount++;
        console.log(`Auto-created missing category: "${categoryNameRaw}" (ID: ${matchedCategoryId})`);
      }

      await coursesCollection.updateOne(
        { _id: course._id },
        { $set: { category: matchedCategoryId } }
      );
      console.log(`Migrated course: "${course.title}" -> ${categoryNameRaw} (ID: ${matchedCategoryId})`);
      successCount++;
    }

    console.log(`\nMigration complete. Successfully migrated: ${successCount}, Auto-created Categories: ${createdCount}, Failed: ${failCount}`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrateCategories();
