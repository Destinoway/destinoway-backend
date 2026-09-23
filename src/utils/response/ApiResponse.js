  export const sendSuccess = (
    res,
    message = "Success",
    data = null,
    meta = null,
    status = 200
  ) => {
    return res.status(status).json({
      success: true,
      message,
      data,
      meta,
    });
  };

  export const sendError = (
    res,
    message = "Something went wrong",
    status = 500,
    details = null
  ) => {
    return res.status(status).json({
      success: false,
      message,
      error: {
        statusCode: status,
        ...(details && { details }),
      },
    });
  };