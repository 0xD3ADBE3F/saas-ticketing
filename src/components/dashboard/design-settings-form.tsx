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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import {
  updateThemeAction,
  deleteLogoAction,
} from "@/app/(dashboard)/dashboard/settings/design/actions";
import { toast } from "sonner";
import type { PortalTheme } from "@/generated/prisma";

type Props = {
  organizationId: string;
  initialLogoUrl: string | null;
  initialTheme: PortalTheme;
};

export function DesignSettingsForm({
  organizationId,
  initialLogoUrl,
  initialTheme,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [theme, setTheme] = useState(initialTheme);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    } catch (error) {
      toast.error("Verwijderen mislukt", {
        description: "Probeer het opnieuw",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleThemeChange(newTheme: PortalTheme) {
    const oldTheme = theme;
    setTheme(newTheme);

    try {
      await updateThemeAction(newTheme);

      toast.success("Thema bijgewerkt", {
        description: `Je ticketportaal gebruikt nu het ${
          newTheme === "LIGHT" ? "lichte" : "donkere"
        } thema`,
      });
    } catch (error) {
      toast.error("Update mislukt", {
        description: "Probeer het opnieuw",
      });
      setTheme(oldTheme); // Revert on error
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

      {/* Theme Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Thema</CardTitle>
          <CardDescription>
            Kies het thema voor je ticketbestelportaal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Thema voorkeur</Label>
            <Select
              value={theme}
              onValueChange={(v) => handleThemeChange(v as PortalTheme)}
            >
              <SelectTrigger id="theme" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">Licht</SelectItem>
                <SelectItem value="DARK">Donker</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Dit thema wordt toegepast op je publieke ticketpagina&apos;s
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
