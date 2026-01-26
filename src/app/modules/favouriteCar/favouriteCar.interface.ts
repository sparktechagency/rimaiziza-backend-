import { Types, Document } from "mongoose";

export interface TFavouriteCar extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
}
