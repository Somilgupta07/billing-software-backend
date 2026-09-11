const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "CastError") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.KeyValue)[0];
    return res
      .status(409)
      .json({ success: false, message: `Duplicate value for field:${field}` });
  }

  if (err.name === "validationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res
      .status(400)
      .json({ success: false, message: messages.join(", ") });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server error",
  });
};

const notFound = (req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Route not found: ${req.originalUrl}` });
};
module.exports = { errorHandler, notFound };
