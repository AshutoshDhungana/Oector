import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import svgPaths from '../../../imports/Login-1/svg-9kf17w2evu';

function OectorLogoMark() {
  return (
    <div className="h-[40px] relative shrink-0" style={{ width: '42.197px' }}>
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 42.1965 40">
        <path clipRule="evenodd" d={svgPaths.p3fbb0c00} fill="white" fillRule="evenodd" />
        <path d={svgPaths.p11d3d800} fill="white" />
      </svg>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-[20px] h-[22px]" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

type FieldError = { name?: string; email?: string; password?: string; confirmPassword?: string };

export default function SignupPage({ onSuccess }: { onSuccess?: (name: string, email: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): FieldError {
    const errs: FieldError = {};
    if (!name.trim()) {
      errs.name = 'Full name is required.';
    }
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitted(true);
      onSuccess?.(name, email);
    }
  }

  function clearError(field: keyof FieldError) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  const inputStyle = {
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    fontWeight: 300,
    fontSize: '16px',
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      {/* Left panel — form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative">
        <div
          className="absolute inset-4 lg:inset-8 rounded-2xl"
          style={{ background: 'rgba(26,26,26,0.8)', border: '0.5px solid rgba(255,255,255,0.2)' }}
        />

        <div className="relative z-10 w-full max-w-[480px] flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <OectorLogoMark />
            <span
              className="text-white"
              style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 500, fontSize: '32px' }}
            >
              Oector
            </span>
          </div>

          {/* Hero text */}
          <div className="flex flex-col gap-3 text-center">
            <h1
              className="text-white"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '44px', lineHeight: 1.2 }}
            >
              Create your account
            </h1>
            <p
              className="text-white/75"
              style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 300, fontSize: '16px', lineHeight: 1.5 }}
            >
              Sign up to start automating your compliance
            </p>
          </div>

          {submitted ? (
            <div
              className="bg-[#06b6d4]/10 rounded-2xl p-6 text-center"
              style={{ border: '1px solid #06b6d4' }}
            >
              <p className="text-[#06b6d4] text-[16px]" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                Account created successfully! Welcome to Oector.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="bg-white h-[56px] rounded-full flex items-center gap-3 px-5"
                  style={{ outline: errors.name ? '2px solid #EF4444' : 'none', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <User className="w-5 h-5 text-[#1A1A1A]/90 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError('name'); }}
                    placeholder="Full name"
                    className="flex-1 bg-transparent outline-none text-[#1a1a1a] placeholder-[#1a1a1a]/65 min-w-0"
                    style={inputStyle}
                  />
                </div>
                {errors.name && (
                  <p className="text-[#EF4444] text-[13px] pl-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="bg-white h-[56px] rounded-full flex items-center gap-3 px-5"
                  style={{ outline: errors.email ? '2px solid #EF4444' : 'none', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <Mail className="w-5 h-5 text-[#1A1A1A]/90 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                    placeholder="Email address"
                    className="flex-1 bg-transparent outline-none text-[#1a1a1a] placeholder-[#1a1a1a]/65 min-w-0"
                    style={inputStyle}
                  />
                </div>
                {errors.email && (
                  <p className="text-[#EF4444] text-[13px] pl-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="bg-white h-[56px] rounded-full flex items-center gap-3 px-5"
                  style={{ outline: errors.password ? '2px solid #EF4444' : 'none', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <Lock className="w-5 h-5 text-[#1A1A1A]/90 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                    placeholder="Password"
                    className="flex-1 bg-transparent outline-none text-[#1a1a1a] placeholder-[#1a1a1a]/65 min-w-0"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-[#1A1A1A]/75 hover:text-[#1A1A1A] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[#EF4444] text-[13px] pl-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="bg-white h-[56px] rounded-full flex items-center gap-3 px-5"
                  style={{ outline: errors.confirmPassword ? '2px solid #EF4444' : 'none', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <Lock className="w-5 h-5 text-[#1A1A1A]/90 shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                    placeholder="Confirm password"
                    className="flex-1 bg-transparent outline-none text-[#1a1a1a] placeholder-[#1a1a1a]/65 min-w-0"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="shrink-0 text-[#1A1A1A]/75 hover:text-[#1A1A1A] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[#EF4444] text-[13px] pl-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="bg-black h-[56px] rounded-full text-white text-[16px] hover:bg-black/80 transition-colors mt-2"
                style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 500 }}
              >
                Create Account
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/25" />
            <span
              className="text-white/60 text-[12px] shrink-0"
              style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 400 }}
            >
              or
            </span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="bg-white h-[61px] rounded-[50px] flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid #e0e0e9', boxShadow: '0px 18px 15px rgba(131,119,198,0.11)' }}
            >
              <GoogleLogo />
              <span
                className="text-[#1d1c2b] text-[16px]"
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
              >
                Sign up with Google
              </span>
            </button>
            <button
              type="button"
              className="bg-white h-[61px] rounded-[50px] flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid #e0e0e9', boxShadow: '0px 18px 15px rgba(131,119,198,0.11)' }}
            >
              <AppleLogo />
              <span
                className="text-[#1d1c2b] text-[16px]"
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
              >
                Sign up with Apple
              </span>
            </button>
          </div>

          {/* Sign in link */}
          <p
            className="text-white/75 text-[14px] text-center"
            style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 400 }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-white hover:underline"
              style={{ fontWeight: 500 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — brand text */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 text-white">
        <div className="flex flex-col gap-6">
          <h2
            className="text-white"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: 'clamp(52px, 5vw, 84px)',
              lineHeight: 'normal',
            }}
          >
            Transform Trust
            <br />
            into a
            <br />
            <em style={{ fontStyle: 'italic' }}>Superpower.</em>
          </h2>
          <p
            className="text-white text-[24px] max-w-[481px]"
            style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 300 }}
          >
            Join thousands of teams shipping faster with automated SOC 2, ISO 27001, and security reviews.
          </p>
        </div>
      </div>
    </div>
  );
}
