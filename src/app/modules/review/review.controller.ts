import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { REVIEW_TYPE } from "./review.interface";
import { ReviewServices } from "./review.service";

const createReview = catchAsync(async (req, res) => {
  const { id: fromUserId } = req.user;
  const payload = req.body;

  const result = await ReviewServices.createReviewToDB(payload, fromUserId);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Review created successfully",
    data: result,
  });
});

const getReviewSummary = catchAsync(async (req, res) => {
  const { targetId, type } = req.query;
  const result = await ReviewServices.getReviewSummaryFromDB(
    targetId as string,
    type as REVIEW_TYPE,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Review summary retrieved successfully",
    data: result,
  });
});

export const ReviewControllers = {
  createReview,
  getReviewSummary,
};
