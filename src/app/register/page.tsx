'use client'; 

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'; 
import axios from 'axios';
import { useRouter } from 'next/navigation';
import uniLogo from './yuksekihtisasuni-logo.png'

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      });

      setSuccess(response.data.msg + ' Giriş sayfasına yönlendiriliyorsunuz...');

      // 2 saniye sonra login'e yönlendir
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.msg || 'Kayıt Hatası');
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
          Yeni Hesap Oluştur
        </h2>

        {error && (
          <div className="rounded-md bg-red-100 p-4 border border-red-300">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-100 p-4 border border-green-300">
            <p className="text-sm font-medium text-green-700">{success}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={signUp}>

          <div className="rounded-md shadow-sm">
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="relative block w-full appearance-none rounded-lg border border-gray-300 px-4 py-4 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="İsim Soyisim"
            />
          </div>

          <div className="mt-4 rounded-md shadow-sm">
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
                <span>Yükleniyor...</span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </div>

          <div className="mt-4">
            <Link href="/login" passHref>
              <button
                type="button" 
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg border border-gray-400 bg-transparent px-4 py-4 text-base font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Zaten hesabın var mı? Giriş Yap
              </button>
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}