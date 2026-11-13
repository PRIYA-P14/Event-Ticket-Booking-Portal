const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    statusCode = 400;
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'A resource with the same unique value already exists';
  }

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
