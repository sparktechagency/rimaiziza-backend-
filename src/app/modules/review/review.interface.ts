import { Types } from "mongoose";

export enum REVIEW_TARGET_TYPE {
  HOST = "HOST",
  USER = "USER",
}

export interface IReview {
  _id?: Types.ObjectId;

  reviewForId: Types.ObjectId; // যাকে review দেওয়া হচ্ছে (host or user)
  reviewById: Types.ObjectId;  // যিনি review দিয়েছেন (user or host)

  ratingValue: number; // 1 to 5
  feedback?: string;

  reviewType: REVIEW_TARGET_TYPE; // HOST বা USER

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReviewFromUser {
  _id: Types.ObjectId;
  name: string;
  role: string;
  email: string;
  phone?: string;
  profileImage?: string;
  location?: string;
}

export interface IReviewItem {
  reviewId: Types.ObjectId;
  ratingValue: number;
  feedback?: string;
  createdAt: Date;
  fromUser: IReviewFromUser;
}

export interface IReviewSummary {
  averageRating: number;
  totalReviews: number;
  starCounts: Record<number, number>;
  reviews: IReviewItem[];
}