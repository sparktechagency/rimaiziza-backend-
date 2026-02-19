import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReviewServices } from "./review.service";
import { REVIEW_TARGET_TYPE } from "./review.interface";

// POST /reviews
const createReview = catchAsync(async (req, res) => {
  const { id: reviewById } = req.user as any; // logged-in user/host
  const payload = req.body;

  // Validate required fields
  const { reviewForId, ratingValue, reviewType } = payload;
  if (!reviewForId || !ratingValue || !reviewType) {
    throw new Error("reviewForId, ratingValue, and reviewType are required");
  }

  const result = await ReviewServices.createReview(payload, reviewById);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Review created successfully",
    data: result,
  });
});

// GET /reviews/summary?reviewForId=<id>&reviewType=<HOST|USER>
const getReviewSummary = catchAsync(async (req, res) => {
  const { reviewForId, reviewType } = req.query;

  if (!reviewForId || !reviewType) {
    throw new Error("reviewForId and reviewType are required");
  }

  // Ensure reviewType is valid
  if (
    ![REVIEW_TARGET_TYPE.HOST, REVIEW_TARGET_TYPE.USER].includes(
      reviewType as REVIEW_TARGET_TYPE,
    )
  ) {
    throw new Error("Invalid reviewType. Must be HOST or USER");
  }

  const result = await ReviewServices.getReviewSummary(
    reviewForId as string,
    reviewType as REVIEW_TARGET_TYPE,
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
