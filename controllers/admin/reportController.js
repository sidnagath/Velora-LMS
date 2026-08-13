const reportService = require('../../services/reportService');
const Category = require('../../models/categoryModel');
const Course = require('../../models/courseModel');

exports.getReports = async (req, res) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || 'last30',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      categoryId: req.query.categoryId || 'all',
      courseId: req.query.courseId || 'all'
    };

    const categories = await Category.find({ status: 'active' }).select('_id name').lean();
    const courses = await Course.find({ isDeleted: false }).select('_id title category').lean();

    const result = await reportService.getReportData(filters);

    if (!result.success) {
      req.flash('error', 'Failed to load report data');
      return res.redirect('/admin/dashboard');
    }

    res.render('pages/admin/reports/reports', {
      title: 'Velora - Admin Reports',
      isLoggedIn: true,
      isAdmin: true,
      filters,
      categories,
      courses,
      ...result.data,
      flashMsg: req.flash('success')[0] || req.query.flashMsg || "",
      flashType: req.flash('error').length ? 'error' : 'success',
      errors: {}
    });

  } catch (error) {
    console.error("Report Controller Error:", error);
    req.flash('error', 'Unable to load reports');
    res.redirect('/admin/dashboard');
  }
};
