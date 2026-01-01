import { put, del } from '@vercel/blob';
import { organizationRepo } from '@/server/repos/organizationRepo';
import type { PortalTheme } from '@/generated/prisma';

export const designService = {
  /**
   * Upload a logo for an organization
   */
  uploadLogo: async (orgId: string, file: File): Promise<{ url: string }> => {
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File must be under 2MB');
    }

    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PNG, JPG, and SVG files are allowed');
    }

    // Delete old logo if exists
    const oldSettings = await organizationRepo.getDesignSettings(orgId);
    if (oldSettings?.logoUrl) {
      await designService.deleteLogo(orgId, oldSettings.logoUrl);
    }

    // Upload new logo to Vercel Blob
    const ext = file.name.split('.').pop();
    const pathname = `${orgId}/logo.${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false, // Keep consistent filename
    });

    // Save URL to database
    await organizationRepo.updateDesignSettings(orgId, {
      logoUrl: blob.url,
    });

    return { url: blob.url };
  },

  /**
   * Delete logo for an organization
   */
  deleteLogo: async (orgId: string, logoUrl: string): Promise<void> => {
    // Delete from Vercel Blob
    if (logoUrl) {
      try {
        await del(logoUrl);
      } catch (error) {
        // Log error but continue to remove from DB
        console.error('Failed to delete logo from Vercel Blob:', error);
      }
    }

    // Remove from database
    await organizationRepo.updateDesignSettings(orgId, { logoUrl: null });
  },

  /**
   * Update theme preference for an organization
   */
  updateTheme: async (orgId: string, theme: PortalTheme) => {
    return organizationRepo.updateDesignSettings(orgId, {
      portalTheme: theme,
    });
  },

  /**
   * Get design settings for an organization
   */
  getDesignSettings: async (orgId: string) => {
    return organizationRepo.getDesignSettings(orgId);
  },
};
