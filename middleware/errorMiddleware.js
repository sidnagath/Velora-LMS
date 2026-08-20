exports.notFoundHandler = (req, res, next) => {
  // If the request is for an API endpoint, return JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  // Otherwise, render the Velora 404 HTML page
  res.status(404).render('pages/404', { 
    title: 'Page Not Found',
    isLoggedIn: !!req.session?.user 
  });
};
