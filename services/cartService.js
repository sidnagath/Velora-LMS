import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Module from '../models/moduleModel.js';
import Enrollment from '../models/enrollmentModel.js';


class CartService {
  async getCart(userId, searchQuery = "") {
    const matchQuery = { isDeleted: false };
    if (searchQuery && searchQuery.trim() !== "") {
      matchQuery.title = { $regex: searchQuery.trim(), $options: "i" };
    }

    const user = await User.findById(userId).populate({
      path: "cart",
      match: matchQuery,
      populate: {
        path: "category",
        select: "name"
      }
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const cartItems = (user.cart || []).filter(c => c !== null);
    const cartWithModules = await Promise.all(cartItems.map(async (course) => {
      const modulesCount = await Module.countDocuments({ courseId: course._id });
      return { ...course.toObject(), modulesCount };
    }));

    return { success: true, cart: cartWithModules };
  }

  async toggleCart(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isEnrolled = await Enrollment.findOne({ userId, courseId, status: { $ne: 'cancelled' } });
    if (isEnrolled) {
      return { success: false, message: "You are already enrolled in this course." };
    }

    const course = await Course.findById(courseId);
    if (!course || course.isDeleted || course.status !== "published") {
      return { success: false, message: "This course is no longer available." };
    }

    const index = user.cart.findIndex(id => id.toString() === courseId.toString());
    let isAdded = false;
    let message = "";

    if (index === -1) {
      user.cart.push(courseId);
      // Prevent course from existing in both lists
      user.wishlist = user.wishlist.filter(id => id.toString() !== courseId.toString());
      isAdded = true;
      message = "Course added to cart.";
    } else {
      user.cart.splice(index, 1);
      message = "Course removed from cart.";
    }

    await user.save();
    return { success: true, isAdded, message };
  }

  async removeFromCart(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.cart = user.cart.filter(id => id.toString() !== courseId.toString());
    await user.save();

    return { success: true, message: "Removed from cart" };
  }

  async moveToWishlist(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isEnrolled = await Enrollment.findOne({ userId, courseId, status: { $ne: 'cancelled' } });
    if (isEnrolled) {
      return { success: false, message: "You are already enrolled in this course." };
    }

    const course = await Course.findById(courseId);

    // Remove from cart first
    user.cart = user.cart.filter(id => id.toString() !== courseId.toString());

    if (!course || course.isDeleted) {
      await user.save();
      return { success: false, message: "Course is no longer available and has been removed from your cart." };
    }

    // Add to wishlist if not already there
    const inWishlist = user.wishlist.some(id => id.toString() === courseId.toString());
    if (!inWishlist) {
      user.wishlist.push(courseId);
    }

    await user.save();
    return { success: true, message: "Course moved to wishlist." };
  }

  async getCartCount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Only count active/published courses in the cart
    const count = await Course.countDocuments({
      _id: { $in: user.cart },
      status: "published",
      isDeleted: false
    });

    return { success: true, count };
  }
}

export default new CartService();
