import { User } from "../user/user.model";

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