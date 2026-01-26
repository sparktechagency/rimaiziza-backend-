export type TDestination = {
    image: string;
    city: string;
    pickupPoint: { type: "Point"; coordinates: [number, number], address: string }; // GeoJSON Point
}