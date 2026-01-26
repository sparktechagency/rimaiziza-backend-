import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { CarControllers } from "./car.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import optionalAuth from "../../middlewares/optionalAuth";

const router = express.Router();

router
  .route("/")
  .post(
    auth(USER_ROLES.HOST),
    fileUploadHandler(),
    parseAllFilesData(
      { fieldName: "carRegistrationPaperFrontPic", forceSingle: true },
      { fieldName: "carRegistrationPaperBackPic", forceSingle: true },
      { fieldName: "images", forceMultiple: true },
    ),
    CarControllers.createCar,
  )
  .get(
    auth(
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.HOST,
      USER_ROLES.USER,
    ),
    CarControllers.getAllCars,
  );

router.get(
  "/recent",
  optionalAuth(),
  CarControllers.getRecentCars
);

router.get("/my", auth(USER_ROLES.HOST), CarControllers.getOwnCars);

router.get(
  "/suggested",
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  CarControllers.getSuggestedCars,
);

router.get("/by-destination/:destinationId", CarControllers.getCarsByDestination);

router.get("/availability/:carId", CarControllers.getAvailability);

router.patch(
  "/blocked/:carId",
  auth(USER_ROLES.HOST),
  CarControllers.createCarBlockedDates,
);

router.get(
  "/verification",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CarControllers.getAllCarsForVerifications,
);

router.patch(
  "/verification/status/:carId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CarControllers.updateCarVerificationStatusById,
);

router
  .route("/:id")
  .get(
    auth(
      USER_ROLES.ADMIN,
      USER_ROLES.HOST,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.USER,
    ),
    CarControllers.getCarById,
  )
  .patch(
    auth(USER_ROLES.HOST),
    fileUploadHandler(),
    parseAllFilesData(
      { fieldName: "carRegistrationPaperFrontPic", forceSingle: true },
      { fieldName: "carRegistrationPaperBackPic", forceSingle: true },
      { fieldName: "images", forceMultiple: true },
    ),
    CarControllers.updateCarById,
  )
  .delete(auth(USER_ROLES.HOST), CarControllers.deleteCarById);

export const CarRoutes = router;
