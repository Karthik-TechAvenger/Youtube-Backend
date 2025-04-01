import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynhandler.js";

const healthchecker = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "Ok", "Health check passed"));
});

export { healthchecker };
