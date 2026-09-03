import HTTP_STATUS_CODES from '../constants/statusCodes.js';
export const notFoundHandler = (req, res, next) => {
  // If the request is for an API endpoint, return JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({ success: false, message: 'API endpoint not found' });
  }
  // Otherwise, render the Velora 404 HTML page
  res.status(HTTP_STATUS_CODES.NOT_FOUND).render('pages/404', { 
    title: 'Page Not Found',
    isLoggedIn: !!req.session?.user 
  });
};


export default {
  notFoundHandler
};
