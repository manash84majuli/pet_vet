/**
 * Login Page
 * User authentication with email/password
 */

"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Heart,
  Shield,
  Clock,
  PawPrint,
  Stethoscope,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = searchParams.get("from") || "/profile";
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      const redirectTo = searchParams.get("from") || "/profile";
      router.refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.includes("Invalid login")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.includes("Email not confirmed")) {
        setError("Please verify your email before signing in. Check your inbox.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 flex flex-col lg:flex-row">
      {/* Left Panel - Branding (hidden on mobile, shown on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white" />
          <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-white" />
          <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-white" />
          <div className="absolute bottom-40 right-10 w-16 h-16 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full bg-white" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <PawPrint className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pet & Vet</h1>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Your pet&apos;s health,<br />
            our priority.
          </h2>

          <p className="text-orange-100 text-lg mb-12 max-w-md">
            Complete veterinary care, medications, and pet supplies — all in one place.
          </p>

          {/* Features */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Expert Consultations</p>
                <p className="text-orange-100 text-sm">Book appointments with qualified veterinarians</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Pet Pharmacy & Shop</p>
                <p className="text-orange-100 text-sm">Medicines, food, and supplies delivered to your door</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Complete Pet Profiles</p>
                <p className="text-orange-100 text-sm">Track health records, vaccinations, and milestones</p>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-8 border-t border-white/20 flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-200" />
              <span className="text-sm text-orange-100">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-200" />
              <span className="text-sm text-orange-100">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12">
        <div className={`w-full max-w-md transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/25 mb-4">
              <PawPrint className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pet & Vet Portal</h1>
            <p className="text-gray-500 mt-1 text-sm">Your pet&apos;s care companion</p>
          </div>

          {/* Welcome Text (Desktop) */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 focus:bg-white transition-all disabled:opacity-60 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/40 transition-colors"
                />
                <span className="text-sm text-gray-600">Keep me signed in</span>
              </label>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-orange-500/25 disabled:active:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sign Up Link */}
          <p className="text-center mt-6 text-gray-500 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Create account
            </Link>
          </p>

          {/* Mobile Features */}
          <div className="lg:hidden mt-10 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-2">
                <Stethoscope className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium text-center">Vet Care</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium text-center">Pet Shop</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                <Heart className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium text-center">Pet Profiles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center animate-pulse">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
