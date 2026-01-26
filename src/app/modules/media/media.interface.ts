export enum MEDIA_TYPE {
  BANNER = "BANNER",
  FEED = "FEED",
}

export interface IMedia extends Document {
  name: string;
  image: string;
  status: boolean;
  type: MEDIA_TYPE;
  description?: string;
}
