'use client'; 

import { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import Link from 'next/link';
import uniLogo from '../login/yuksekihtisasuni-logo.png'; 



export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try{
            const res = await axios.post('/api/auth/forget-password', {email});
            setMessage(res.data.msg);
        }catch (err:any){
            setError(err.response?.data?.msg || 'Bir hata oluştu.');
        }finally{
            setLoading(false);
        }
    };

    return(
        <div className='flex min-h-screen items-center justify-center bg-gray-100 px-4'>
            <div className='w-full max-w-md bg-white p-8 rounded-lg shadow-md'>
            <div>
          <Image
            src={uniLogo} 
            alt="Logo"
            width={180} 
            height={180} 
            className="mx-auto" 
          />
        </div>
                <h2 className='text-2xl font-bold text-center mb-6 text-gray-600'>Şifremi Unuttum?</h2>
                {message && <div className='bg-green-100 text-green-700 p-3 rounded mb-4'>{message}</div>}
                {error && <div className='bg-red-100 text-red-700 p-3 rounded mb-4'>{error}</div>}
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700'>E-posta Adresi</label>
                        <input
                        type='email' required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                        />
                    </div>
                    <button
                        type='submit' disabled={loading}
                        className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition'
                        >
                            {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                    </button>
                </form>
            </div>
        </div>
    );
}
