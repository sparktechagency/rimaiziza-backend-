import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DestinationServices } from "./destination.service";

const createDestination = catchAsync(async (req, res) => {
    const data = req.body

    const result = await DestinationServices.createDestination(data)
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Destination created successfully",
        data: result
    })
})


const getDestinations = catchAsync(async (req, res) => {
    const result = await DestinationServices.getDestinationsFromDB();
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Destinations fetched successfully",
        data: result
    })
})

export const DestinationControllers = {
    createDestination,
    getDestinations
}