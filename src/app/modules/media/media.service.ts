import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import { IMedia, MEDIA_TYPE } from "./media.interface";
import { Media } from "./media.model";

const createMediaToDB = async (payload: IMedia) => {
  const { type, description } = payload;

  if (![MEDIA_TYPE.BANNER, MEDIA_TYPE.FEED].includes(payload.type)) {
    throw new ApiError(400, "Media type must be 'BANNER' or 'FEED'");
  }

  // if description is provided, ensure this type doesn't already have one
  if (description) {
    const exist = await Media.findOne({
      type,
      description: { $ne: "" },
    });

    if (exist) {
      throw new ApiError(
        400,
        `A description already exists for media type: ${type}`,
      );
    }
  }

  // switch is used to allow future type-specific logic
  switch (type) {
    case MEDIA_TYPE.BANNER:
      return await Media.create({ ...payload });

    case MEDIA_TYPE.FEED:
      return await Media.create({ ...payload });

    default:
      throw new ApiError(400, "Invalid media type");
  }
};

const getMediaByTypeFromDB = async (
  type: any,
  includeInactive: boolean = false,
) => {
  if (![MEDIA_TYPE.BANNER, MEDIA_TYPE.FEED].includes(type)) {
    throw new ApiError(400, "Media type must be 'BANNER' or 'FEED'");
  }

  // filter condition
  const filter: any = { type };
  if (!includeInactive) {
    filter.status = true;
  }

  const mediaList = await Media.find(filter);

  return mediaList || [];
};

const updateMediaByIdToDB = async (
  mediaId: string,
  payload: Partial<IMedia>,
): Promise<IMedia> => {
  if (
    payload.type &&
    ![MEDIA_TYPE.BANNER, MEDIA_TYPE.FEED].includes(payload.type)
  ) {
    throw new ApiError(400, "Media type must be 'BANNER' or 'FEED'");
  }

  if (payload.description !== undefined) {
    if (payload.description.trim() === "") {
      payload.description = "";
    } else {
      // uniqueness check
      const exist = await Media.findOne({
        _id: { $ne: mediaId },
        type: payload.type || undefined,
        description: { $ne: "" },
      });
      if (exist) {
        throw new ApiError(
          400,
          `A description already exists for media type: ${payload.type}`,
        );
      }
    }
  }

  const updatedMedia = await Media.findByIdAndUpdate(
    mediaId,
    { $set: payload },
    { new: true },
  );

  if (!updatedMedia) {
    throw new ApiError(404, "Media not found");
  }

  return updatedMedia;
};

const updateMediaStatusByIdToDB = async (id: string, status: boolean) => {
  const media = await Media.findById(id);
  if (!media) {
    throw new ApiError(404, "No media found in the database");
  }

  const result = await Media.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteMediaByIdToDB = async (id: string) => {
  const isBannerExist: any = await Media.findById({ _id: id });

  // delete from folder
  if (isBannerExist) {
    unlinkFile(isBannerExist?.image);
  }

  // delete from database
  const result = await Media.findByIdAndDelete(id);

  return result;
};

export const MediaServices = {
  createMediaToDB,
  getMediaByTypeFromDB,
  updateMediaByIdToDB,
  updateMediaStatusByIdToDB,
  deleteMediaByIdToDB,
};
