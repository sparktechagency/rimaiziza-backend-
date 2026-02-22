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
exports.BannerService = void 0;
const http_status_codes_1 = require("http-status-codes");
const banner_model_1 = require("./banner.model");
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const createBannerToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const createBanner = yield banner_model_1.Banner.create(payload);
    if (!createBanner) {
      (0, unlinkFile_1.default)(payload.image);
      throw new ApiErrors_1.default(400, "Failed to created banner");
    }
    return createBanner;
  });
const getBannerFromDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield banner_model_1.Banner.find({ status: true });
  });
const getAllBannerFromDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield banner_model_1.Banner.find({});
  });
const updateBannerToDB = (id, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ",
      );
    }
    // console.log(payload, "Payload");
    const isBannerExist = yield banner_model_1.Banner.findById(id);
    if (
      payload.image &&
      (isBannerExist === null || isBannerExist === void 0
        ? void 0
        : isBannerExist.image)
    ) {
      (0, unlinkFile_1.default)(
        isBannerExist === null || isBannerExist === void 0
          ? void 0
          : isBannerExist.image,
      );
    }
    const banner = yield banner_model_1.Banner.findOneAndUpdate(
      { _id: id },
      payload,
      {
        new: true,
      },
    );
    return banner;
  });
const updateBannerStatusToDB = (id, status) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const banner = yield banner_model_1.Banner.findById(id);
    if (!banner) {
      throw new ApiErrors_1.default(404, "No banner found in the database");
    }
    const result = yield banner_model_1.Banner.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!result) {
      throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
  });
const deleteBannerToDB = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isBannerExist = yield banner_model_1.Banner.findById({ _id: id });
    // delete from folder
    if (isBannerExist) {
      (0, unlinkFile_1.default)(
        isBannerExist === null || isBannerExist === void 0
          ? void 0
          : isBannerExist.image,
      );
    }
    // delete from database
    const result = yield banner_model_1.Banner.findByIdAndDelete(id);
    return result;
  });
exports.BannerService = {
  createBannerToDB,
  getBannerFromDB,
  getAllBannerFromDB,
  updateBannerToDB,
  deleteBannerToDB,
  updateBannerStatusToDB,
};
