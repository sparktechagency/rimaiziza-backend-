import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { FavoriteCarControllers } from "./favoriteCar.controller";

const router = express.Router();

router.post(
  "/toggle",
  auth(USER_ROLES.USER),
  FavoriteCarControllers.toggleFavorite,
);

router.get("/", auth(USER_ROLES.USER), FavoriteCarControllers.getFavorite);

router.get(
  "/:bookmarkId",
  auth(USER_ROLES.USER),
  FavoriteCarControllers.getSingleFavorite,
);

router.delete(
  "/:referenceId",
  auth(USER_ROLES.USER),
  FavoriteCarControllers.deleteFavorite,
);

export const FavoriteCarRoutes = router;
