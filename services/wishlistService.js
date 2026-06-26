const User = require("../models/userModel");
const Course = require("../models/courseModel");

class WishlistService {
  async getWishlist(userId, searchQuery = "") {
    const matchQuery = { status: "published", isDeleted: false };
    if (searchQuery && searchQuery.trim() !== "") {
      matchQuery.title = { $regex: searchQuery.trim(), $options: "i" };
    }

    const user = await User.findById(userId).populate({
      path: "wishlist",
      match: matchQuery,
      populate: {
        path: "category",
        select: "name"
      }
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    return { success: true, wishlist: user.wishlist || [] };
  }

  async toggleWishlist(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const index = user.wishlist.findIndex(id => id.toString() === courseId.toString());
    let isAdded = false;
    let message = "";

    if (index === -1) {
      user.wishlist.push(courseId);
      // Prevent course from existing in both lists
      user.cart = user.cart.filter(id => id.toString() !== courseId.toString());
      isAdded = true;
      message = "Course added to wishlist.";
    } else {
      user.wishlist.splice(index, 1);
      message = "Course removed from wishlist.";
    }

    await user.save();
    return { success: true, isAdded, message };
  }


  async moveToCart(userId,courseId){
    const user=await User.findById(userId);

    if(!user){
      return {success:false, message:"User not found"}
    }

    //Remove from Wishlist
    user.wishlist=user.wishlist.filter(id=>id.toString()!==courseId.toString());

    //Add to Cart if not already there
    const inCart = user.cart.some(id => id.toString() === courseId.toString());
    if(!inCart){
      user.cart.push(courseId)
    }

    await user.save();

    return {success:true, message:"Course moved to cart."};

  }

  // async addToWishlist(userId, courseId) {
  //   const user = await User.findById(userId);
  //   if (!user) {
  //     return { success: false, message: "User not found" };
  //   }

  //   if (!user.wishlist.includes(courseId)) {
  //     user.wishlist.push(courseId);
  //     await user.save();
  //   }

  //   return { success: true, message: "Added to wishlist" };
  // }

  async removeFromWishlist(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.wishlist = user.wishlist.filter(id => id.toString() !== courseId.toString());
    await user.save();

    return { success: true, message: "Removed from wishlist" };
  }
}

module.exports = new WishlistService();
