import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserRole, UserProfile, Biodata } from './types';
import Navbar from './components/Navbar';
import BiodataForm from './components/BiodataForm';
import BiodataList from './components/BiodataList';
import SettingsPage from './components/SettingsPage';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'form' | 'list' | 'settings'>('form');
  const [effectiveRole, setEffectiveRole] = useState<UserRole | null>(null);
  const [editingBiodata, setEditingBiodata] = useState<Biodata | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Auto-login anonymously to skip login screen
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous Sign-In Error:", err);
          // Fallback settings if auth fails
          setEffectiveRole(UserRole.USER);
          setLoading(false);
        });
        return;
      }

      setUser(firebaseUser);
      setLoading(true); // Ensure loading state while checking profile
      
      try {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        let currentRole = UserRole.USER;
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          currentRole = data.role as UserRole;
          setProfile({ uid: firebaseUser.uid, ...data } as UserProfile);
        } else {
          // If the email matches the owner email, set as admin
          const isAdminUser = firebaseUser.email === 'bppkkpdppik@gmail.com';
          currentRole = isAdminUser ? UserRole.ADMIN : UserRole.USER;
          
          const newProfile = {
            email: firebaseUser.email || 'anonymous',
            displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest User' : 'User'),
            role: currentRole,
            createdAt: serverTimestamp(),
          };
          
          // Don't await profile creation to avoid blocking UI if rules fail
          setDoc(profileRef, newProfile).catch(e => console.warn("Failed to save profile:", e));

          if (isAdminUser) {
            setDoc(doc(db, 'admins', firebaseUser.uid), {
              email: firebaseUser.email,
              assignedAt: serverTimestamp()
            }).catch(e => console.warn("Failed to save admin list:", e));
          }

          setProfile({ uid: firebaseUser.uid, ...newProfile } as UserProfile);
        }
        
        // Final state setup
        setEffectiveRole(UserRole.USER);
      } catch (err) {
        console.error("Profile Fetch Error:", err);
        setEffectiveRole(UserRole.USER);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (effectiveRole === UserRole.USER && (view === 'list' || view === 'settings')) {
      setView('form');
    }
    if (view !== 'form') {
      setEditingBiodata(null);
    }
  }, [effectiveRole, view]);

  if (loading || !effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Memuat Sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        role={profile?.role || UserRole.USER} 
        effectiveRole={effectiveRole}
        setEffectiveRole={setEffectiveRole}
        displayName={profile?.displayName} 
        onNavigate={setView}
        currentView={view}
      />
      
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${effectiveRole}`}
            initial={{ opacity: 0, x: view === 'form' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: view === 'form' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'form' ? (
              <BiodataForm 
                editingBiodata={editingBiodata} 
                onCancelEdit={() => {
                  setEditingBiodata(null);
                  setView('list');
                }} 
                onSuccess={() => {
                  if (effectiveRole === UserRole.ADMIN) {
                    setView('list');
                  }
                }}
              />
            ) : view === 'list' ? (
              <BiodataList 
                role={effectiveRole} 
                onEdit={(item) => {
                  setEditingBiodata(item);
                  setView('form');
                }}
              />
            ) : (
              <SettingsPage profile={profile} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-6 px-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
          <span>&copy; 2026 E-Biodata Pro System</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" /> System Online (Guest Mode Active)
          </span>
        </div>
      </footer>
    </div>
  );
}
