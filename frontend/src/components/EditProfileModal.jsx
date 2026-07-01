import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, User } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function EditProfileModal({ onClose }) {
  const { user, fetchUser } = useAuth();
  
  const [fullName, setFullName] = useState(user?.user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.user?.profile_picture || null);
  const [preview, setPreview] = useState(user?.user?.profile_picture || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

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
    try {
      await api.put('/api/auth/me', {
        full_name: fullName,
        profile_picture: profilePicture
      });
      await fetchUser(); // Refresh user data globally
      onClose();
    } catch (err) {
      console.error("Failed to update profile", err);
      setError(getErrorMessage(err, "Failed to update profile. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="glass-panel p-8 rounded-3xl border border-brand-border shadow-2xl max-w-md w-full relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-brand-muted hover:text-brand-text transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h3 className="text-2xl font-bold mb-6 text-brand-text">Edit Profile</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-primary/30 bg-brand-surface flex items-center justify-center shadow-md">
              {preview ? (
                <img src={preview} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-brand-muted" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-brand-muted font-medium">Click to upload photo</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-muted mb-2">Display Name</label>
          <input 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-brand-text outline-none focus:border-brand-primary transition-colors"
            placeholder="Enter your name..."
          />
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-md flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
        </button>
      </motion.div>
    </div>
  );
}
