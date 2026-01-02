"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformSettingsFormProps {
  settings: Setting[];
}

export function PlatformSettingsForm({ settings }: PlatformSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Get current values
  const ticketLimitSetting = settings.find(
    (s) => s.key === "FREE_EVENT_TICKET_LIMIT"
  );
  const unlockFeeSetting = settings.find(
    (s) => s.key === "FREE_EVENT_UNLOCK_FEE"
  );

  const [ticketLimit, setTicketLimit] = useState(
    ticketLimitSetting?.value || "100"
  );
  const [unlockFee, setUnlockFee] = useState(unlockFeeSetting?.value || "2500");

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update ticket limit
      const limitResponse = await fetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "FREE_EVENT_TICKET_LIMIT",
          value: parseInt(ticketLimit),
          description: "Maximum tickets allowed for free events without unlock",
        }),
      });

      if (!limitResponse.ok) {
        throw new Error("Failed to update ticket limit");
      }

      // Update unlock fee
      const feeResponse = await fetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "FREE_EVENT_UNLOCK_FEE",
          value: parseInt(unlockFee),
          description:
            "One-time fee (in cents) to unlock unlimited tickets for free events",
        }),
      });

      if (!feeResponse.ok) {
        throw new Error("Failed to update unlock fee");
      }

      toast.success("Settings saved successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-4">Free Event Ticket Limits</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure the default ticket limit for free events and the one-time
          unlock fee that allows organizers to exceed this limit.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="ticket-limit">Free Event Ticket Limit</Label>
          <Input
            id="ticket-limit"
            type="number"
            min="1"
            max="2500"
            value={ticketLimit}
            onChange={(e) => setTicketLimit(e.target.value)}
            className="max-w-xs"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Maximum tickets allowed for free events before requiring unlock fee.
            Must be between 1 and 2,500 (system limit).
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="unlock-fee">Unlock Fee (cents, excl. VAT)</Label>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              id="unlock-fee"
              type="number"
              min="0"
              value={unlockFee}
              onChange={(e) => setUnlockFee(e.target.value)}
            />
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              <div>= €{(parseInt(unlockFee) / 100).toFixed(2)} excl. VAT</div>
              <div className="text-xs">
                (€{(Math.round(parseInt(unlockFee) * 1.21) / 100).toFixed(2)}{" "}
                incl. 21% VAT)
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            One-time fee for organizers to unlock unlimited tickets (up to 2,500
            system limit). Example: 2500 = €25.00 excl. VAT (€30.25 incl. VAT)
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            System Hard Limit
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            All events have a maximum limit of <strong>2,500 tickets</strong> to
            ensure system stability. This cannot be changed and applies
            regardless of event type or unlock status.
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
