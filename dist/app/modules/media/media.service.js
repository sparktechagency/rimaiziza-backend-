"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaServices = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const media_interface_1 = require("./media.interface");
const media_model_1 = require("./media.model");
const createMediaToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, description } = payload;
    if (![media_interface_1.MEDIA_TYPE.BANNER, media_interface_1.MEDIA_TYPE.FEED].includes(payload.type)) {
        throw new ApiErrors_1.default(400, "Media type must be 'BANNER' or 'FEED'");
    }
    // if description is provided, ensure this type doesn't already have one
    if (description) {
        const exist = yield media_model_1.Media.findOne({
            type,
            description: { $ne: "" },
        });
        if (exist) {
            throw new ApiErrors_1.default(400, `A description already exists for media type: ${type}`);
        }
    }
    // switch is used to allow future type-specific logic
    switch (type) {
        case media_interface_1.MEDIA_TYPE.BANNER:
            return yield media_model_1.Media.create(Object.assign({}, payload));
        case media_interface_1.MEDIA_TYPE.FEED:
            return yield media_model_1.Media.create(Object.assign({}, payload));
        default:
            throw new ApiErrors_1.default(400, "Invalid media type");
    }
});
const getMediaByTypeFromDB = (type_1, ...args_1) => __awaiter(void 0, [type_1, ...args_1], void 0, function* (type, includeInactive = false) {
    if (![media_interface_1.MEDIA_TYPE.BANNER, media_interface_1.MEDIA_TYPE.FEED].includes(type)) {
        throw new ApiErrors_1.default(400, "Media type must be 'BANNER' or 'FEED'");
    }
    // filter condition
    const filter = { type };
    if (!includeInactive) {
        filter.status = true;
    }
    const mediaList = yield media_model_1.Media.find(filter);
    return mediaList || [];
});
const updateMediaByIdToDB = (mediaId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (payload.type &&
        ![media_interface_1.MEDIA_TYPE.BANNER, media_interface_1.MEDIA_TYPE.FEED].includes(payload.type)) {
        throw new ApiErrors_1.default(400, "Media type must be 'BANNER' or 'FEED'");
    }
    if (payload.description !== undefined) {
        if (payload.description.trim() === "") {
            payload.description = "";
        }
        else {
            // uniqueness check
            const exist = yield media_model_1.Media.findOne({
                _id: { $ne: mediaId },
                type: payload.type || undefined,
                description: { $ne: "" },
            });
            if (exist) {
                throw new ApiErrors_1.default(400, `A description already exists for media type: ${payload.type}`);
            }
        }
    }
    const updatedMedia = yield media_model_1.Media.findByIdAndUpdate(mediaId, { $set: payload }, { new: true });
    if (!updatedMedia) {
        throw new ApiErrors_1.default(404, "Media not found");
    }
    return updatedMedia;
});
const updateMediaStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const media = yield media_model_1.Media.findById(id);
    if (!media) {
        throw new ApiErrors_1.default(404, "No media found in the database");
    }
    const result = yield media_model_1.Media.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
});
const deleteMediaByIdToDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const isBannerExist = yield media_model_1.Media.findById({ _id: id });
    // delete from folder
    if (isBannerExist) {
        (0, unlinkFile_1.default)(isBannerExist === null || isBannerExist === void 0 ? void 0 : isBannerExist.image);
    }
    // delete from database
    const result = yield media_model_1.Media.findByIdAndDelete(id);
    return result;
});
exports.MediaServices = {
    createMediaToDB,
    getMediaByTypeFromDB,
    updateMediaByIdToDB,
    updateMediaStatusByIdToDB,
    deleteMediaByIdToDB,
};
