// Proxy (nginx) arkasında request.url iç adresi (örn. https://localhost:3000) verebilir.
// Yönlendirmelerde dışarıdan görünen adres için NEXT_PUBLIC_BASE_URL kullanılır;
// tanımlı değilse isteğin kendi adresine düşer.
export function publicUrl(path: string, requestUrl: string): URL {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  try {
    return new URL(path, base || requestUrl);
  } catch {
    return new URL(path, requestUrl);
  }
}
