"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar,
  MapPin,
  Loader2,
  LogOut,
  ScanLine,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
}

export default function ScannerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<{ id: string; name: string } | null>(
    null
  );
  const [org, setOrg] = useState<{ name: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for token
    const token = localStorage.getItem("scanner_token");
    if (!token) {
      router.push("/scanner");
      return;
    }

    // Load terminal info
    const terminalData = localStorage.getItem("scanner_terminal");
    if (terminalData) {
      setTerminal(JSON.parse(terminalData));
    }

    const orgData = localStorage.getItem("scanner_org");
    if (orgData) {
      setOrg(JSON.parse(orgData));
    }

    // Fetch events
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/scanner/mobile/events", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          // Token expired
          localStorage.removeItem("scanner_token");
          router.push("/scanner");
          return;
        }

        if (!res.ok) {
          throw new Error("Kon evenementen niet laden");
        }

        const data = await res.json();
        setEvents(data.events || []);

        // If only one event, redirect directly
        if (data.events?.length === 1) {
          router.push(`/scanner/scan/${data.events[0].id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Er ging iets mis");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("scanner_token");
    localStorage.removeItem("scanner_terminal");
    localStorage.removeItem("scanner_org");
    localStorage.removeItem("scanner_event");
    router.push("/scanner");
  };

  const isEventToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  };

  const formatEventTime = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const timeFormat: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };

    return {
      date: start.toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: `${start.toLocaleTimeString("nl-NL", timeFormat)} - ${end.toLocaleTimeString("nl-NL", timeFormat)}`,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
          <p className="text-gray-400">Evenementen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10 p-4 pb-safe max-w-2xl mx-auto">
        {/* Header Card */}
        <Card className="mb-6 bg-gray-900/50 border-gray-800 backdrop-blur-sm shadow-xl animate-fade-in">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ScanLine className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white mb-1 truncate">
                    {org?.name || "Scanner"}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-gray-800 text-gray-300 border-gray-700"
                    >
                      {terminal?.name || "Onbekend"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Uitloggen</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Error */}
        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-900 bg-red-950/50 animate-shake"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Section Header */}
        <div className="mb-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Selecteer een evenement
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kies het evenement waarvoor je tickets wilt scannen
          </p>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <Card className="bg-gray-900/30 border-gray-800/50 backdrop-blur-sm animate-slide-up">
            <CardContent className="p-8">
              <EmptyState
                icon={Calendar}
                title="Geen actieve evenementen"
                description="Er zijn geen live evenementen om te scannen."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => {
              const { date, time } = formatEventTime(
                event.startsAt,
                event.endsAt
              );
              const isToday = isEventToday(event.startsAt);

              return (
                <Link
                  key={event.id}
                  href={`/scanner/scan/${event.id}`}
                  className="block"
                  style={{
                    animation: `slide-up 0.4s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <Card className="group bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 active:scale-[0.98]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Event Title */}
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {event.title}
                            </h3>
                            {isToday && (
                              <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg shadow-blue-500/30 flex-shrink-0">
                                Vandaag
                              </Badge>
                            )}
                          </div>

                          {/* Event Details */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium">{date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span>{time}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {event.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Arrow Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-blue-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {events.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-600">
            <p>
              {events.length} actieve evenement{events.length !== 1 ? "en" : ""}
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        .delay-700 {
          animation-delay: 700ms;
        }

        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
