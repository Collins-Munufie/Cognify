import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, User, Mail, ShieldCheck, Flame, Clock, Award, Loader2, LogOut } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileDrawer({ isOpen, onClose, stats }) {
  const { user, fetchUser, logout } = useAuth();
  
  const [fullName, setFullName] = useState(user?.user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.user?.profile_picture || null);
  const [preview, setPreview] = useState(user?.user?.profile_picture || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  // Sync state if user context updates
  useEffect(() => {
    if (user?.user) {
      setFullName(user.user.name || '');
      setProfilePicture(user.user.profile_picture || null);
      setPreview(user.user.profile_picture || null);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File is too large. Maximum size is 5MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await api.put('/api/auth/me', {
        full_name: fullName,
        profile_picture: profilePicture
      });
      await fetchUser(); // Refresh user data globally
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile", err);
      setError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out_forwards]"
        onClick={onClose}
      ></div>

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] z-[100] bg-brand-surface border-l border-brand-border shadow-2xl flex flex-col justify-between overflow-y-auto animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        
        {/* Banner + Header */}
        <div>
          <div className="relative h-32 bg-gradient-to-r from-brand-primary to-orange-600 flex items-center justify-between px-6">
            <h3 className="text-2xl font-black text-white tracking-tight">Your Profile</h3>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar upload overlap */}
            <div className="flex justify-between items-end -mt-10 mb-6">
              <div 
                className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-4 border-brand-surface bg-brand-bg flex items-center justify-center shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-brand-muted" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex flex-col items-end mb-2">
                <span className="text-sm font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4" /> Pro Member
                </span>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs font-bold">
                ✓ Profile updated successfully!
              </div>
            )}

            {/* Editable Profile Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-brand-muted mb-2">Display Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-brand-text font-bold outline-none focus:border-brand-primary transition-colors pr-12"
                    placeholder="Enter display name..."
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-brand-muted mb-2">Email Address</label>
                <div className="relative opacity-60">
                  <input 
                    type="text" 
                    value={user?.user?.email || user?.email || ''} 
                    disabled
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-brand-text font-bold outline-none cursor-not-allowed pr-12"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full mt-6 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,130,67,0.3)] flex justify-center items-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4"/> Save Profile</>}
            </button>

            {/* Separator */}
            <div className="w-full h-[1px] bg-brand-border/60 my-6"></div>

            {/* Profile Statistics Grid */}
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-muted mb-4">Learning Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-brand-border bg-brand-bg/50">
                <p className="text-brand-muted text-xs font-medium mb-1.5 flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Current Streak</p>
                <h5 className="text-xl font-black">{stats?.streak || 0} <span className="text-xs font-normal text-brand-muted">days</span></h5>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-brand-border bg-brand-bg/50">
                <p className="text-brand-muted text-xs font-medium mb-1.5 flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-primary" /> Study Time</p>
                <h5 className="text-xl font-black">{stats?.timeSpent || 0} <span className="text-xs font-normal text-brand-muted">mins</span></h5>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-brand-border bg-brand-bg/50">
                <p className="text-brand-muted text-xs font-medium mb-1.5 flex items-center gap-1.5"><Award className="w-4 h-4 text-green-500" /> Total Sets</p>
                <h5 className="text-xl font-black">{stats?.uploaded || 0} <span className="text-xs font-normal text-brand-muted">sets</span></h5>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-brand-border bg-brand-bg/50">
                <p className="text-brand-muted text-xs font-medium mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-500" /> Quiz Accuracy</p>
                <h5 className="text-xl font-black text-brand-primary">{stats?.sessions || 0}%</h5>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-brand-border bg-brand-bg/50 flex gap-4">
          <button 
            onClick={logout} 
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-black transition-all flex justify-center items-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Logout Account
          </button>
        </div>

      </div>
    </>
  );
}
