'use server';
import Tracking from '@/models/Tracking';
import dbConnect from './dbConnect';
import { userAgent } from 'next/server';
import { headers } from 'next/headers';
import IPinfoWrapper, { IPinfo, AsnResponse } from 'node-ipinfo';
const IPINFO_TOKEN = process.env.IPINFO_TOKEN;

if (!IPINFO_TOKEN) {
  throw new Error(
    'Please define the IPINFO_TOKEN environment variable inside .env.local',
  );
}

const ipinfoWrapper = new IPinfoWrapper(IPINFO_TOKEN);

function IP() {
  const FALLBACK_IP_ADDRESS = '0.0.0.0';
  const forwardedFor = headers().get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0] ?? FALLBACK_IP_ADDRESS;
  }

  return headers().get('x-real-ip') ?? FALLBACK_IP_ADDRESS;
}

export async function createTracking(tag: string) {
  const userAgentData = userAgent({ headers: headers() });
  const ip = IP();
  const ipInfo = await ipinfoWrapper.lookupIp(ip);

  console.log(userAgentData);
  console.log({ ip });
  console.log(ipInfo);

  await dbConnect();

  try {
    await Tracking.create({ tag, userAgent: userAgentData, ip, ipInfo });
  } catch (e) {
    console.error(e);
  }
}
