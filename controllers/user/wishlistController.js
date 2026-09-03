import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import wishlistService from '../../services/wishlistService.js';
import profileService from '../../services/profileService.js';
import cartService from '../../services/cartService.js';


 // To get user data for sidebar

export const getWishlistPage = async (req, res) => {
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

export const removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await wishlistService.removeFromWishlist(userId, courseId);
    if (result.success) {
      return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: "Course removed from wishlist." });
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Failed to remove course." });
    }
  } catch (err) {
    console.error(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred." });
  }
};

export const moveToCart = async (req,res)=>{
  try{
    const courseId=req.params.courseId;
    const userId=req.session.user?.id;

    const result=await wishlistService.moveToCart(userId,courseId);
    if(result.success){
      return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message });
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message || "Failed to move course to cart" });
    }
  }catch(err){
    console.error(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred." });
  }
}

export const toggleWishlist = async (req, res) => {
  try {
    const courseId = req.body.courseId;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({ success: false, message: "Please log in first" });
    }

    const result = await wishlistService.toggleWishlist(userId, courseId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};


export default {
  getWishlistPage,
  removeCourse,
  moveToCart,
  toggleWishlist
};
