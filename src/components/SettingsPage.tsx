import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { Settings as SettingsIcon, Save, RefreshCcw, Shield, User } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsPageProps {
  profile: UserProfile | null;
}

export default function SettingsPage({ profile }: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [simPassword, setSimPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Load current simulation password from Firestore
    const loadConfig = async () => {
      try {
        const configRef = doc(db, 'system', 'config');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setSimPassword(configSnap.data().simulationPassword || 'admin123');
        } else {
          setSimPassword('admin123');
        }
      } catch (err) {
        console.error('Error loading config:', err);
      }
    };
    loadConfig();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setLoading(true);
    setMessage(null);
    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, { displayName });
      setMessage({ type: 'success', text: 'Profil admin berhasil diperbarui!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memperbarui profil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const configRef = doc(db, 'system', 'config');
      await setDoc(configRef, { simulationPassword: simPassword }, { merge: true });
      setMessage({ type: 'success', text: 'Password simulasi berhasil diubah!' });
    } catch (err: any) {
      console.error('Change Password Error:', err);
      setMessage({ type: 'error', text: `Gagal mengubah password: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Yakin ingin meriset password simulasi ke default (admin123)?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const configRef = doc(db, 'system', 'config');
      await setDoc(configRef, { simulationPassword: 'admin123' }, { merge: true });
      setSimPassword('admin123');
      setMessage({ type: 'success', text: 'Password telah direset ke default.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal meriset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-gray-900 p-2 rounded-lg text-white">
          <SettingsIcon size={20} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pengaturan Sistem</h2>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Admin Data Form */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-gray-900 pb-2 border-b border-gray-50">
            <User size={18} className="text-blue-600" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Update Data Admin</h3>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nama Tampilan</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                placeholder="Nama Admin"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email (Read Only)</label>
              <input 
                type="text"
                value={profile?.email || ''}
                readOnly
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              Simpan Profil
            </button>
          </form>
        </div>

        {/* Password Management */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-gray-900 pb-2 border-b border-gray-50">
            <Shield size={18} className="text-orange-600" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Keamanan Mode Simulasi</h3>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Simulation Password</label>
                <input 
                  type="password"
                  value={simPassword}
                  onChange={(e) => setSimPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all text-sm"
                  placeholder="Password Baru"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                <Save size={16} />
                Ubah Password
              </button>
            </form>

            <div className="pt-4 border-t border-gray-50">
              <button 
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-transparent hover:border-red-100"
              >
                <RefreshCcw size={14} />
                Reset ke Default (admin123)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
