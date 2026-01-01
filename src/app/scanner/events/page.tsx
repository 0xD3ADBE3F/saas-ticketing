"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, MapPin, Loader2 } from "lucide-react";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">
            Evenementen laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {org?.name || "Scanner"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Terminal: {terminal?.name || "Onbekend"}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm">
          Uitloggen
        </Button>
      </header>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300">
          Selecteer een evenement
        </h2>

        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Geen actieve evenementen"
            description="Er zijn geen live evenementen om te scannen."
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link key={event.id} href={`/scanner/scan/${event.id}`}>
                <Card className="hover:shadow-md transition-all active:scale-[0.98]">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.startsAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
