# AI-Enhanced Event Descriptions

## Overview

Event organizers can now enhance their event descriptions using AI with a single click. This feature uses OpenAI's API to make descriptions more professional and engaging while maintaining the original message.

## Implementation

### Files Added

1. **API Route**: [src/app/api/ai/enhance-description/route.ts](../src/app/api/ai/enhance-description/route.ts)
   - Endpoint: `POST /api/ai/enhance-description`
   - Takes description and optional event title
   - Returns enhanced description (max 2000 chars)

2. **OpenAI Service**: [src/server/services/openaiService.ts](../src/server/services/openaiService.ts)
   - Reusable service for all AI interactions
   - Functions: `ask()`, `chatCompletion()`, `generateEmbedding()`, `streamChatCompletion()`

3. **Tests**:
   - [tests/openai.test.ts](../tests/openai.test.ts) - OpenAI service tests
   - [tests/aiEnhancement.test.ts](../tests/aiEnhancement.test.ts) - API endpoint tests

### Files Modified

1. **EventForm**: [src/components/events/EventForm.tsx](../src/components/events/EventForm.tsx)
   - Added "Verbeter met AI" button next to description label
   - Shows loading spinner during enhancement
   - Displays errors if enhancement fails
   - Button disabled if description < 10 characters

## User Experience

### How It Works

1. User enters a basic event description (minimum 10 characters)
2. User clicks **"Verbeter met AI"** button (purple sparkles icon)
3. Button shows loading state: "Aan het verbeteren..."
4. Enhanced description automatically replaces the original text
5. User can edit further or enhance again

### Example

**Original:**

```
We gaan een feestje geven met muziek en drank.
```

**Enhanced:**

```
Kom gezellig langs op ons zomerfeest! Geniet van live muziek,
verfrissende drankjes en een geweldige sfeer. Perfect voor een
onvergetelijke avond met vrienden en familie.
```

## Technical Details

### Authentication

All AI endpoints require authentication:

- User must be logged in (Supabase Auth)
- User must belong to an organization
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if no organization found

### API Request

```typescript
POST /api/ai/enhance-description
Content-Type: application/json

{
  "description": "We gaan een feestje geven met muziek en drank.",
  "eventTitle": "Zomerfeest 2026" // optional
}
```

### API Response

```typescript
{
  "enhancedDescription": "Kom gezellig langs...",
  "originalLength": 48,
  "enhancedLength": 145
}
```

### AI Prompt Strategy

The system uses a carefully crafted system prompt that:

- Writes in Dutch (Nederlands)
- Makes text more attractive and professional
- Preserves the core message
- Max 2000 characters
- Doesn't add facts not in original
- Maintains friendly, inviting tone
- Avoids excessive marketing language

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...  # Required for AI features
```

Get your API key from: https://platform.openai.com/api-keys

### Cost Estimation

- Model used: `gpt-4-turbo-preview`
- Average cost per enhancement: ~$0.001 - $0.005
- Typical description: 50-500 tokens

## Error Handling

The feature gracefully handles:

- ❌ Missing API key → Error message shown
- ❌ Description too short → Button disabled + error
- ❌ Network errors → Error message with retry option
- ❌ API rate limits → Error message
- ✅ No API key configured → Feature still works but shows error on use

## Future Enhancements

Potential improvements:

- [ ] Show preview before applying
- [ ] Undo/redo functionality
- [ ] Different tone options (formal, casual, excited)
- [ ] Language detection/selection
- [ ] Suggested additions (hashtags, emojis, CTAs)
- [ ] Save enhancement history
- [ ] Batch enhancement for multiple events

## Testing

Run tests:

```bash
# All tests
npm test

# Just AI tests
npm test openai
npm test aiEnhancement
```

**Note:** Tests are skipped if `OPENAI_API_KEY` is not configured.

## Security & Privacy

- ✅ **Authentication required** - Only logged-in organization members can use
- ✅ Organization-scoped (multi-tenant safe)
- ✅ Descriptions sent to OpenAI API (see [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy))
- ✅ No personal data included in requests
- ✅ Rate limiting handled by OpenAI
- ✅ No caching of AI responses

## Monitoring

Track AI usage in logs:

```typescript
// Automatic logging in openaiService.ts
console.error("OpenAI chat completion error:", error);
```

Consider adding to audit logs:

- When enhancement is used
- Which organization
- Token usage for cost tracking
