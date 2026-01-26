import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MediaServices } from "./media.service";

const createMedia = catchAsync(async (req, res) => {
  const mediaData = req.body;

  const result = await MediaServices.createMediaToDB(mediaData);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully create a media data",
    data: result,
  });
});

const getMediaByType = catchAsync(async (req, res) => {
  const { type, includeInactive } = req.query;

  console.log(type, includeInactive, "Type & IncludeInactive");

  // query string থেকে boolean convert
  const includeInactiveBool = includeInactive === "true";

  const result = await MediaServices.getMediaByTypeFromDB(
    type,
    includeInactiveBool,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully get media by types",
    data: result,
  });
});

const updateMediaById = catchAsync(async (req, res) => {
  const { mediaId } = req.params;
  const updatedData = req.body;
  const result = await MediaServices.updateMediaByIdToDB(mediaId, updatedData);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully updated media by ID",
    data: result,
  });
});

const updateMediaStatus = catchAsync(async (req, res) => {
  const { mediaId } = req.params;
  const { status } = req.body;
  const result = await MediaServices.updateMediaStatusByIdToDB(mediaId, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Media status updated successfully",
    data: result,
  });
});

const deleteMedia = catchAsync(async (req, res) => {
  const { mediaId } = req.params;
  const result = await MediaServices.deleteMediaByIdToDB(mediaId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Media deleted successfully",
    data: result,
  });
});

export const MediaControllers = {
  createMedia,
  getMediaByType,
  updateMediaById,
  updateMediaStatus,
  deleteMedia,
};
