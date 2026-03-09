"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteCarControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const favoriteCar_service_1 = require("./favoriteCar.service");
const toggleFavorite = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const { referenceId } = req.body;
    const result =
      yield favoriteCar_service_1.FavoriteCarServices.toggleFavorite({
        userId: id,
        referenceId,
      });
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: result.message || "Favorite toggled successfully",
      data: result,
    });
  }),
);
const getFavorite = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const result =
      yield favoriteCar_service_1.FavoriteCarServices.getFavorite(id);
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Favorites are Retrieved Successfully",
      data: result,
    });
  }),
);
const getSingleFavorite = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { bookmarkId } = req.params;
    const { id: userId } = req.user;
    const result =
      yield favoriteCar_service_1.FavoriteCarServices.getSingleFavorite(
        userId,
        bookmarkId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Favorite is retrieved successfully by ID",
      data: result,
    });
  }),
);
const deleteFavorite = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const { referenceId } = req.params;
    const result =
      yield favoriteCar_service_1.FavoriteCarServices.deleteFavorite(
        id,
        referenceId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Favorite is deleted successfully",
      data: result,
    });
  }),
);
exports.FavoriteCarControllers = {
  toggleFavorite,
  getFavorite,
  deleteFavorite,
  getSingleFavorite,
};
