"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const files_1 = require("./../../../enums/files");
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const fileUploaderHandler_1 = __importDefault(
  require("../../middlewares/fileUploaderHandler"),
);
const parseAllFileData_1 = __importDefault(
  require("../../middlewares/parseAllFileData"),
);
const router = express_1.default.Router();
const requireAdminOrSuperAdmin = (0, auth_1.default)(
  user_1.USER_ROLES.ADMIN,
  user_1.USER_ROLES.SUPER_ADMIN,
);
const requireSuperAdmin = (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN);
const requireHostOrUser = (0, auth_1.default)(
  user_1.USER_ROLES.HOST,
  user_1.USER_ROLES.USER,
);
const requireAnyUser = (0, auth_1.default)(
  user_1.USER_ROLES.ADMIN,
  user_1.USER_ROLES.SUPER_ADMIN,
  user_1.USER_ROLES.USER,
  user_1.USER_ROLES.HOST,
);
/* ---------------------------- PROFILE ROUTES ---------------------------- */
router
  .route("/profile")
  .get(requireAnyUser, user_controller_1.UserController.getUserProfile)
  .delete(
    (0, auth_1.default)(
      user_1.USER_ROLES.USER,
      user_1.USER_ROLES.HOST,
      user_1.USER_ROLES.ADMIN,
    ),
    user_controller_1.UserController.deleteProfile,
  );
/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",
  requireSuperAdmin,
  (0, validateRequest_1.default)(
    user_validation_1.UserValidation.createAdminZodSchema,
  ),
  user_controller_1.UserController.createAdmin,
);
/* ---------------------------- ADMINS LIST ------------------------------- */
router.get(
  "/admins",
  requireSuperAdmin,
  user_controller_1.UserController.getAdmin,
);
router.delete(
  "/admins/:id",
  requireSuperAdmin,
  user_controller_1.UserController.deleteAdmin,
);
/* ---------------------------- HOST LIST ------------------------------ */
router.post(
  "/create-host",
  requireSuperAdmin,
  user_controller_1.UserController.createHost,
);
router.post(
  "/ghost-login/:hostId",
  requireSuperAdmin,
  user_controller_1.UserController.ghostLoginAsHost,
);
router.get(
  "/hosts",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.getAllHosts,
);
router.get(
  "/hosts/:id",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.getHostById,
);
router.patch(
  "/hosts/status/:id",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.updateHostStatusById,
);
router.delete(
  "/hosts/:id",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.deleteHostById,
);
router.get(
  "/total-users-hosts",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.getTotalUsersAndHosts,
);
/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
  .route("/")
  .post(user_controller_1.UserController.createUser)
  .get(requireAdminOrSuperAdmin, user_controller_1.UserController.getAllUsers)
  .patch(
    requireAnyUser,
    (0, fileUploaderHandler_1.default)(),
    (0, parseAllFileData_1.default)({
      fieldName: files_1.FOLDER_NAMES.PROFILE_IMAGE,
      forceSingle: true,
    }),
    user_controller_1.UserController.updateProfile,
  );
/* ---------------------------- SWITCH PROFILE ---------------------------- */
router.patch(
  "/switch-profile",
  requireHostOrUser,
  user_controller_1.UserController.switchProfile,
);
/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch(
  "/admin/status/:id",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.updateAdminStatusById,
);
router.patch(
  "/status/:id",
  requireAdminOrSuperAdmin,
  user_controller_1.UserController.updateUserStatusById,
);
/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .get(requireAdminOrSuperAdmin, user_controller_1.UserController.getUserById)
  .delete(
    requireAdminOrSuperAdmin,
    user_controller_1.UserController.deleteUserById,
  );
exports.UserRoutes = router;
