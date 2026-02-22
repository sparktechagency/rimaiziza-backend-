"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const review_service_1 = require("./review.service");
const review_interface_1 = require("./review.interface");
// POST /reviews
const createReview = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: reviewById } = req.user; // logged-in user/host
    const payload = req.body;
    // Validate required fields
    const { reviewForId, ratingValue, reviewType } = payload;
    if (!reviewForId || !ratingValue || !reviewType) {
      throw new Error("reviewForId, ratingValue, and reviewType are required");
    }
    const result = yield review_service_1.ReviewServices.createReview(
      payload,
      reviewById,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 201,
      message: "Review created successfully",
      data: result,
    });
  }),
);
// GET /reviews/summary?reviewForId=<id>&reviewType=<HOST|USER>
const getReviewSummary = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { reviewForId, reviewType } = req.query;
    if (!reviewForId || !reviewType) {
      throw new Error("reviewForId and reviewType are required");
    }
    // Ensure reviewType is valid
    if (
      ![
        review_interface_1.REVIEW_TARGET_TYPE.HOST,
        review_interface_1.REVIEW_TARGET_TYPE.USER,
      ].includes(reviewType)
    ) {
      throw new Error("Invalid reviewType. Must be HOST or USER");
    }
    const result = yield review_service_1.ReviewServices.getReviewSummary(
      reviewForId,
      reviewType,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Review summary retrieved successfully",
      data: result,
    });
  }),
);
exports.ReviewControllers = {
  createReview,
  getReviewSummary,
};
