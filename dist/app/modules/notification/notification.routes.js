"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const notification_controller_1 = require("./notification.controller");
const router = express_1.default.Router();
router.get(
  "/",
  (0, auth_1.default)(user_1.USER_ROLES.USER),
  notification_controller_1.NotificationController.getNotificationFromDB,
);
router.get(
  "/admin",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  notification_controller_1.NotificationController.adminNotificationFromDB,
);
router.patch(
  "/",
  (0, auth_1.default)(user_1.USER_ROLES.USER),
  notification_controller_1.NotificationController.readNotification,
);
router.patch(
  "/admin",
  (0, auth_1.default)(user_1.USER_ROLES.USER),
  notification_controller_1.NotificationController.adminReadNotification,
);
exports.NotificationRoutes = router;
