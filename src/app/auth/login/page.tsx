"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getAppUrl } from "@/lib/env";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, AlertCircle } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

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
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mb-6">
            <Mail className="w-16 h-16 mx-auto text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Check je e-mail</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            We hebben een magic link naar <strong>{email}</strong> gestuurd.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Klik op de link in de e-mail om in te loggen. De link is 1 uur
            geldig.
          </p>
          <Button variant="ghost" onClick={() => setSuccess(false)}>
            Ander e-mailadres gebruiken
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Welkom bij Entro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Vul je e-mailadres in om te beginnen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="jouw@email.nl"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Magic link versturen..." : "Doorgaan met e-mail"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Je ontvangt een e-mail met een beveiligde inloglink.{" "}
            <span className="font-medium">Geen wachtwoord nodig!</span>
          </p>
        </div>
      </CardContent>
    </Card>
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
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
      <div className="text-center mb-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mt-2 animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}
