const User = require("../models/userModel");
const Course = require("../models/courseModel");

class WishlistService {
  async getWishlist(userId) {
    const user = await User.findById(userId).populate({
      path: "wishlist",
      match: { status: "published", isDeleted: false },
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

    if (index === -1) {
      user.wishlist.push(courseId);
      isAdded = true;
    } else {
      user.wishlist.splice(index, 1);
    }

    await user.save();
    return { success: true, isAdded };
  }


  async moveToCart(userId,courseId){
    const user=await User.findById(userId);

    if(!user){
      return {success:false, message:"User not found"}
    }

    //Remove from Wishlist
    user.wishlist=user.wishlist.filter(id=>id.toString()!==courseId.toString());

    //Add to Cart if not already there
    if(!user.cart.includes(courseId)){
      user.cart.push(courseId)
    }

    await user.save();

    return {success:true, message:"Moved to Cart"};

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
