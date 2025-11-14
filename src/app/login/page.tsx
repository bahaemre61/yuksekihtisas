'use client'; // Bu satır, 'useState' gibi hook'ları kullanmamız için gereklidir.

import { useState } from 'react';
import Image from 'next/image'; // Next.js'in optimize edilmiş resim bileşeni
import Link from 'next/link';   // Next.js'in sayfa yönlendirme bileşeni
import axios from 'axios';
import { useRouter } from 'next/navigation'; // Yönlendirme için
import uniLogo from '../login/yuksekihtisasuni-logo.png'; // Logo dosyasını içe aktar

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter(); // Yönlendiriciyi tanımla

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });
      router.push('/dashboard');

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.msg || 'Giriş Hatası');
      } else {
        setError('Bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        <div>
          <Image
            src={uniLogo} 
            alt="Logo"
            width={180} 
            height={180} 
            className="mx-auto" 
          />
        </div>

        <h2 className="mt-6 text-center text-3xl font-bold text-gray-800">
          Giriş Yap
        </h2>

        {error && (
          <div className="rounded-md bg-red-100 p-4 border border-red-300">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={signIn}>        
          <div className="rounded-md shadow-sm">
            <input
              id="email-address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="relative block w-full appearance-none rounded-lg border border-gray-300 px-4 py-4 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="E-posta"
            />
          </div>

          <div className="mt-4 rounded-md shadow-sm">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="relative block w-full appearance-none rounded-lg border border-gray-300 px-4 py-4 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Şifre"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </div>
          <div className="mt-4">
            <Link href="/register" passHref>
              <button
                type="button" 
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg border border-blue-600 bg-transparent px-4 py-4 text-base font-bold text-blue-600 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Hesabın yok mu? Kayıt Ol
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}