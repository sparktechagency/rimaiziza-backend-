import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { MediaControllers } from "./media.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { FOLDER_NAMES } from "../../../enums/files";

const router = express.Router();

router
  .route("/")
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
    MediaControllers.createMedia,
  )
  .get(MediaControllers.getMediaByType);

router.patch(
  "/status/:mediaId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MediaControllers.updateMediaStatus,
);

router
  .route("/:mediaId")
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
    MediaControllers.updateMediaById,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MediaControllers.deleteMedia,
  );

export const MediaRoutes = router;
