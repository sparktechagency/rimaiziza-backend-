"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const banner_controller_1 = require("./banner.controller");
const files_1 = require("../../../enums/files");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const fileUploaderHandler_1 = __importDefault(
  require("../../middlewares/fileUploaderHandler"),
);
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const parseAllFileData_1 = __importDefault(
  require("../../middlewares/parseAllFileData"),
);
const banner_validation_1 = require("./banner.validation");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
    (0, fileUploaderHandler_1.default)(),
    (0, parseAllFileData_1.default)({
      fieldName: files_1.FOLDER_NAMES.IMAGE,
      forceSingle: true,
    }),
    (0, validateRequest_1.default)(
      banner_validation_1.BannerZodValidation.createBannerValidationSchema,
    ),
    banner_controller_1.BannerController.createBanner,
  )
  .get(banner_controller_1.BannerController.getBannersFromDB);
router.patch(
  "/status/:id",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  banner_controller_1.BannerController.updateBannerStatus,
);
router
  .route("/:id")
  .patch(
    (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
    (0, fileUploaderHandler_1.default)(),
    (0, parseAllFileData_1.default)({
      fieldName: files_1.FOLDER_NAMES.IMAGE,
      forceSingle: true,
    }),
    banner_controller_1.BannerController.updateBanner,
  )
  .delete(
    (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
    banner_controller_1.BannerController.deleteBanner,
  );
router.get(
  "/all",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  banner_controller_1.BannerController.getAllBanner,
);
exports.BannerRoutes = router;
