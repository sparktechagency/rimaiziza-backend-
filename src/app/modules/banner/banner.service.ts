import { StatusCodes } from "http-status-codes";
import { Banner } from "./banner.model";
import unlinkFile from "../../../shared/unlinkFile";
import mongoose, { Types } from "mongoose";
import { TBanner } from "./banner.interface";
import ApiError from "../../../errors/ApiErrors";

const createBannerToDB = async (payload: TBanner): Promise<TBanner> => {
  const createBanner: any = await Banner.create(payload);
  if (!createBanner) {
    unlinkFile(payload.image);
    throw new ApiError(400, "Failed to created banner");
  }

  return createBanner;
};

const getAllBannerFromDB = async (): Promise<TBanner[]> => {
  return await Banner.find({});
};

const updateBannerToDB = async (id: string, payload: TBanner) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ");
  }
  // console.log(payload, "Payload");

  const isBannerExist: any = await Banner.findById(id);

  if (payload.image && isBannerExist?.image) {
    unlinkFile(isBannerExist?.image);
  }

  const banner: any = await Banner.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return banner;
};

const updateBannerStatusToDB = async (id: string, status: boolean) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, "No banner found in the database");
  }

  const result = await Banner.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteBannerToDB = async (id: string) => {
  const isBannerExist: any = await Banner.findById({ _id: id });

  // delete from folder
  if (isBannerExist) {
    unlinkFile(isBannerExist?.image);
  }

  // delete from database
  const result = await Banner.findByIdAndDelete(id);

  return result;
};

export const BannerService = {
  createBannerToDB,
  getAllBannerFromDB,
  updateBannerToDB,
  deleteBannerToDB,
  updateBannerStatusToDB,
};
