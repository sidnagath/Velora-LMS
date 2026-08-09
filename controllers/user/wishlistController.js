const wishlistService = require("../../services/wishlistService");
const profileService = require("../../services/profileService"); // To get user data for sidebar
const cartService = require("../../services/cartService");

exports.getWishlistPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const searchQuery = req.query.search || "";
    const [wishlistResult, user, cartCount] = await Promise.all([
      wishlistService.getWishlist(userId, searchQuery),
      profileService.getUserById(userId),
      cartService.getCartCount(userId)
    ]);

    if (!wishlistResult.success) {
      req.flash("error", "Failed to load wishlist.");
      return res.redirect("/user/profile");
    }

    res.render("pages/user/wishlist/wishlist", {
      title: "My Wishlist",
      isLoggedIn: true,
      user,
      wishlist: wishlistResult.wishlist,
      search: searchQuery,
      cartCount:cartCount.success?cartCount.count:0
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/user/profile");
  }
};

exports.removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await wishlistService.removeFromWishlist(userId, courseId);
    if (result.success) {
      return res.status(200).json({ success: true, message: "Course removed from wishlist." });
    } else {
      return res.status(400).json({ success: false, message: "Failed to remove course." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "An error occurred." });
  }
};

exports.moveToCart= async (req,res)=>{
  try{
    const courseId=req.params.courseId;
    const userId=req.session.user?.id;

    const result=await wishlistService.moveToCart(userId,courseId);
    if(result.success){
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ success: false, message: result.message || "Failed to move course to cart" });
    }
  }catch(err){
    console.error(err);
    return res.status(500).json({ success: false, message: "An error occurred." });
  }
}

exports.toggleWishlist = async (req, res) => {
  try {
    const courseId = req.body.courseId;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    const result = await wishlistService.toggleWishlist(userId, courseId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
