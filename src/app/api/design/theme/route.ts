import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/server/lib/supabase';
import { getUserOrganizations } from '@/server/services/organizationService';

// TODO: Implement theme functionality when database schema is updated
// Currently theme switching is planned but not yet in the schema

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

    // TODO: Implement database storage when schema is ready
    // For now, return success to avoid breaking the frontend
    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('Theme update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
