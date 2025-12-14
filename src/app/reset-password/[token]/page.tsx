'use client';

import { useState, use} from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import uniLogo from '../yuksekihtisasuni-logo.png'
import Image from 'next/image';


export default function ResetPasswordPage({params}: {params: Promise<{token: string}>}) {
    const {token} = use(params);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newPassword !== confirmPassword){
            setError('Şifreler eşleşmiyor.');
            return;
        }
        setLoading(true);
        setError('');
        try{
            const res = await axios.post('/api/auth/reset-password', {
                token,
                newPassword
            });
            setMessage(res.data.msg);
            setTimeout(() => router.push('/login'), 3000);
        }catch (err:any){
            setError(err.response?.data?.msg || 'İşlem Başarısız.');
        }finally
        {
            setLoading(false);
        }
    };

    return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div>
          <Image
            src={uniLogo} 
            alt="Logo"
            width={180} 
            height={180} 
            className="mx-auto" 
          />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Yeni Şifre Belirle</h2>

        {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Yeni Şifre</label>
              <input 
                type="password" required 
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Şifre Tekrar</label>
              <input 
                type="password" required 
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:blue-500"
              />
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
