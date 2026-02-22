import { Types } from "mongoose";

export enum AVAILABLE_DAYS {
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
}

export enum FUEL_TYPE {
  PETROL = "PETROL",
  DIESEL = "DIESEL",
  ELECTRIC = "ELECTRIC",
  HYBRID = "HYBRID",
}

export enum TRANSMISSION {
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
}

export interface IBlockedDate {
  date: Date;
  reason?: string;
}

export interface ICarFacility {
  label: string; // Display name from dashboard (e.g. "Bluetooth")
  value: string; // Unique key (e.g. "bluetooth", "gps", "air_condition")
}

export interface ICar {
  _id?: Types.ObjectId;
  vehicleId?: string;
  brand: string;
  model: string;
  year: number;
  transmission: TRANSMISSION;
  depositAmount: number;
  fuelType: FUEL_TYPE;
  mileage: string;
  seatNumber: number;
  color: string;
  about: string;
  carType:string;
  shortDescription: string;
  licensePlate: string;
  vin?: string;
  carRegistrationPaperFrontPic?: string;
  carRegistrationPaperBackPic?: string;
  coverImage: string;
  images: string[];
  assignedHosts?: Types.ObjectId;
  dailyPrice: number;
  hourlyPrice?: number;
  minimumTripDuration: number; // in hours
  withDriver: boolean;
  country?: string;
  state?: string;
  city: string;
  pickupPoint: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude],
    address: string;
  }; // GeoJSON Point
  availableDays: AVAILABLE_DAYS[];
  facilities: ICarFacility[];
  availableHours: string[];
  blockedDates?: IBlockedDate[];
  defaultStartTime?: string; // e.g., "09:00"
  defaultEndTime?: string; // e.g., "21:00"
  isActive: boolean;
  isAvailable?: boolean; // virtual field
  isFavorite?: boolean; // virtual field
}
