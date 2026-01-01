import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/server/lib/supabase';
import { getUserOrganizations } from '@/server/services/organizationService';
import { designService } from '@/server/services/designService';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const organizations = await getUserOrganizations(user.id);
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    const org = organizations[0];

    // Get file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload logo
    const result = await designService.uploadLogo(org.id, file);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const organizations = await getUserOrganizations(user.id);
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    const org = organizations[0];

    // Get logo URL from query params
    const { searchParams } = new URL(req.url);
    const logoUrl = searchParams.get('url');

    if (!logoUrl) {
      return NextResponse.json({ error: 'Logo URL required' }, { status: 400 });
    }

    // Delete logo
    await designService.deleteLogo(org.id, logoUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
