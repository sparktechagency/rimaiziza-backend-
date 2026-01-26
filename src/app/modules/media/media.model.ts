import { model, Schema } from "mongoose";
import { IMedia, MEDIA_TYPE } from "./media.interface";

const mediaSchema = new Schema<IMedia>(
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
      enum: Object.values(MEDIA_TYPE), // ["BANNER", "FEED"]
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

export const Media = model<IMedia>("Media", mediaSchema);
