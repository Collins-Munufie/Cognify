import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';
import { getErrorMessage } from '../lib/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        await register(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(getErrorMessage(err, "Authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 glass-panel rounded-3xl border border-brand-border shadow-[0_0_50px_rgba(139,92,246,0.15)] relative"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/5 to-transparent rounded-3xl pointer-events-none"></div>
            
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
           <div className="mb-4">
              <Logo size="default" showText={false} />
           </div>
           <h2 className="text-3xl font-bold text-brand-text mb-2 tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
           </h2>
        </div>

        <p className="text-brand-muted text-center mb-8">
          {isLogin ? "Enter your credentials to access your flashcards." : "Sign up to start saving your flashcard sets."}
        </p>

        {error && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
            
            {(error.includes("Connection Failed") || error.includes("reach the server")) && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-brand-muted relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
                <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                  ⚠️ Backend Connection Checklist
                </h4>
                <ul className="list-decimal pl-4 space-y-1.5">
                  <li>
                    <strong>Start the Server:</strong> Verify you ran <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">uvicorn main:app --reload</code> in the <code className="bg-black/30 px-1.5 py-0.5 rounded">backend</code> directory.
                  </li>
                  <li>
                    <strong>Verify Endpoint URL:</strong> Ensure the backend is running at <code className="text-amber-300">http://127.0.0.1:8000</code> (or check your custom <code className="text-amber-300">VITE_API_BASE_URL</code> config).
                  </li>
                  {error.includes("Mixed Content") && (
                    <li className="text-red-400 font-semibold bg-red-950/20 p-2 rounded-lg border border-red-500/10">
                      <strong>Mixed Content Block:</strong> Your website is loaded over HTTPS (Vercel), but trying to access an insecure HTTP API. Secure pages cannot access insecure APIs unless run locally (e.g. run frontend locally via npm).
                    </li>
                  )}
                  <li>
                    <strong>Check CORS / logs:</strong> Open browser developer tools (F12) Console tab to inspect specific CORS or connection refused errors.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-brand-bg text-brand-text border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-brand-bg text-brand-text border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-brand-muted hover:text-brand-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

