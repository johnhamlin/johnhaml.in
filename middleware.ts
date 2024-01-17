// Purpose: Middleware for Clerk authentication

import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // publicRoutes: ['/'],
  // Only protect routes that start with /admin
  publicRoutes: (req) => !req.url.includes('/admin'),
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
