import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { UserRole } from '@/src/lib/models/User';

// Swagger UI sayfası: yalnızca giriş yapmış admin görür. "Try it out" istekleri aynı origin'den
// gittiği için admin oturumunun cookie'siyle çalışır.
export async function GET(request: NextRequest) {
  const { user, error } = getAuthenticatedUser(request);
  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', '/api/docs');
    return NextResponse.redirect(loginUrl);
  }
  if (user.role !== UserRole.ADMIN) {
    return new NextResponse('Yasak: API dokümantasyonu yalnızca yöneticilere açıktır.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>YİÜ Portal API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/docs/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha'
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
