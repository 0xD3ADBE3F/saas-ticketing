import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/server/lib/supabase';
import { eventImageService } from '@/server/services/eventImageService';
import { getUserOrganizations } from '@/server/services/organizationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/events/[id]/hero-image - Upload hero image
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json({ error: 'Geen organisatie gevonden' }, { status: 404 });
  }

  const organizationId = organizations[0].id;
  const { id: eventId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 });
    }

    const result = await eventImageService.uploadHeroImage(
      eventId,
      organizationId,
      user.id,
      file
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to upload hero image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload mislukt' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/events/[id]/hero-image - Delete hero image
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json({ error: 'Geen organisatie gevonden' }, { status: 404 });
  }

  const organizationId = organizations[0].id;
  const { id: eventId } = await params;

  try {
    await eventImageService.deleteHeroImage(eventId, organizationId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete hero image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verwijderen mislukt' },
      { status: 400 }
    );
  }
}
