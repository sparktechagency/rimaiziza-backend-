"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostDashboardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const hostDashboard_controller_1 = require("./hostDashboard.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const router = express_1.default.Router();
// Only authenticated host can access their own dashboard
router.get(
  "/",
  (0, auth_1.default)(user_1.USER_ROLES.HOST),
  hostDashboard_controller_1.HostDashboardController.getHostDashboard,
);
exports.HostDashboardRoutes = router;
