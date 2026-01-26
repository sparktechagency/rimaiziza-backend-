import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { FavouriteCarServices } from "./favouriteCar.service";

const toggleFavourite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const { referenceId } = req.body as {
    referenceId: string;
  };

  const result = await FavouriteCarServices.toggleFavourite({
    userId: id,
    referenceId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message || "Favourite toggled successfully",
    data: result,
  });
});

const getFavourite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const result = await FavouriteCarServices.getFavourite(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favourites are Retrieved Successfully",
    data: result,
  });
});

const getSingleFavourite = catchAsync(async (req, res) => {
  const { bookmarkId } = req.params;
  const { id: userId } = req.user as any;

  const result = await FavouriteCarServices.getSingleFavourite(
    userId,
    bookmarkId,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favourite is retrieved successfully by ID",
    data: result,
  });
});

const deleteFavourite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const { referenceId } = req.params;

  const result = await FavouriteCarServices.deleteFavourite(id, referenceId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favourite is deleted successfully",
    data: result,
  });
});

export const FavouriteCarControllers = {
  toggleFavourite,
  getFavourite,
  deleteFavourite,
  getSingleFavourite,
};
