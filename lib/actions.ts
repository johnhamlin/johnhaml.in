'use server';
import Tracking from '@/models/Tracking';
import dbConnect from './dbConnect';
import { userAgent } from 'next/server';
import { headers } from 'next/headers';

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

  console.log(userAgentData);
  console.log({ ip });

  await dbConnect();

  try {
    await Tracking.create({ tag, userAgent: userAgentData, ip });
  } catch (e) {
    console.error(e);
  }
}
