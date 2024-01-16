import mongoose from 'mongoose';

interface UserAgent {
  isBot: boolean;
  ua: string;
  browser: {
    name?: string;
    version?: string;
    major?: string;
  };
  device: {
    model?: string;
    type?: string;
    vendor?: string;
  };
  engine: {
    name?: string;
    version?: string;
  };
  os: {
    name?: string;
    version?: string;
  };
  cpu: {
    architecture?: string;
  };
}

export interface Tracking extends mongoose.Document {
  _id: string;
  tag: string;
  userAgent: UserAgent;
  ip: string;
  // userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      isBot: { type: Boolean, required: true },
      ua: { type: String, required: true },
      browser: {
        name: String,
        version: String,
        major: String,
      },
      device: {
        model: String,
        // Must format this way because "type" is a reserved word in mongoose
        type: { type: String },
        vendor: String,
      },
      engine: {
        name: String,
        version: String,
      },
      os: {
        name: String,
        version: String,
      },
      cpu: {
        architecture: String,
      },
    },
  },
  // Add createdAt and updatedAt https://mongoosejs.com/docs/guide.html#timestamps
  { timestamps: true },
);

export default mongoose.models.Tracking ||
  mongoose.model<Tracking>('Tracking', TrackingSchema);
