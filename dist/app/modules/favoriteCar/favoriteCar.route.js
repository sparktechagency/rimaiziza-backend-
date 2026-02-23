"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteCarRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const favoriteCar_controller_1 = require("./favoriteCar.controller");
const router = express_1.default.Router();
router.post(
  "/toggle",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST),
  favoriteCar_controller_1.FavoriteCarControllers.toggleFavorite,
);
router.get(
  "/",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST),
  favoriteCar_controller_1.FavoriteCarControllers.getFavorite,
);
router.get(
  "/:bookmarkId",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST),
  favoriteCar_controller_1.FavoriteCarControllers.getSingleFavorite,
);
router.delete(
  "/:referenceId",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST),
  favoriteCar_controller_1.FavoriteCarControllers.deleteFavorite,
);
exports.FavoriteCarRoutes = router;
