/**
 * Cache-Control header middleware for static-ish endpoints.
 * @param {number} maxAge - Cache duration in seconds
 */
const setCacheHeaders = (maxAge) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  next();
};

module.exports = { setCacheHeaders };
