"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Media = void 0;
const mongoose_1 = require("mongoose");
const media_interface_1 = require("./media.interface");
const mediaSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: Object.values(media_interface_1.MEDIA_TYPE), // ["BANNER", "FEED"]
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
// for best performance
mediaSchema.index({ type: 1, description: 1 });
exports.Media = (0, mongoose_1.model)("Media", mediaSchema);
