"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Unlock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface UnlockTicketsModalProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlockFeeAmount: number; // in cents
  currentLimit: number;
}

export function UnlockTicketsModal({
  eventId,
  open,
  onOpenChange,
  unlockFeeAmount,
  currentLimit,
}: UnlockTicketsModalProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingComplete, setBillingComplete] = useState<boolean | null>(null);
  const [isCheckingBilling, setIsCheckingBilling] = useState(true);

  // Check billing status when modal opens
  useEffect(() => {
    if (open) {
      checkBillingStatus();
    }
  }, [open]);

  const checkBillingStatus = async () => {
    setIsCheckingBilling(true);
    try {
      const response = await fetch("/api/organization/billing-status");
      const data = await response.json();
      setBillingComplete(data.complete === true);
    } catch (error) {
      console.error("Failed to check billing status:", error);
      setBillingComplete(false);
    } finally {
      setIsCheckingBilling(false);
    }
  };

  const handleUnlock = async () => {
    setIsProcessing(true);
    try {
      // Generate idempotency key
      const idempotencyKey = `unlock-${eventId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      const response = await fetch(`/api/events/${eventId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          redirectUrl: `${window.location.origin}/dashboard/events/${eventId}?unlocked=success`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create unlock payment");
      }

      // Redirect to Mollie payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.error(error.message || "Kon ontgrendeling niet starten");
      setIsProcessing(false);
    }
  };

  // unlockFeeAmount is exclusive of VAT - calculate inclusive amount (add 21% VAT)
  const unlockFeeInclVAT = Math.round(unlockFeeAmount * 1.21);
  const unlockFeeEuros = (unlockFeeInclVAT / 100).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-blue-600" />
            Onbeperkte tickets ontgrendelen
          </DialogTitle>
          <DialogDescription>
            Betaal eenmalig om meer dan {currentLimit} tickets te kunnen
            verkopen voor dit gratis evenement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Huidige limiet:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {currentLimit} tickets
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Na ontgrendeling:
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                2.500 tickets (systeemmaximum)
              </span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Eenmalige ontgrendelingskosten:
              </span>
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                €{unlockFeeEuros}
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Inclusief BTW. Betaling via iDEAL.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Let op:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Deze betaling is per evenement</li>
              <li>Het systeemmaximum van 2.500 tickets blijft gelden</li>
              <li>
                Na betaling kun je direct tickettypes met hogere capaciteit
                aanmaken
              </li>
            </ul>
          </div>

          {billingComplete === false && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                    Factuurgegevens ontbreken
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Om een factuur te ontvangen moet je eerst je factuuradres
                    invullen in de organisatie-instellingen.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Annuleren
          </Button>

          {isCheckingBilling ? (
            <Button disabled className="bg-gray-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Controleren...
            </Button>
          ) : billingComplete === false ? (
            <div className="flex flex-col gap-2 items-end">
              <Button
                onClick={handleUnlock}
                disabled={true}
                className="bg-gray-400 cursor-not-allowed"
                title="Vul eerst je factuurgegevens in"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Betaal €{unlockFeeEuros}
              </Button>
              <Link href="/dashboard/settings" className="w-full">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700 w-full"
                >
                  Factuurgegevens invullen →
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              onClick={handleUnlock}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Betaal €{unlockFeeEuros}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
