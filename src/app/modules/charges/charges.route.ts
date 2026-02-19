import express from "express";

import { USER_ROLES } from "../../../enums/user";
import { ChargesControllers } from "./charges.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

router
  .route("/")
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ChargesControllers.createCharges,
  )
  .get(ChargesControllers.getAllCharges);

router.delete(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ChargesControllers.deleteCharges,
);

export const ChargesRoutes = router;
