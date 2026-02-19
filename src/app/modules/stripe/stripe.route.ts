import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { StripeControllers } from "./stripe.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

router
  .route("/connect-account")
  .post(
    auth(USER_ROLES.USER, USER_ROLES.HOST),
    StripeControllers.createStripeAccount,
  );

router.get(
  "/dashboard",
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  StripeControllers.getStripeDashboardLink,
);

export const StripeRoutes = router;
