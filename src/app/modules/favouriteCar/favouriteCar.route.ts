import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { FavouriteCarControllers } from "./favouriteCar.controller";

const router = express.Router();

router.post(
  "/toggle",
  auth(USER_ROLES.USER),
  FavouriteCarControllers.toggleFavourite,
);

router.get("/", auth(USER_ROLES.USER), FavouriteCarControllers.getFavourite);

router.get(
  "/:bookmarkId",
  auth(USER_ROLES.USER),
  FavouriteCarControllers.getSingleFavourite,
);

router.delete(
  "/:referenceId",
  auth(USER_ROLES.USER),
  FavouriteCarControllers.deleteFavourite,
);

export const FavouriteCarRoutes = router;
