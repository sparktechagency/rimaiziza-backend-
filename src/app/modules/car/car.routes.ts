import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { CarControllers } from "./car.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";

const router = express.Router();

router
  .route("/nearby")
  .get(auth(USER_ROLES.USER), CarControllers.getNearbyCars);

router.route("/host").get(auth(USER_ROLES.HOST), CarControllers.getCarsByHost);

router
  .route("/user/:id")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.HOST),
    CarControllers.getCarByIdForUser,
  );

router
  .route("/availability/:carId")
  .get(auth(USER_ROLES.USER, USER_ROLES.HOST), CarControllers.getAvailability);

router
  .route("/")
  .post(
    auth(USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData(
      { fieldName: "images", forceMultiple: true },
      { fieldName: "coverImage", forceSingle: true },
    ),
    CarControllers.createCar,
  )
  .get(auth(USER_ROLES.SUPER_ADMIN), CarControllers.getAllCars);

router
  .route("/:id")
  .get(CarControllers.getCarById)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData(
      { fieldName: "images", forceMultiple: true },
      { fieldName: "coverImage", forceSingle: true },
    ),
    CarControllers.updateCarById,
  )
  .delete(auth(USER_ROLES.SUPER_ADMIN), CarControllers.deleteCarById);

export const CarRoutes = router;
