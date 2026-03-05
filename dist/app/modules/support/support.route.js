"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const support_controller_1 = require("./support.controller");
const router = express_1.default.Router();
router
    .route("/")
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST), support_controller_1.SupportControllers.submitSupportRequest)
    .get((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), support_controller_1.SupportControllers.getAllSupports);
router
    .route("/:id")
    .get((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), support_controller_1.SupportControllers.getSupportById)
    .delete((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), support_controller_1.SupportControllers.deleteSupportById);
exports.SupportRoutes = router;
