import mongoose from 'mongoose';
import { UserAgent } from 'next/dist/server/web/spec-extension/user-agent';

export interface Tracking extends mongoose.Document {
  _id: string;
  tag: string;
  // userAgent: UserAgent;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      // type: {
      //   isBot: Boolean,
      //   ua: String,
      //   browser: {
      //     name: String,
      //     version: String,
      //   },
      //   device: {
      //     model: String,
      //     type: String,
      //     vendor: String,
      //   },
      //   engine: {
      //     name: String,
      //     version: String,
      //   },
      //   os: {
      //     name: String,
      //     version: String,
      //   },
      //   cpu: {
      //     architecture: String,
      //   },
      // },
      required: true,
    },
  },
  // Add createdAt and updatedAt https://mongoosejs.com/docs/guide.html#timestamps
  { timestamps: true },
);

export default mongoose.models.Tracking ||
  mongoose.model<Tracking>('Tracking', TrackingSchema);
