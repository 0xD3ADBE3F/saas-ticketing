"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getAppUrl } from "@/lib/env";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  async function handleSocialLogin(provider: "google" | "apple") {
    setSocialLoading(provider);
    setError(null);

    // TODO: Implement OAuth flow
    // const supabase = createSupabaseBrowserClient();
    // await supabase.auth.signInWithOAuth({ provider })

    // Simulated delay for UI demonstration
    setTimeout(() => {
      setSocialLoading(null);
      setError(
        `${provider === "google" ? "Google" : "Apple"} login wordt binnenkort toegevoegd`
      );
    }, 1500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const appUrl = getAppUrl();

    // signInWithOtp automatically creates user if they don't exist
    // No need to check - works for both login and signup!
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      setError(error.message || "Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="Entro"
            width={140}
            height={45}
            className="dark:hidden"
            priority
          />
          <Image
            src="/logo-white.png"
            alt="Entro"
            width={140}
            height={45}
            className="hidden dark:block"
            priority
          />
        </div>

        <Card className="border-2 shadow-xl shadow-blue-100/50 dark:shadow-blue-900/20">
          <CardContent className="pt-10 pb-10 px-6 md:px-10 text-center">
            <div className="mb-8 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full animate-pulse" />
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Check je inbox
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-3">
              We hebben een magic link gestuurd naar:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-8">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                {email}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-8 text-left border border-blue-100 dark:border-blue-900/30">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Volgende stappen:
              </p>
              <div className="space-y-3">
                {[
                  "Open je e-mail inbox",
                  "Klik op de beveiligde inloglink",
                  "Je wordt automatisch ingelogd",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
              <Shield className="w-4 h-4" />
              <span>
                De link is{" "}
                <strong className="text-gray-900 dark:text-white">
                  1 uur geldig
                </strong>
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => setSuccess(false)}
              className="w-full h-12 text-base font-medium"
            >
              Ander e-mailadres gebruiken
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Logo */}
      <div className="flex justify-center">
        <Image
          src="/logo.svg"
          alt="Entro"
          width={140}
          height={45}
          className="dark:hidden"
          priority
        />
        <Image
          src="/logo-white.png"
          alt="Entro"
          width={140}
          height={45}
          className="hidden dark:block"
          priority
        />
      </div>

      <Card className="border-2 shadow-xl shadow-blue-100/50 dark:shadow-blue-900/20 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <CardContent className="pt-8 pb-8 px-6 md:px-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Welkom bij Entro
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Begin binnen enkele seconden
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("google")}
              disabled={loading || socialLoading !== null}
              className="w-full h-14 text-base font-medium border-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all touch-manipulation relative overflow-hidden group"
            >
              {socialLoading === "google" ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Inloggen...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Doorgaan met Google</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("apple")}
              disabled={loading || socialLoading !== null}
              className="w-full h-14 text-base font-medium border-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all touch-manipulation relative overflow-hidden group"
            >
              {socialLoading === "apple" ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Inloggen...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Doorgaan met Apple</span>
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">
                Of met e-mail
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert
                variant="destructive"
                className="animate-in slide-in-from-top-2"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                E-mailadres
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || socialLoading !== null}
                  placeholder="jouw@email.nl"
                  className="h-14 text-base pl-12 border-2 focus-visible:ring-2 focus-visible:ring-blue-500 touch-manipulation"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || socialLoading !== null}
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 shadow-lg shadow-blue-500/30 transition-all touch-manipulation group"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Magic link versturen...
                </>
              ) : (
                <>
                  <span>Doorgaan met e-mail</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 pt-1">
                Veilig inloggen zonder wachtwoord. We sturen je een{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  beveiligde magic link
                </span>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Features */}
      <div className="grid grid-cols-1 gap-3">
        {[
          {
            icon: Check,
            color: "blue",
            title: "Direct beginnen",
            desc: "Binnen 10 minuten live",
          },
          {
            icon: Sparkles,
            color: "purple",
            title: "Alles-in-één platform",
            desc: "Tickets, betalingen & scanning",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-${feature.color}-100 dark:bg-${feature.color}-900/20 flex items-center justify-center flex-shrink-0`}
            >
              <feature.icon
                className={`w-6 h-6 text-${feature.color}-600 dark:text-${feature.color}-400`}
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {feature.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Logo skeleton */}
      <div className="flex justify-center">
        <div className="h-12 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Card skeleton */}
      <Card className="border-2 shadow-xl">
        <CardContent className="pt-8 pb-8 px-6 md:px-10">
          <div className="text-center mb-8">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-56 mx-auto mb-3" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mx-auto" />
          </div>

          {/* Social buttons skeleton */}
          <div className="space-y-3 mb-6">
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>

          {/* Divider skeleton */}
          <div className="my-8 h-px bg-gray-200 dark:bg-gray-700" />

          {/* Email form skeleton */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Features skeleton */}
      <div className="grid grid-cols-1 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
