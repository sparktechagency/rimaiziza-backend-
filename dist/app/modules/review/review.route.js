"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const review_controller_1 = require("./review.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST),
    review_controller_1.ReviewControllers.createReview,
  )
  .get(review_controller_1.ReviewControllers.getReviewSummary);
exports.ReviewRoutes = router;
