import express from "express";
import { DestinationControllers } from "./destination.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { FOLDER_NAMES } from "../../../enums/files";

const router = express.Router();

router.post("/",
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
    DestinationControllers.createDestination);

router.get("/", DestinationControllers.getDestinations);

export const DestinationRoutes = router;    