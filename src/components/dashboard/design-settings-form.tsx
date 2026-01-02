"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import {
  updateWebsiteUrlAction,
  updateTicketAvailabilityAction,
  updatePaymentTimeoutAction,
  deleteLogoAction,
} from "@/app/(dashboard)/dashboard/settings/design/actions";
import { toast } from "sonner";

type Props = {
  initialLogoUrl: string | null;
  initialWebsiteUrl: string | null;
  initialShowTicketAvailability: boolean;
  initialPaymentTimeoutMinutes: number;
};

export function DesignSettingsForm({
  initialLogoUrl,
  initialWebsiteUrl,
  initialShowTicketAvailability,
  initialPaymentTimeoutMinutes,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? "");
  const [showTicketAvailability, setShowTicketAvailability] = useState(
    initialShowTicketAvailability
  );
  const [paymentTimeoutMinutes, setPaymentTimeoutMinutes] = useState(
    initialPaymentTimeoutMinutes
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingTimeout, setSavingTimeout] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again if needed
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/design/logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload mislukt");
      }

      const { url } = await res.json();
      setLogoUrl(url);

      toast.success("Logo geüpload", {
        description: "Je logo wordt nu getoond op je ticketportaal",
      });
    } catch (error) {
      toast.error("Upload mislukt", {
        description:
          error instanceof Error ? error.message : "Probeer het opnieuw",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteLogo() {
    if (!logoUrl) return;

    setDeleting(true);
    try {
      await deleteLogoAction(logoUrl);
      setLogoUrl(null);

      toast.success("Logo verwijderd", {
        description: "Het standaard Entro logo wordt nu getoond",
      });
    } catch {
      toast.error("Verwijderen mislukt", {
        description: "Probeer het opnieuw",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleWebsiteUrlSave() {
    setSavingUrl(true);
    try {
      await updateWebsiteUrlAction(websiteUrl);

      toast.success("Website URL opgeslagen", {
        description: "Je website link wordt nu getoond op je ticketportaal",
      });
    } catch {
      toast.error("Opslaan mislukt", {
        description: "Probeer het opnieuw",
      });
    } finally {
      setSavingUrl(false);
    }
  }

  async function handleTicketAvailabilityChange(checked: boolean) {
    const oldValue = showTicketAvailability;
    setShowTicketAvailability(checked);
    setSavingAvailability(true);

    try {
      await updateTicketAvailabilityAction(checked);

      toast.success("Instelling bijgewerkt", {
        description: checked
          ? "Ticketbeschikbaarheid wordt nu getoond"
          : "Ticketbeschikbaarheid wordt niet meer getoond",
      });
    } catch {
      toast.error("Update mislukt", {
        description: "Probeer het opnieuw",
      });
      setShowTicketAvailability(oldValue); // Revert on error
    } finally {
      setSavingAvailability(false);
    }
  }

  async function handlePaymentTimeoutSave() {
    // Validate range
    if (paymentTimeoutMinutes < 5 || paymentTimeoutMinutes > 30) {
      toast.error("Ongeldige waarde", {
        description: "Kies een waarde tussen 5 en 30 minuten",
      });
      return;
    }

    setSavingTimeout(true);
    try {
      await updatePaymentTimeoutAction(paymentTimeoutMinutes);

      toast.success("Reserveringstijd opgeslagen", {
        description: `Nieuwe bestellingen hebben ${paymentTimeoutMinutes} minuten betaaltijd`,
      });
    } catch {
      toast.error("Opslaan mislukt", {
        description: "Probeer het opnieuw",
      });
    } finally {
      setSavingTimeout(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload je organisatie logo (PNG, JPG of SVG, max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-sm h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="max-w-full max-h-full object-contain p-4"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    disabled={uploading || deleting}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Vervang logo
                    </span>
                  </Button>
                </Label>
                <Button
                  variant="destructive"
                  onClick={handleDeleteLogo}
                  disabled={uploading || deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Verwijder
                </Button>
              </div>
            </div>
          ) : (
            <Label
              htmlFor="logo-upload"
              className="flex flex-col items-center justify-center w-full max-w-sm h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <>
                    <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploaden...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Klik om te uploaden</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG of SVG (max 2MB)
                    </p>
                  </>
                )}
              </div>
            </Label>
          )}

          <input
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading || deleting}
          />
        </CardContent>
      </Card>

      {/* Website URL */}
      <Card>
        <CardHeader>
          <CardTitle>Website URL</CardTitle>
          <CardDescription>
            Link naar je organisatie website (wordt getoond op ticketportaal)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://jouworganisatie.nl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleWebsiteUrlSave} disabled={savingUrl}>
                {savingUrl ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Opslaan
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Een link naar je website wordt getoond op je publieke
              ticketpagina&apos;s
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Availability Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Ticketbeschikbaarheid</CardTitle>
          <CardDescription>
            Toon hoeveel tickets er nog beschikbaar zijn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-availability">Toon beschikbaarheid</Label>
              <p className="text-sm text-muted-foreground">
                Laat bezoekers zien hoeveel tickets er nog beschikbaar zijn
              </p>
            </div>
            <Switch
              id="show-availability"
              checked={showTicketAvailability}
              onCheckedChange={handleTicketAvailabilityChange}
              disabled={savingAvailability}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Timeout Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Betaalreservering</CardTitle>
          <CardDescription>
            Hoe lang blijven tickets gereserveerd tijdens het afrekenproces?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-timeout">
                Reserveringstijd (minuten)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="payment-timeout"
                  type="number"
                  min={5}
                  max={30}
                  value={paymentTimeoutMinutes}
                  onChange={(e) =>
                    setPaymentTimeoutMinutes(parseInt(e.target.value) || 10)
                  }
                  className="w-32"
                />
                <Button
                  onClick={handlePaymentTimeoutSave}
                  disabled={savingTimeout}
                >
                  {savingTimeout ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Opslaan
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Standaard: 10 minuten. Kies een waarde tussen 5 en 30 minuten.
                Langere tijden geven kopers meer tijd, maar kunnen leiden tot
                geblokkeerde voorraad bij drukke evenementen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
