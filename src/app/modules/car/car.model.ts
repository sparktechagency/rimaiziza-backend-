import { model, Schema } from "mongoose";
import {
  AVAILABLE_DAYS,
  CAR_VERIFICATION_STATUS,
  FUEL_TYPE,
  IBlockedDate,
  ICar,
  TRANSMISSION,
} from "./car.interface";

const blockedDateSchema = new Schema<IBlockedDate>(
  {
    date: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false },
);

// Mongoose Schema
const CarSchema = new Schema<ICar>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    transmission: {
      type: String,
      enum: Object.values(TRANSMISSION),
      required: true,
    },
    fuelType: {
      type: String,
      enum: Object.values(FUEL_TYPE),
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(CAR_VERIFICATION_STATUS),
      default: CAR_VERIFICATION_STATUS.PENDING,
    },
    // airConditioning: {
    //   type: Boolean,
    //   required: true,
    // },
    // gpsNavigation: {
    //   type: Boolean,
    //   required: true,
    // },
    mileage: {
      type: String,
      required: true,
    },
    // bluetooth: {
    //   type: Boolean,
    //   required: true,
    // },
    seatNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    about: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
      maxlength: 160,
    },
    blockedDates: {
      type: [blockedDateSchema],
      default: [],
    },
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    vin: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    carRegistrationPaperFrontPic: {
      type: String,
      required: true,
    },
    carRegistrationPaperBackPic: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ], // array of image URLs
    dailyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    hourlyPrice: {
      type: Number,
      min: 0,
    },
    minimumTripDuration: {
      type: Number,
      required: true,
      min: 1,
    }, // hours
    withDriver: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    pickupPoint: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      }, // [lng, lat]
      address: {
        type: String,
        default: "",
      },
    },
    availableDays: [
      {
        type: String,
        enum: Object.values(AVAILABLE_DAYS),
        required: true,
      },
    ],
    facilities: [
      {
        label: { type: String, required: true },  // Display name from dashboard (e.g. "Bluetooth")
        value: { type: String, required: true },  // Unique key (e.g. "bluetooth", "gps", "air_condition") 
      },
    ],
    availableHours: [
      {
        type: String,
        required: false,
      },
    ],
    // facilities: [
    //   {
    //     type: String,
    //     required: false,
    //   },
    // ],
    defaultStartTime: {
      type: String,
      enum: [
        "00:00",
        "01:00",
        "02:00",
        "03:00",
        "04:00",
        "05:00",
        "06:00",
        "07:00",
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
      ],
    },
    defaultEndTime: {
      type: String,
      enum: [
        "00:00",
        "01:00",
        "02:00",
        "03:00",
        "04:00",
        "05:00",
        "06:00",
        "07:00",
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
    versionKey: false,
  },
);

// 2dsphere index for location-based queries (e.g., find cars near me)
CarSchema.index({ pickupPoint: "2dsphere" });

// Compound index for common queries
CarSchema.index({ userId: 1, isActive: 1 });
CarSchema.index({ city: 1, isActive: 1 });
CarSchema.index({ licensePlate: 1 });
CarSchema.index({ vin: 1 });

// Model
export const Car = model<ICar>("Car", CarSchema);
