import type { NextConfig } from "next";

// Kart basım (otokart-basim) ayrı bir yan servis olarak çalışır; portal üzerinden /kart-basim/ altında sunulur.
// Servis oturumu portalın "token" çerezinden doğrular, yalnızca yerel makineden erişilebilir.
const KART_BASIM_URL = process.env.KART_BASIM_URL || 'http://127.0.0.1:3100';

const nextConfig: NextConfig = {
  // /kart-basim/ (sondaki eğik çizgi) yönlendirilmesin: servisin göreli dosya yolları buna bağlı
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [{ source: '/kart-basim/:path*', destination: `${KART_BASIM_URL}/:path*` }];
  },
};

export default nextConfig;
