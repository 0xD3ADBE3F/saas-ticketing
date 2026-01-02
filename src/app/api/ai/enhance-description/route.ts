import { NextResponse } from "next/server";
import { ask } from "@/server/services/openaiService";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";

// =============================================================================
// AI Enhance Description API Route
// =============================================================================
// Enhances event descriptions using OpenAI (requires authentication)
// =============================================================================

/**
 * POST /api/ai/enhance-description
 * Enhances a user-provided event description
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    // Verify user has an organization
    const organizations = await getUserOrganizations(user.id);
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: "Geen organisatie gevonden" },
        { status: 403 }
      );
    }

    const { description, eventTitle, maxLength } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: "Description must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Use provided maxLength or default to 2000
    const maxDescriptionLength = maxLength && typeof maxLength === "number" && maxLength > 0
      ? Math.min(maxLength, 2000) // Cap at 1000 for safety
      : 2000;

    const systemPrompt = `Je bent een professionele event marketeer die helpt met het schrijven van aantrekkelijke evenementenbeschrijvingen in het Nederlands.

Regels:
- Schrijf in het Nederlands
- Maak de tekst aantrekkelijker en professioneler, maar behoud de kernboodschap
- Gebruik maximaal ${maxDescriptionLength} karakters
- Voeg geen informatie toe die niet in de originele tekst staat
- Behoud een vriendelijke, uitnodigende toon
- Vermijd overdreven marketing-taal
- Geef alleen de verbeterde beschrijving terug, geen extra uitleg`;

    const prompt = eventTitle
      ? `Verbeter deze evenementenbeschrijving voor "${eventTitle}":\n\n${description}`
      : `Verbeter deze evenementenbeschrijving:\n\n${description}`;

    const enhancedDescription = await ask(prompt, systemPrompt);

    // Ensure the response isn't too long
    const trimmedDescription =
      enhancedDescription.length > maxDescriptionLength
        ? enhancedDescription.substring(0, maxDescriptionLength)
        : enhancedDescription;

    return NextResponse.json({
      enhancedDescription: trimmedDescription,
      originalLength: description.length,
      enhancedLength: trimmedDescription.length,
    });
  } catch (error) {
    console.error("AI enhance description error:", error);
    return NextResponse.json(
      {
        error:
          "Kon beschrijving niet verbeteren. Controleer of de OpenAI API key is ingesteld.",
      },
      { status: 500 }
    );
  }
}
