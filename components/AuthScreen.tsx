
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle, Mail } from 'lucide-react';
import { signInUser, signUpUser, resetPasswordForEmail } from '../services/laravelAuthService';

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Clear fields when switching modes
  useEffect(() => {
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
    setResetSent(false);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let result;
    if (mode === 'signup') {
      result = await signUpUser(email, password, name);
    } else if (mode === 'login') {
      result = await signInUser(email, password);
    } else if (mode === 'forgot-password') {
      result = await resetPasswordForEmail(email);
    }

    setLoading(false);

    if (result?.error) {
      const errorMessage = result.error.message || 'An error occurred';
      console.error('[AuthScreen] Error:', errorMessage);
      setError(errorMessage);
    } else {
       if (mode === 'forgot-password') {
         setResetSent(true);
       } else if (result?.data?.user) {
         // Success for login/signup
         onSuccess();
       }
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setLoading(true);
    
    // Social login not yet implemented with Laravel
    // TODO: Implement OAuth with Laravel Socialite
    setLoading(false);
    setError(`Social login with ${provider} is not yet available. Please use email/password.`);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F8FA] relative overflow-hidden font-sans text-[#111]">
      
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.4]" 
        style={{ 
            backgroundImage: 'linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
        }}
      ></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-[24px] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] border border-gray-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Back Button */}
        <button 
          onClick={mode === 'forgot-password' ? () => setMode('login') : onBack}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
        >
           <ArrowLeft size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8 mt-4">
           <h2 className="text-[24px] font-bold tracking-tight mb-2">
             {mode === 'login' ? 'Welcome Back' : (mode === 'signup' ? 'Create Account' : 'Reset Password')}
           </h2>
           <p className="text-[14px] text-gray-500">
             {mode === 'login' ? 'Enter your details to access Tyna.' : (mode === 'signup' ? 'Sign up to start capturing your meetings.' : 'Enter your email to receive instructions.')}
           </p>
        </div>

        {/* Toggle (Only for Login/Signup) */}
        {mode !== 'forgot-password' && (
          <div className="flex p-1 bg-gray-50 rounded-[12px] mb-8 border border-gray-100">
            <button 
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-[13px] font-medium rounded-[8px] transition-all duration-200 ${mode === 'login' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Log In
            </button>
            <button 
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-[13px] font-medium rounded-[8px] transition-all duration-200 ${mode === 'signup' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Reset Password Success State */}
        {mode === 'forgot-password' && resetSent ? (
           <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Mail size={32} />
              </div>
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Check your email</h3>
              <p className="text-[14px] text-gray-500 mb-8">
                We've sent a password reset link to <span className="font-medium text-gray-900">{email}</span>.
              </p>
              <button 
                 onClick={() => setMode('login')}
                 className="w-full h-[48px] bg-[#111] hover:bg-black text-white rounded-[12px] font-medium text-[14px] transition-transform active:scale-[0.98] shadow-lg shadow-gray-200"
              >
                 Back to Log In
              </button>
           </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="p-3 rounded-[10px] bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-[13px]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black/10 transition-all outline-none placeholder-gray-300 text-[14px]"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700 ml-1">Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[46px] px-4 rounded-[12px] bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black/10 transition-all outline-none placeholder-gray-300 text-[14px]"
                placeholder="name@company.com"
                required
              />
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[13px] font-medium text-gray-700">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot-password')}
                      className="text-[11px] font-medium text-gray-500 hover:text-black"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black/10 transition-all outline-none placeholder-gray-300 text-[14px]"
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-[48px] bg-[#111] hover:bg-black text-white rounded-[12px] font-medium text-[14px] transition-transform active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                  mode === 'login' ? 'Log In' : (mode === 'signup' ? 'Create Account' : 'Send Reset Link')
              )}
            </button>
          </form>
        )}

        {mode !== 'forgot-password' && (
          <>
            <div className="my-8 flex items-center gap-4">
              <div className="h-[1px] bg-gray-100 flex-1"></div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">OR</span>
              <div className="h-[1px] bg-gray-100 flex-1"></div>
            </div>

            {/* Social Buttons */}
            <div className="space-y-3">
              <button 
                type="button" 
                onClick={() => handleSocialLogin('google')}
                className="w-full h-[44px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[12px] font-medium text-[14px] transition-colors flex items-center justify-center gap-3"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialLogin('apple')}
                className="w-full h-[44px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[12px] font-medium text-[14px] transition-colors flex items-center justify-center gap-3"
              >
                <img src="https://www.svgrepo.com/show/511330/apple-173.svg" alt="Apple" className="w-5 h-5" />
                Continue with Apple
              </button>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
           {mode === 'forgot-password' ? (
              <button onClick={() => setMode('login')} className="text-[12px] text-gray-500 hover:text-black font-medium">
                 Cancel and return to Log In
              </button>
           ) : (
              <p className="text-[12px] text-gray-400">
                {mode === 'login' ? "Don't have an account yet? " : "Already have an account? "}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-black font-semibold hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
           )}
        </div>

      </div>
    </div>
  );
};