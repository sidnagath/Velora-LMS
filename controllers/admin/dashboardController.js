
const dashboardService=require('../../services/dashboardService');


exports.getDashboard= async (req, res) => {
try{

  const result=await dashboardService.getDashboardData();

  if(!result.success){
       return res.render('pages/admin/dashboard/dashboard', {
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        isAdmin: true,
        flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
        flashType: req.query.flashType || "success",
        errors: result.errors,
        totalUsers: 0,
        totalCourses: 0,
        totalOrders: 0,
        totalRevenue: 0,
        days: [],
        salesRevenues: [],
        salesHeights: [],
        orderCounts: [],
        orderHeights: [],
        userCounts: [],
        userHeights: [],
        recentOrders: [],
        recentUsers: []
   });
  }

   return res.render('pages/admin/dashboard/dashboard', {
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        isAdmin: true,
        flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
        flashType: req.query.flashType || "success",
        errors: {},
        totalUsers: result.data.totalUsers,
        totalCourses: result.data.totalCourses,
        totalOrders: result.data.totalOrders,
        totalRevenue: result.data.totalRevenue,
        days: result.data.days,
        salesRevenues: result.data.salesRevenues,
        salesHeights: result.data.salesHeights,
        orderCounts: result.data.orderCounts,
        orderHeights: result.data.orderHeights,
        userCounts: result.data.userCounts,
        userHeights: result.data.userHeights,
        recentOrders: result.data.recentOrders,
        recentUsers: result.data.recentUsers
   });

  
}catch(error){
 console.error("Dashboard Controller Error:", error);
  req.flash("error", "Unable to load dashboard.");
  return res.redirect("/admin/dashboard");
}
  
}





