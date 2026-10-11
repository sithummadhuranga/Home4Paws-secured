"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Heart, ArrowLeft, Loader2, Mail, Lock, Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { toast } from "sonner"

export default function LoginPage() {
  const { login, isLoading } = useAuth() // ✅ Changed from _isLoading to isLoading
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    try {
      await login(formData.email, formData.password, formData.rememberMe)
      toast.success("Welcome back!")
    } catch (error) {
      console.error("Login error:", error)
      const errorMessage = error instanceof Error ? error.message : "Invalid email or password. Please try again.";
      setError(errorMessage)
    }
  }, [formData, login])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (error) setError("")
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-purple-900/10 flex">
      {/* Left Side - Background */}
      <div className="hidden lg:flex lg:w-1/2 relative min-h-screen">
        <div className="relative w-full h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20">
          {/* Fallback gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-indigo-600/10" />
          
          {/* Content overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/80 max-w-md px-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Welcome Back to Home4Paws</h2>
              <p className="text-lg text-white/70">
                Continue your journey to find the perfect companion for your family
              </p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/10 rounded-full blur-xl" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-xl" />
        </div>
      </div>

      {/* Right Side - Enhanced Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <div className="max-w-md w-full">
          {/* Back Button */}
          <Link 
            href="/" 
            className="inline-flex items-center text-purple-300 hover:text-purple-200 transition-all duration-200 mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to home
          </Link>

          {/* Form Container */}
          <div className="relative group">
            {/* Magical glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-purple-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            
            <div className="relative bg-neutral-900/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-purple-400/20">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl mb-4 shadow-lg">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-purple-200 mb-2">Welcome back! 👋</h1>
                <p className="text-purple-300 font-medium">Sign in to continue your pet adoption journey</p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className="mb-6 border-red-300/20 bg-red-900/20 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                  <AlertDescription className="text-red-300 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} method="post" className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-purple-200 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-12 bg-neutral-800/50 border-purple-400/30 text-purple-200 placeholder:text-purple-400/50 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl transition-all duration-200"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-purple-200 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="h-12 bg-neutral-800/50 border-purple-400/30 text-purple-200 placeholder:text-purple-400/50 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl pr-12 transition-all duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors duration-200 p-1 rounded-lg hover:bg-purple-500/10"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-purple-400/30 bg-neutral-800/50 text-purple-600 focus:ring-purple-400/20 focus:ring-offset-0 transition-all duration-200"
                    />
                    <span className="text-sm text-purple-300 group-hover:text-purple-200 transition-colors duration-200">
                      Remember me for 30 days
                    </span>
                  </label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.email || !formData.password}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-3" />
                      Signing you in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Heart className="w-5 h-5 mr-2" />
                      Sign In
                      <Sparkles className="w-4 h-4 ml-2 animate-pulse" />
                    </div>
                  )}
                </Button>

                {/* Demo Credentials Notice */}
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-300 text-sm text-center font-medium">
                    💡 <strong>Demo:</strong> Use any email/password to sign in
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-purple-400/20" />
                  <span className="text-purple-400/60 text-sm">or</span>
                  <div className="flex-1 h-px bg-purple-400/20" />
                </div>

                <GoogleSignInButton />
              </form>

              {/* Footer */}
              <div className="text-center mt-8 pt-6 border-t border-purple-400/20">
                <p className="text-purple-300 font-medium">
                  Don&apos;t have an account?{" "}
                  <Link 
                    href="/auth/signup" 
                    className="text-purple-400 hover:text-purple-300 font-bold transition-colors duration-200 hover:underline"
                  >
                    Sign up here →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}