"use client";

import { useState, useCallback, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapsLocationPickerProps {
  apiKey: string;
  initialLocation?: LocationData;
  onLocationChange: (location: LocationData) => void;
}

function MapComponent({
  location,
  onLocationChange,
}: {
  location: { lat: number; lng: number };
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  // Pan to location when it changes (from search)
  useEffect(() => {
    if (map && location) {
      map.panTo(location);
    }
  }, [map, location]);

  const handleMapClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      if (event.detail?.latLng) {
        const lat = event.detail.latLng.lat;
        const lng = event.detail.latLng.lng;
        onLocationChange(lat, lng);
      }
    },
    [onLocationChange]
  );

  return (
    <>
      <Map
        mapId="event-location-picker"
        defaultCenter={location}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        style={{ width: "100%", height: "400px" }}
      >
        <AdvancedMarker position={location} />
      </Map>
    </>
  );
}

export function GoogleMapsLocationPicker({
  apiKey,
  initialLocation,
  onLocationChange,
}: GoogleMapsLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.latitude || 53.2194, // Groningen, NL default
    lng: initialLocation?.longitude || 6.5665,
  });
  const [address, setAddress] = useState(initialLocation?.address || "");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Use backend proxy to avoid CORS and keep API key secure
      const response = await fetch(
        `/api/maps/geocode?address=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const formattedAddress = result.formatted_address;

        setLocation({ lat, lng });
        setAddress(formattedAddress);
        onLocationChange({
          address: formattedAddress,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapLocationChange = useCallback(
    async (lat: number, lng: number) => {
      setLocation({ lat, lng });

      // Reverse geocode to get address using backend proxy
      try {
        const response = await fetch(`/api/maps/geocode?latlng=${lat},${lng}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const formattedAddress = data.results[0].formatted_address;
          setAddress(formattedAddress);
          onLocationChange({
            address: formattedAddress,
            latitude: lat,
            longitude: lng,
          });
        }
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        // Still update with coordinates even if reverse geocoding fails
        onLocationChange({
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          latitude: lat,
          longitude: lng,
        });
      }
    },
    [onLocationChange]
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="location-search">Zoek locatie</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location-search"
              type="text"
              placeholder="Bijv. De Oosterpoort, Groningen"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            Zoeken
          </Button>
        </div>
      </div>

      <div>
        <Label>Locatie op kaart</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Klik op de kaart om de pin te verplaatsen
        </p>
        <div className="border rounded-lg overflow-hidden">
          <APIProvider apiKey={apiKey}>
            <MapComponent
              location={location}
              onLocationChange={handleMapLocationChange}
            />
          </APIProvider>
        </div>
      </div>

      {address && (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Geselecteerde locatie</p>
            <p className="text-sm text-muted-foreground break-words">
              {address}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
