import { put, del } from '@vercel/blob';
import { eventRepo } from '@/server/repos/eventRepo';
import { prisma } from '@/server/lib/prisma';

export const eventImageService = {
  /**
   * Upload a hero image for an event
   */
  uploadHeroImage: async (
    eventId: string,
    organizationId: string,
    userId: string,
    file: File
  ): Promise<{ url: string }> => {
    // Verify event belongs to organization and user has access
    const event = await eventRepo.findByIdInOrg(eventId, organizationId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Verify user has access to organization
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!membership) {
      throw new Error('Unauthorized');
    }

    // Validate file size (5MB max for hero images)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File must be under 5MB');
    }

    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PNG, JPG, and WEBP files are allowed');
    }

    // Delete old hero image if exists
    if (event.heroImageUrl) {
      await eventImageService.deleteHeroImage(eventId, organizationId, userId, event.heroImageUrl);
    }

    // Upload new hero image to Vercel Blob
    const ext = file.name.split('.').pop();
    const pathname = `${organizationId}/events/${eventId}/hero.${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false, // Keep consistent filename
    });

    // Save URL to database
    await prisma.event.update({
      where: { id: eventId },
      data: { heroImageUrl: blob.url },
    });

    return { url: blob.url };
  },

  /**
   * Delete hero image for an event
   */
  deleteHeroImage: async (
    eventId: string,
    organizationId: string,
    userId: string,
    heroImageUrl?: string
  ): Promise<void> => {
    // Verify event belongs to organization and user has access
    const event = await eventRepo.findByIdInOrg(eventId, organizationId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Verify user has access to organization
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!membership) {
      throw new Error('Unauthorized');
    }

    const urlToDelete = heroImageUrl || event.heroImageUrl;

    // Delete from Vercel Blob
    if (urlToDelete) {
      try {
        await del(urlToDelete);
      } catch (error) {
        // Log error but continue to remove from DB
        console.error('Failed to delete hero image from Vercel Blob:', error);
      }
    }

    // Remove from database
    await prisma.event.update({
      where: { id: eventId },
      data: { heroImageUrl: null },
    });
  },
};
