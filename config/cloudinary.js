const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file to Cloudinary and optionally deletes the local temp file.
 * @param {string} filePath - The path to the local file.
 * @param {string} folder - The destination folder in Cloudinary.
 * @param {string} resourceType - 'image', 'video', or 'auto'.
 * @param {boolean} deleteLocal - Whether to delete the local file after upload. Defaults to true.
 * @returns {Promise<Object>} - The complete Cloudinary upload response object.
 */
exports.uploadToCloudinary = async (filePath, folder = 'velora', resourceType = 'auto', deleteLocal = true) => {
  if (!filePath) return null;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType
    });
    
    // Delete local temp file asynchronously if requested
    if (deleteLocal) {
      await fs.unlink(filePath).catch(err => console.error("Failed to delete temp file:", err));
    }
    
    return result;
  } catch (error) {
    // Delete local temp file even if upload fails
    if (deleteLocal) {
      await fs.unlink(filePath).catch(err => console.error("Failed to delete temp file after error:", err));
    }
    
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

/**
 * Deletes a file from Cloudinary using its public_id.
 * @param {string} publicId - The public ID of the Cloudinary asset.
 * @param {string} resourceType - 'image', 'video', or 'raw'. Defaults to 'image'.
 * @returns {Promise<Object>} - The complete Cloudinary destroy response object.
 */
exports.deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    throw error;
  }
};








