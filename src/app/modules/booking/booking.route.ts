import express from "express";
import { BookingControllers } from "./booking.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";

const router = express.Router();

router.route("/")
    .post(
        auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        fileUploadHandler(),
        parseAllFilesData(
            { fieldName: "nidFrontPic", forceSingle: true },
            { fieldName: "nidBackPic", forceMultiple: true },
            { fieldName: "drivingLicenseFrontPic", forceMultiple: true },
            { fieldName: "drivingLicenseBackPic", forceMultiple: true },
        ),
        BookingControllers.createBookingToDB,
    );

router.route("/host")
    .get(
        auth(USER_ROLES.HOST, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        BookingControllers.getHostBookings,
    )


router.route("/host/:bookingId")
    .patch(
        auth(USER_ROLES.HOST, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        BookingControllers.approveBookingByHost,
    );

router.route("/cancel/:bookingId")
    .post(
        auth(
            USER_ROLES.USER,
            USER_ROLES.HOST,
            USER_ROLES.ADMIN,
            USER_ROLES.SUPER_ADMIN
        ),
        BookingControllers.cancelBooking,
    );

router.route("/all")
    .get(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        BookingControllers.getAllBookings,
    );


router.route("/user")
    .get(
        auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        BookingControllers.getUserBookings,
    );

// router.route("/user/:bookingId")
//     .patch(
//         auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
//         BookingControllers.confirmBookingAfterPayment,
//     );

router.route("/host/self")
    .get(
        auth(USER_ROLES.HOST, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
        BookingControllers.getSelfBookingsByHost,
    );



export const BookingRoutes = router;
