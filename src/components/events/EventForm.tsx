"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Event, VatRate } from "@/generated/prisma";
import { toDateTimeLocalValue } from "@/lib/date";
import { VAT_RATE_LABELS } from "@/server/lib/vat";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  Lock,
  Check,
  X,
  Loader2,
  Link2,
  Sparkles,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
import { GoogleMapsLocationPicker } from "@/components/GoogleMapsLocationPicker";
import { generateSlug } from "@/lib/slug";
import { UnlockTicketsModal } from "./UnlockTicketsModal";
import { FreeEventLimitInfo } from "./FreeEventLimitInfo";
import { getRandomEventPlaceholder } from "@/lib/placeholders";
import * as Accordion from "@radix-ui/react-accordion";

interface EventFormProps {
  event?: Event;
  mode: "create" | "edit";
  organizationId: string;
  organizationSlug: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  location: string;
  locationDescription: string;
  latitude: number | null;
  longitude: number | null;
  heroImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  isPaid: boolean;
  vatRate: VatRate;
  passPaymentFeesToBuyer: boolean;
}

export function EventForm({
  event,
  mode,
  organizationId,
  organizationSlug,
}: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  // Unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockInfo, setUnlockInfo] = useState<{
    freeEventLimit: number;
    unlockFee: number;
    isUnlocked: boolean;
  } | null>(null);

  // Slug state
  const [slugAvailability, setSlugAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    error: string | null;
  }>({ checking: false, available: null, error: null });
  const [canChangeSlug, setCanChangeSlug] = useState<{
    allowed: boolean;
    reason?: string;
  }>({ allowed: true });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [titlePlaceholder, setTitlePlaceholder] = useState(() =>
    getRandomEventPlaceholder()
  );
  const [slugPlaceholder, setSlugPlaceholder] = useState(() =>
    generateSlug(getRandomEventPlaceholder())
  );

  // Rotate placeholder every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newPlaceholder = getRandomEventPlaceholder();
      setTitlePlaceholder(newPlaceholder);
      setSlugPlaceholder(generateSlug(newPlaceholder));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Default to tomorrow 20:00 - 23:00 for new events
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(20, 0, 0, 0);
    return toDateTimeLocalValue(date);
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(23, 0, 0, 0);
    return toDateTimeLocalValue(date);
  };

  const [formData, setFormData] = useState<FormData>({
    title: event?.title || "",
    slug: event?.slug || "",
    description: event?.description || "",
    location: event?.location || "",
    locationDescription: event?.locationDescription || "",
    latitude: event?.latitude ?? null,
    longitude: event?.longitude ?? null,
    heroImageUrl: event?.heroImageUrl ?? null,
    startsAt: event?.startsAt
      ? toDateTimeLocalValue(event.startsAt)
      : getDefaultStartDate(),
    endsAt: event?.endsAt
      ? toDateTimeLocalValue(event.endsAt)
      : getDefaultEndDate(),
    isPaid: event?.isPaid ?? true,
    vatRate: event?.vatRate || "STANDARD_21",
    passPaymentFeesToBuyer: event?.passPaymentFeesToBuyer ?? false,
  });

  // Hero image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const debouncedSlug = useDebounce(formData.slug, 500);

  // Fetch unlock info for free events (both create and edit modes)
  useEffect(() => {
    // For create mode, fetch default settings
    // For edit mode, fetch event-specific settings
    if (!formData.isPaid) {
      async function fetchUnlockInfo() {
        try {
          let res;
          if (mode === "edit" && event) {
            res = await fetch(`/api/events/${event.id}/check-limit`);
          } else {
            // For create mode, fetch platform settings
            res = await fetch("/api/platform/settings");
          }

          if (res.ok) {
            const data = await res.json();
            if (mode === "create") {
              // Extract settings from platform settings array
              const limitSetting = data.find(
                (s: any) => s.key === "FREE_EVENT_TICKET_LIMIT"
              );
              const feeSetting = data.find(
                (s: any) => s.key === "FREE_EVENT_UNLOCK_FEE"
              );
              setUnlockInfo({
                freeEventLimit: limitSetting
                  ? parseInt(limitSetting.value)
                  : 100,
                unlockFee: feeSetting ? parseInt(feeSetting.value) : 2500,
                isUnlocked: false,
              });
            } else {
              setUnlockInfo({
                freeEventLimit: data.freeEventLimit,
                unlockFee: data.unlockFee,
                isUnlocked: data.isUnlocked,
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch unlock info:", err);
        }
      }
      fetchUnlockInfo();
    } else {
      // Clear unlock info when switching to paid event
      setUnlockInfo(null);
    }
  }, [mode, event, formData.isPaid]);

  // Check slug changeability
  useEffect(() => {
    if (mode === "edit" && event) {
      async function checkSlugChangeability() {
        if (!event) return; // Type guard for async function
        try {
          const res = await fetch(
            `/api/events/can-change-slug?eventId=${event.id}`
          );
          if (res.ok) {
            const data = await res.json();
            setCanChangeSlug(data);
          }
        } catch (err) {
          console.error("Failed to check slug changeability:", err);
        }
      }
      checkSlugChangeability();
    }
  }, [mode, event]);

  // Check slug availability
  useEffect(() => {
    if (mode === "create" && !formData.slug) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }
    if (mode === "edit" && event && debouncedSlug === event.slug) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }
    if (!debouncedSlug || debouncedSlug.length < 3) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }

    async function checkAvailability() {
      setSlugAvailability({ checking: true, available: null, error: null });
      try {
        const params = new URLSearchParams({
          slug: debouncedSlug,
          organizationId,
        });
        if (mode === "edit" && event) params.append("eventId", event.id);
        const res = await fetch(`/api/events/check-slug?${params}`);
        const data = await res.json();
        setSlugAvailability({
          checking: false,
          available: data.available,
          error: data.error || null,
        });
      } catch (err) {
        setSlugAvailability({
          checking: false,
          available: null,
          error: "Kon beschikbaarheid niet controleren",
        });
      }
    }
    checkAvailability();
  }, [debouncedSlug, mode, event, organizationId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "radio") {
      setFormData((prev) => ({ ...prev, [name]: value === "true" }));
    } else {
      // Auto-populate slug from title
      if (name === "title" && !slugManuallyEdited) {
        const generatedSlug = generateSlug(value);
        setFormData((prev) => ({ ...prev, title: value, slug: generatedSlug }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "slug") setSlugManuallyEdited(true);
      }
    }

    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create" ? "/api/events" : `/api/events/${event?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug || undefined,
          description: formData.description || null,
          location: formData.location || null,
          locationDescription: formData.locationDescription || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: new Date(formData.endsAt).toISOString(),
          isPaid: formData.isPaid,
          vatRate: formData.vatRate,
          passPaymentFeesToBuyer: formData.passPaymentFeesToBuyer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push(`/dashboard/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je dit evenement wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push("/dashboard/events");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.length < 10) {
      setEnhancementError(
        "Voer eerst een beschrijving in (minimaal 10 karakters)"
      );
      return;
    }

    setIsEnhancing(true);
    setEnhancementError(null);

    try {
      const response = await fetch("/api/ai/enhance-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          eventTitle: formData.title || undefined,
          maxLength: 1500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEnhancementError(data.error || "Kon beschrijving niet verbeteren");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        description: data.enhancedDescription,
      }));
    } catch {
      setEnhancementError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleHeroImageUpload = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    setIsUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/events/${event.id}/hero-image`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setImageError(data.error || "Upload mislukt");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        heroImageUrl: data.url,
      }));
    } catch {
      setImageError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleHeroImageDelete = async () => {
    if (!event || !formData.heroImageUrl) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je deze afbeelding wilt verwijderen?"
    );
    if (!confirmed) return;

    setIsUploadingImage(true);
    setImageError(null);

    try {
      const response = await fetch(`/api/events/${event.id}/hero-image`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setImageError(data.error || "Verwijderen mislukt");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        heroImageUrl: null,
      }));
    } catch {
      setImageError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLocationChange = (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      location: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <Accordion.Root
        type="multiple"
        defaultValue={["basic", "media", "location", "datetime", "pricing"]}
        className="space-y-4"
      >
        {/* Basic Information Section */}
        <Accordion.Item
          value="basic"
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
        >
          <Accordion.Header>
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Basis informatie
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Titel, beschrijving en URL van het evenement
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-500 transition-transform group-data-[state=open]:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-6 pb-6 space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Titel *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                maxLength={100}
                value={formData.title}
                onChange={handleChange}
                placeholder={`bijv. ${titlePlaceholder}`}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Evenement URL *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  required
                  value={formData.slug}
                  onChange={handleChange}
                  disabled={mode === "edit" && !canChangeSlug.allowed}
                  pattern="[a-z0-9-]+"
                  minLength={3}
                  maxLength={50}
                  placeholder={`bijv. ${slugPlaceholder}`}
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {mode === "edit" && !canChangeSlug.allowed ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : slugAvailability.checking ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : !formData.slug ? null : mode === "edit" &&
                    formData.slug ===
                      event?.slug ? null : slugAvailability.available ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : slugAvailability.error ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              {mode === "edit" && !canChangeSlug.allowed ? (
                <p className="mt-1 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {canChangeSlug.reason}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-gray-500">
                    Beschikbaar op: getentro.app/e/{organizationSlug}/
                    {formData.slug || slugPlaceholder}
                  </p>
                  {slugAvailability.error &&
                    formData.slug &&
                    (mode === "create" || formData.slug !== event?.slug) && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {slugAvailability.error}
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Beschrijving *
                </label>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={
                    isEnhancing ||
                    !formData.description ||
                    formData.description.length < 10
                  }
                  className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aan het verbeteren...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Verbeter met AI
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                maxLength={2000}
                value={formData.description}
                onChange={handleChange}
                placeholder="Vertel bezoekers meer over het evenement..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="mt-1 flex items-center justify-between">
                <div>
                  {enhancementError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {enhancementError}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formData.description.length}/2000 karakters
                </p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Media Section (only in edit mode) */}
        {mode === "edit" && event && (
          <Accordion.Item
            value="media"
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
          >
            <Accordion.Header>
              <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Hero afbeelding
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Upload een aantrekkelijke banner voor je evenement
                    </p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-500 transition-transform group-data-[state=open]:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-6 pb-6">
              <div>
                {formData.heroImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <Image
                        src={formData.heroImageUrl}
                        alt="Hero afbeelding"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleHeroImageDelete}
                      disabled={isUploadingImage}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Verwijder afbeelding
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="heroImage"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploadingImage ? (
                          <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-3" />
                        ) : (
                          <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        )}
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">
                            Klik om te uploaden
                          </span>{" "}
                          of sleep
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG of WEBP (max. 5MB)
                        </p>
                      </div>
                      <input
                        id="heroImage"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleHeroImageUpload}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {imageError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {imageError}
                  </p>
                )}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        )}

        {/* Location Section */}
        <Accordion.Item
          value="location"
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
        >
          <Accordion.Header>
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Locatie
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Waar vindt het evenement plaats?
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-500 transition-transform group-data-[state=open]:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-6 pb-6 space-y-6">
            {/* Location Description */}
            <div>
              <label
                htmlFor="locationDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Locatie omschrijving
              </label>
              <input
                type="text"
                id="locationDescription"
                name="locationDescription"
                maxLength={200}
                value={formData.locationDescription}
                onChange={handleChange}
                placeholder="bijv. Grote zaal, Hoofdingang"
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optionele aanvullende informatie over de locatie of zaal
              </p>
            </div>

            {/* Location */}
            {mode === "edit" &&
            event &&
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <GoogleMapsLocationPicker
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                initialLocation={
                  formData.latitude && formData.longitude
                    ? {
                        address: formData.location,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                      }
                    : undefined
                }
                onLocationChange={handleLocationChange}
              />
            ) : (
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Locatie *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  maxLength={200}
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="bijv. De Oosterpoort, Groningen"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {mode === "create" && (
                  <p className="mt-1 text-sm text-gray-500">
                    Je kunt de locatie op een kaart selecteren na het aanmaken
                    van het evenement.
                  </p>
                )}
              </div>
            )}
          </Accordion.Content>
        </Accordion.Item>

        {/* Date & Time Section */}
        <Accordion.Item
          value="datetime"
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
        >
          <Accordion.Header>
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Datum & Tijd
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wanneer vindt het evenement plaats?
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-500 transition-transform group-data-[state=open]:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startsAt"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Startdatum & tijd *
                </label>
                <input
                  type="datetime-local"
                  id="startsAt"
                  name="startsAt"
                  required
                  value={formData.startsAt}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="endsAt"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Einddatum & tijd *
                </label>
                <input
                  type="datetime-local"
                  id="endsAt"
                  name="endsAt"
                  required
                  value={formData.endsAt}
                  min={formData.startsAt}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Pricing & Fees Section */}
        <Accordion.Item
          value="pricing"
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
        >
          <Accordion.Header>
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Prijzen & Betaling
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Betaald of gratis, BTW-tarief en betaalkosten
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-500 transition-transform group-data-[state=open]:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-6 pb-6 space-y-6">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type evenement *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isPaid"
                    value="true"
                    checked={formData.isPaid === true}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-900 dark:text-white">
                    Betaald evenement
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isPaid"
                    value="false"
                    checked={formData.isPaid === false}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-900 dark:text-white">
                    Gratis evenement
                  </span>
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {formData.isPaid
                  ? "Voor betaalde evenementen moet je een Mollie account koppelen om betalingen te ontvangen."
                  : "Bij gratis evenementen kunnen tickets zonder prijs worden aangemaakt."}
              </p>
            </div>

            {/* Free Event Unlock Info */}
            {!formData.isPaid && unlockInfo && (
              <FreeEventLimitInfo
                freeEventLimit={unlockInfo.freeEventLimit}
                unlockFee={unlockInfo.unlockFee}
                isUnlocked={unlockInfo.isUnlocked}
                onUnlock={() => setShowUnlockModal(true)}
                showUnlockButton={mode === "edit"}
                context="event"
              />
            )}

            {/* VAT Rate (only for paid events) */}
            {formData.isPaid && (
              <div>
                <label
                  htmlFor="vatRate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  BTW-tarief *
                </label>
                <select
                  id="vatRate"
                  name="vatRate"
                  value={formData.vatRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vatRate: e.target.value as VatRate,
                    }))
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="STANDARD_21">
                    {VAT_RATE_LABELS.STANDARD_21}
                  </option>
                  <option value="REDUCED_9">{VAT_RATE_LABELS.REDUCED_9}</option>
                  <option value="EXEMPT">{VAT_RATE_LABELS.EXEMPT}</option>
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Dit tarief wordt toegepast op alle tickets voor dit evenement.
                  De ticketprijs blijft inclusief BTW zoals je deze invoert.
                  Deze instelling is alleen voor rapportage in de administratie.
                </p>
              </div>
            )}

            {/* Pass Payment Fees to Buyer (only for paid events) */}
            {formData.isPaid && (
              <div>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="passPaymentFeesToBuyer"
                    checked={formData.passPaymentFeesToBuyer}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        passPaymentFeesToBuyer: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Betaalkosten doorberekenen aan koper
                    </span>
                    <p className="mt-1 text-sm text-gray-500">
                      Toon betalingskosten als aparte regel in de checkout. Dit
                      bedrag is een schatting; de daadwerkelijke kosten worden
                      door Mollie aan jou gefactureerd.
                    </p>
                    {formData.passPaymentFeesToBuyer && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
                        <strong>Let op:</strong> Kopers zien een extra regel
                        "Betaalkosten" (geschat €0,39 voor iDEAL) in hun
                        winkelwagen. De werkelijke kosten variëren per
                        betaalmethode.
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>

      {/* Unlock Modal */}
      {mode === "edit" && event && !event.isPaid && unlockInfo && (
        <UnlockTicketsModal
          eventId={event.id}
          open={showUnlockModal}
          onOpenChange={setShowUnlockModal}
          unlockFeeAmount={unlockInfo.unlockFee}
          currentLimit={unlockInfo.freeEventLimit}
        />
      )}
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div>
          {mode === "edit" && event?.status === "DRAFT" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
            >
              Verwijderen
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting
              ? "Bezig..."
              : mode === "create"
                ? "Evenement aanmaken"
                : "Wijzigingen opslaan"}
          </button>
        </div>
      </div>
    </form>
  );
}
