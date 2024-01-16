'use server';
import Tracking from '@/models/Tracking';
import dbConnect from './dbConnect';
import { userAgent } from 'next/server';
import { headers } from 'next/headers';

export async function createTracking(tag: string) {
  const userAgentData = userAgent({ headers: headers() });
  console.log(userAgentData);
  await dbConnect();
  try {
    await Tracking.create({ tag, userAgent: userAgentData });
  } catch (e) {
    console.error(e);
  }
}
