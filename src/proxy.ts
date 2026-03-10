import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function proxy(request: NextRequest) {
  // Extract or generate Correlation ID
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();

  // Clone the request headers and set the correlation ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  // You can also add it to the response headers so the client can track it
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-correlation-id', correlationId);

  return response;
}

export const config = {
  // Apply this middleware to all route paths except static files, _next, etc.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
