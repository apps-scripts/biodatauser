import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserRole } from '../types';
import { LogOut, Database, LogIn, ShieldCheck, ArrowLeftRight, Settings } from 'lucide-react';

interface NavbarProps {
  role: UserRole;
  effectiveRole: UserRole;
  setEffectiveRole: (role: UserRole) => void;
  displayName?: string;
  onNavigate: (view: 'form' | 'list' | 'settings') => void;
  currentView: 'form' | 'list' | 'settings';
}

export default function Navbar({ role, effectiveRole, setEffectiveRole, displayName, onNavigate, currentView }: NavbarProps) {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [showPasswordInput, setShowPasswordInput] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [passError, setPassError] = React.useState(false);
  const [dbPassword, setDbPassword] = React.useState('admin123');

  React.useEffect(() => {
    // Sync the local DB password with Firestore
    const configRef = doc(db, 'system', 'config');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setDbPassword(snapshot.data().simulationPassword || 'admin123');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        console.error('Login Error:', err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === dbPassword) {
      setEffectiveRole(UserRole.ADMIN);
      setShowPasswordInput(false);
      setPassword('');
      setPassError(false);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2000);
    }
  };

  const toggleRole = () => {
    if (effectiveRole === UserRole.USER) {
      setShowPasswordInput(true);
    } else {
      setEffectiveRole(UserRole.USER);
    }
  };

  const isGuest = !auth.currentUser || auth.currentUser.isAnonymous;

  return (
    <nav className="bg-white border-b border-gray-100 py-3 px-6 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Database size={20} />
          </div>
          <span className="text-xl font-bold text-blue-900 tracking-tight">E-BIODATA</span>
          <div className="relative">
            <button 
              onClick={toggleRole}
              className={`ml-3 px-3 py-1.5 text-[11px] font-extrabold rounded-lg uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm ${
                effectiveRole === UserRole.ADMIN 
                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
              }`}
            >
              <ArrowLeftRight size={15} />
              {effectiveRole === UserRole.ADMIN ? 'Mode Admin' : 'Mode User'}
            </button>

            {showPasswordInput && (
              <div className="absolute top-full left-2 mt-2 p-4 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 border-t-4 border-t-red-500">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-red-500" />
                  Verifikasi Admin
                </p>
                <form onSubmit={verifyAndSwitch} className="space-y-2">
                  <input 
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password..."
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      passError ? 'border-red-500 bg-red-50 animate-shake' : 'border-gray-200'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 text-white text-[11px] font-extrabold py-2.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest shadow-md shadow-blue-200"
                    >
                      Verifikasi
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setShowPasswordInput(false); setPassword(''); }}
                      className="px-4 bg-gray-100 text-gray-500 text-[11px] font-extrabold py-2.5 rounded-xl hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest"
                    >
                      Batal
                    </button>
                  </div>
                  {passError && <p className="text-[10px] text-red-500 font-bold">Password Salah!</p>}
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => onNavigate('form')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                currentView === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Form Input
            </button>
            {effectiveRole === UserRole.ADMIN && (
              <button
                onClick={() => onNavigate('list')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  currentView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Database
              </button>
            )}
            {effectiveRole === UserRole.ADMIN && (
              <button
                onClick={() => onNavigate('settings')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                  currentView === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings size={16} />
                Pengaturan
              </button>
            )}
          </div>

          <div className="h-8 w-[1px] bg-gray-200" />

          <div className="flex items-center gap-3">
            {isGuest && (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold transition-colors border border-blue-100 ${
                  isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'
                }`}
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <LogIn size={18} />
                )}
                ADMIN LOGIN
              </button>
            )}
            {!isGuest && role === UserRole.ADMIN && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-extrabold uppercase border border-blue-100 shadow-sm">
                 <ShieldCheck size={16} />
                 Admin Authorized
               </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
