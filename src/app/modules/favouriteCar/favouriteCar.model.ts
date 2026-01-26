import { Schema, model } from "mongoose";
import { TFavouriteCar } from "./favouriteCar.interface";

const favouriteCarSchema = new Schema<TFavouriteCar>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Car",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const FavouriteCar = model<TFavouriteCar>(
  "FavouriteCar",
  favouriteCarSchema,
);
