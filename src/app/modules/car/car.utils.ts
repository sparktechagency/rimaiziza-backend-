import { Types } from "mongoose";
import { User } from "../user/user.model";
import { ICar } from "./car.interface";
import { FavoriteCar } from "../favoriteCar/favoriteCar.model";

export const getTargetLocation = async (queryLat?: string | number, queryLng?: string | number, userId?: string) => {

  let lat = queryLat ? Number(queryLat) : null;
  let lng = queryLng ? Number(queryLng) : null;


  if ((!lat || !lng) && userId) {
    const user = await User.findById(userId).select("location");
    if (user?.location?.coordinates) {
      lng = user.location.coordinates[0];
      lat = user.location.coordinates[1];
    }
  }

// default dhaka
  if (!lat || !lng) {
    lng = 90.4125; 
    lat = 21.8103;
  }


  return { lat, lng };
};

export const attachFavoriteToCar = async (
  car: ICar,
  userId?: string
): Promise<ICar & { isFavorite: boolean }> => {
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return { ...car, isFavorite: false };
  }

  const favorite = await FavoriteCar.findOne({
    userId,
    referenceId: car._id,
  }).lean();

  return { ...car, isFavorite: !!favorite };
};

