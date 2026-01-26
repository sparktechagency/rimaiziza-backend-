import { FOLDER_NAMES } from "./../../../enums/files";
import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";

const router = express.Router();

const requireAdminOrSuperAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);
const requireSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);
const requireHostOrUser = auth(USER_ROLES.HOST, USER_ROLES.USER);
const requireAnyUser = auth(
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.USER,
  USER_ROLES.HOST,
);

/* ---------------------------- PROFILE ROUTES ---------------------------- */
router
  .route("/profile")
  .get(requireAnyUser, UserController.getUserProfile)
  .delete(auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN), UserController.deleteProfile);

/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createAdmin,
);


/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", requireSuperAdmin, UserController.getAdmin);
router.delete("/admins/:id", requireSuperAdmin, UserController.deleteAdmin);




/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
  .route("/")
  .post(UserController.createUser)
  .patch(
    requireAnyUser,
    fileUploadHandler(),
    parseAllFilesData({
      fieldName: FOLDER_NAMES.PROFILE_IMAGE,
      forceSingle: true,
    }),
    UserController.updateProfile,
  )

/* ---------------------------- SWITCH PROFILE ---------------------------- */
router.patch(
  "/switch-profile",
  requireHostOrUser,
  UserController.switchProfile,
);

/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch(
  "/admin/status/:id",
  requireAdminOrSuperAdmin,
  UserController.updateAdminStatusById,
);
router.patch(
  "/status/:id",
  requireAdminOrSuperAdmin,
  UserController.updateUserStatusById,
);

/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .delete(requireAdminOrSuperAdmin, UserController.deleteUserById);

export const UserRoutes = router;
