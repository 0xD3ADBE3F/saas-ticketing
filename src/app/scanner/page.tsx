"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ScanLine,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ScannerLoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear error when user edits the code
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [code]); // Only depend on code, not error

  // Auto-submit after delay when 6 characters are entered
  useEffect(() => {
    // Clear any existing timer
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    // If code is 6 characters and not already loading/success/error, schedule auto-submit
    if (code.length === 6 && !loading && !success && !error) {
      autoSubmitTimerRef.current = setTimeout(() => {
        // Trigger form submit programmatically
        const form = inputRef.current?.form;
        if (form) {
          form.requestSubmit();
        }
      }, 500); // 500ms delay for better UX
    }

    // Cleanup timer on unmount
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, [code, loading, success, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Voer een 6-cijferige code in");
      return;
    }

    // Prevent submission if already showing an error (until user edits code)
    if (error) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scanner/auth/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ongeldige code");
        setLoading(false);
        // Shake animation on error
        inputRef.current?.classList.add("animate-shake");
        setTimeout(() => {
          inputRef.current?.classList.remove("animate-shake");
        }, 500);
        return;
      }

      // Show success state
      setSuccess(true);

      // Store session in localStorage
      localStorage.setItem("scanner_token", data.token);
      localStorage.setItem("scanner_terminal", JSON.stringify(data.terminal));
      localStorage.setItem("scanner_org", JSON.stringify(data.organization));
      if (data.event) {
        localStorage.setItem("scanner_event", JSON.stringify(data.event));
      }

      // Redirect after brief success animation
      setTimeout(() => {
        if (data.event) {
          router.push(`/scanner/scan/${data.event.id}`);
        } else {
          router.push("/scanner/events");
        }
      }, 800);
    } catch {
      setError("Verbindingsfout - probeer opnieuw");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setCode(value);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
            <ScanLine className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Entro Scanner
          </h1>
          <p className="text-gray-400">
            Veilig toegang tot je scanner terminal
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm shadow-2xl animate-slide-up">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Code Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="code"
                  className="text-sm font-medium text-gray-300 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Terminal Code
                </Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    maxLength={6}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={loading || success}
                    className="text-center text-3xl sm:text-4xl tracking-[0.5em] py-6 sm:py-8 placeholder:tracking-[0.25em] bg-gray-950/50 border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-white placeholder:text-gray-600"
                  />
                  {success && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-6 h-6 text-green-500 animate-scale-in" />
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />6 tekens (3 letters + 3 cijfers)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <Alert
                  variant="destructive"
                  className="animate-shake border-red-900 bg-red-950/50"
                >
                  <AlertDescription className="text-center text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || code.length !== 6 || success}
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Inloggen...
                  </span>
                ) : success ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Gelukt!
                  </span>
                ) : (
                  "Inloggen"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <Card className="bg-gray-900/30 border-gray-800/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                💡 Vraag de terminal code aan bij een administrator van je
                organisatie. Deze code geeft toegang tot de scanner
                functionaliteit.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Entro Ticketing Platform • Scanner Terminal</p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
