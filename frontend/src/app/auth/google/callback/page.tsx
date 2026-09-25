"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Heart, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api'

// Backend error keys mapped to something a user can actually act on,
// instead of one generic "something went wrong"
const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "You cancelled the Google sign-in.",
  invalid_request: "That sign-in link was malformed. Please try again.",
  invalid_state: "This sign-in request expired or was tampered with. Please try again.",
  token_exchange_failed: "Google couldn't confirm your sign-in. Please try again.",
  invalid_id_token: "Google's response couldn't be verified. Please try again.",
  email_not_verified: "Your Google account's email isn't verified, so we can't use it to sign in.",
  account_unavailable: "This account isn't available. Contact support if this keeps happening.",
  server_error: "Something went wrong on our end. Please try again in a moment.",
}

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const exchangeStarted = useRef(false)

  useEffect(() => {
    const code = searchParams.get("code")
    const errorKey = searchParams.get("error")

    if (errorKey) {
      setError(ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.server_error)
      return
    }

    if (!code) {
      setError("No sign-in code was provided.")
      return
    }

    // The code is single-use and short-lived - React strict mode runs effects
    // twice in dev, which would burn it on the first call and fail the second
    if (exchangeStarted.current) return
    exchangeStarted.current = true

    const exchange = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.message || ERROR_MESSAGES.server_error)
          return
        }

        await refreshUser()
        router.push(data.user?.role === "Admin" ? "/admin" : "/")
      } catch {
        setError(ERROR_MESSAGES.server_error)
      }
    }

    exchange()
  }, [searchParams, router, refreshUser])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-purple-900/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-purple-400/20 text-center">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-purple-200 mb-2">Sign-in didn&apos;t work</h1>
            <p className="text-purple-300 mb-6">{error}</p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-500 transition-all duration-200"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-purple-200 mb-2">Signing you in...</h1>
            <div className="flex items-center justify-center gap-2 text-purple-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Confirming your Google account
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  )
}
