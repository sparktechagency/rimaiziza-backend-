import { Types } from "mongoose";

export type TSupport = {
  userId: Types.ObjectId;
  email: string;
  subject: string;
  message: string;
};
