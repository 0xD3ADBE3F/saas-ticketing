import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/server/lib/supabase';
import { getUserOrganizations } from '@/server/services/organizationService';
import { designService } from '@/server/services/designService';
import type { PortalTheme } from '@/generated/prisma';

export async function PATCH(req: NextRequest) {
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

    // Get theme from request body
    const { theme } = await req.json();

    if (!['LIGHT', 'DARK'].includes(theme)) {
      return NextResponse.json(
        { error: 'Invalid theme value' },
        { status: 400 }
      );
    }

    // Update theme
    await designService.updateTheme(org.id, theme as PortalTheme);

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('Theme update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
