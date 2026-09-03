import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';

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
 * @param {string} deliveryType - 'upload' (public) or 'authenticated' (private). Defaults to 'upload'.
 * @returns {Promise<Object>} - The complete Cloudinary upload response object.
 */
export const uploadToCloudinary = async (filePath, folder = 'velora', resourceType = 'auto', deleteLocal = true, deliveryType = 'upload') => {
  if (!filePath) return null;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      type: deliveryType
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
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    throw error;
  }
};

/**
 * Generates a signed, time-limited URL for an authenticated Cloudinary video.
 * @param {string} publicId - The public ID of the Cloudinary asset.
 * @param {number} expiryMinutes - How many minutes the URL should be valid for (default 15).
 * @returns {string} - The signed secure URL.
 */
export const generateSignedVideoUrl = (publicId, expiryMinutes = 15) => {
  if (!publicId) return "";

  const expiresAt = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

  return cloudinary.utils.url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: expiresAt
  });
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  generateSignedVideoUrl
};
