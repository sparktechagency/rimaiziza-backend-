import express from "express";
import { ReviewControllers } from "./review.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

router
  .route("/")
  .post(auth(USER_ROLES.USER, USER_ROLES.HOST), ReviewControllers.createReview)
  .get(ReviewControllers.getReviewSummary);

export const ReviewRoutes = router;
