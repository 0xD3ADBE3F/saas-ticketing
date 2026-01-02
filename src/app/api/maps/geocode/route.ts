import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/maps/geocode - Geocode address to coordinates
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const latlng = searchParams.get('latlng');

  if (!address && !latlng) {
    return NextResponse.json(
      { error: 'Address or latlng parameter required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      region: 'nl',
      ...(address ? { address } : { latlng: latlng! }),
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding request failed' },
      { status: 500 }
    );
  }
}
