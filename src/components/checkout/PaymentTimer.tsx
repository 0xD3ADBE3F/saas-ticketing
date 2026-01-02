"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentTimerProps {
  expiresAt: Date | string;
  eventSlug: string;
}

export function PaymentTimer({ expiresAt, eventSlug }: PaymentTimerProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Calculate initial time remaining
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const initialRemaining = Math.max(0, expiryTime - now);

    // Check if already expired on mount
    if (initialRemaining === 0) {
      setIsExpired(true);
      setTimeRemaining(0);
      // Redirect after showing expired message
      const redirectTimer = setTimeout(() => {
        router.push(`/e/${eventSlug}?error=payment-expired`);
      }, 3000);
      return () => clearTimeout(redirectTimer);
    }

    setTimeRemaining(initialRemaining);

    // Update every second
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);

      if (remaining === 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        clearInterval(interval);
        // Redirect to event page with error
        setTimeout(() => {
          router.push(`/e/${eventSlug}?error=payment-expired`);
        }, 3000);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, eventSlug, router]);

  // Format milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isExpired) {
    return (
      <Alert variant="destructive" className="animate-fade-in">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          <span className="font-semibold block mb-1">Reservering verlopen</span>
          <p className="text-sm">
            Je tickets zijn vrijgegeven. Je wordt doorgestuurd naar het
            evenement...
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (timeRemaining === null) {
    return null;
  }

  const isUrgent = timeRemaining < 2 * 60 * 1000; // Less than 2 minutes

  return (
    <Alert
      variant={isUrgent ? "destructive" : "default"}
      className={isUrgent ? "animate-pulse" : ""}
    >
      <Clock className="h-5 w-5" />
      <AlertDescription>
        <span className="font-semibold block mb-1">
          Je tickets zijn gereserveerd voor:
        </span>
        <p className="text-2xl font-mono font-bold">
          {formatTime(timeRemaining)}
        </p>
        <p className="text-sm mt-2">
          {isUrgent
            ? "⚠️ Betaal snel om je tickets te behouden!"
            : "Rond je betaling af binnen deze tijd om je reservering te behouden."}
        </p>
      </AlertDescription>
    </Alert>
  );
}
