import { Types } from "mongoose";

export enum REVIEW_TYPE {
  CAR = "CAR",
  HOST = "HOST",
}

export type TReview = {
  carId: Types.ObjectId;
  hostId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  ratingValue: number;
  feedback?: string;
};
