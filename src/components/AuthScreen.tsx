import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'google' | 'guest' | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoadingType('google');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login Error:', err);
      setError('Gagal masuk dengan Google.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoadingType('guest');
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Guest Login Error:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('Mode Tamu belum aktif. Silakan aktifkan "Anonymous Auth" di Firebase Console Anda.');
      } else {
        setError('Terjadi kesalahan saat masuk sebagai tamu.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-6">
          <LogIn className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">E-Biodata Pro</h1>
        <p className="text-gray-500 mb-8">Sistem Manajemen Biodata Terpadu</p>
        
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={!!loadingType}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loadingType === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            )}
            Lanjut dengan Google (Admin/User)
          </button>

          <button
            onClick={handleGuestLogin}
            disabled={!!loadingType}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loadingType === 'guest' ? (
              <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            ) : (
              <UserCircle size={20} />
            )}
            Mulai Tanpa Login (Mode Tamu)
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 leading-relaxed text-left"
          >
            <p className="font-bold mb-1">Akses Terbatas:</p>
            {error}
          </motion.div>
        )}
        
        <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed">
          Pilih metode akses untuk melanjutkan ke Dashboard Biodata
        </p>
      </motion.div>
    </div>
  );
}
