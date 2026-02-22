"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleRoutes = void 0;
const express_1 = require("express");
const rule_controller_1 = require("./rule.controller");
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
router.post(
  "/",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  rule_controller_1.RuleControllers.upsertRule,
);
router.get("/:type", rule_controller_1.RuleControllers.getRule);
router.patch(
  "/:type",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  rule_controller_1.RuleControllers.updateRule,
);
router.delete(
  "/:type",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  rule_controller_1.RuleControllers.deleteRule,
);
exports.RuleRoutes = router;
