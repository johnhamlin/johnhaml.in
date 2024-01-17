import mongoose from 'mongoose';
import { IPinfo } from 'node-ipinfo';

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
  ipInfo: IPinfo;
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
    ipInfo: {
      ip: String,
      hostname: String,
      bogon: Boolean,
      anycast: Boolean,
      city: String,
      region: String,
      country: String,
      countryFlag: {
        emoji: String,
        unicode: String,
      },
      countryFlagURL: String,
      countryCurrency: {
        code: String,
        symbol: String,
      },
      continent: {
        code: String,
        name: String,
      },
      isEU: Boolean,
      countryCode: String,
      loc: String,
      org: String,
      postal: String,
      timezone: String,
      asn: {
        asn: String,
        name: String,
        domain: String,
        route: String,
        type: String,
      },
      company: {
        name: String,
        domain: String,
        type: String,
      },
      carrier: {
        name: String,
        mcc: String,
        mnc: String,
      },
      privacy: {
        vpn: Boolean,
        proxy: Boolean,
        tor: Boolean,
        hosting: Boolean,
      },
      abuse: {
        address: String,
        country: String,
        email: String,
        name: String,
        network: String,
        phone: String,
      },
      domains: {
        ip: String,
        total: Number,
        domains: [String],
      },
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
