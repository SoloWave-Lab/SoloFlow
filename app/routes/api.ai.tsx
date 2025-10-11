import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { aiService } from "~/lib/ai-providers.server";

// Initialize the Gemini API (for backward compatibility)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the schema for function calls
const functionCallSchema = {
  type: SchemaType.OBJECT,
  properties: {
    function_call: {
      type: SchemaType.OBJECT,
      properties: {
        function_name: {
          type: SchemaType.STRING,
          enum: [
            "LLMAddScrubberToTimeline",
            "LLMMoveScrubber",
            "LLMAddScrubberByName",
            "LLMDeleteScrubbersInTrack",
          ],
          description: "The name of the function to call",
        },
        scrubber_id: {
          type: SchemaType.STRING,
          description: "The id of the scrubber (for LLMAddScrubberToTimeline, LLMMoveScrubber)",
          nullable: true,
        },
        track_id: {
          type: SchemaType.STRING,
          description: "The id of the track (for LLMAddScrubberToTimeline)",
          nullable: true,
        },
        drop_left_px: {
          type: SchemaType.NUMBER,
          description: "The left position in pixels (for LLMAddScrubberToTimeline)",
          nullable: true,
        },
        new_position_seconds: {
          type: SchemaType.NUMBER,
          description: "The new position in seconds (for LLMMoveScrubber)",
          nullable: true,
        },
        new_track_number: {
          type: SchemaType.NUMBER,
          description: "The new track number (for LLMMoveScrubber)",
          nullable: true,
        },
        pixels_per_second: {
          type: SchemaType.NUMBER,
          description: "Pixels per second conversion (for LLMMoveScrubber, LLMAddScrubberByName)",
          nullable: true,
        },
        scrubber_name: {
          type: SchemaType.STRING,
          description: "The name of the media to add (for LLMAddScrubberByName)",
          nullable: true,
        },
        track_number: {
          type: SchemaType.NUMBER,
          description: "1-based track number (for LLMAddScrubberByName, LLMDeleteScrubbersInTrack)",
          nullable: true,
        },
        position_seconds: {
          type: SchemaType.NUMBER,
          description: "Timeline position in seconds (for LLMAddScrubberByName)",
          nullable: true,
        },
      },
      nullable: true,
    },
    assistant_message: {
      type: SchemaType.STRING,
      description: "A friendly message when no action is needed",
      nullable: true,
    },
  },
  required: [],
};

interface MessageRequest {
  message: string;
  mentioned_scrubber_ids?: string[] | null;
  timeline_state?: any;
  mediabin_items?: any[];
  chat_history?: Array<{ role: string; content: string; timestamp?: Date }>;
  ai_provider?: string;
  ai_model?: string;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: MessageRequest = await request.json();
    const {
      message,
      mentioned_scrubber_ids,
      timeline_state,
      mediabin_items,
      chat_history,
      ai_provider = "gemini",
      ai_model = "gemini-2.0-flash-exp",
    } = body;

    console.log(`[AI Chat] Using provider: ${ai_provider}, model: ${ai_model}`);

    // Check if using Gemini and API key is missing
    if (ai_provider === "gemini" && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured",
          assistant_message:
            "Sorry, the AI service is not configured. Please set up the GEMINI_API_KEY environment variable.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Build the prompt
    const prompt = `
You are Kylo, an AI assistant inside a video editor. You can decide to either:
- call ONE tool from the provided schema when the user explicitly asks for an editing action, or
- return a short friendly assistant_message when no concrete action is needed (e.g., greetings, small talk, clarifying questions).

Strictly follow:
- If the user's message does not clearly request an editing action, set function_call to null and include an assistant_message.
- Only produce a function_call when it is safe and unambiguous to execute.

Inference rules:
- Assume a single active timeline; do NOT require a timeline_id.
- Tracks are named like "track-1", but when the user says "track 1" they mean number 1.
- Use pixels_per_second=100 by default if not provided.
- When the user names media like "twitter" or "twitter header", map that to the closest media in the media bin by name substring match.
- Prefer LLMAddScrubberByName when the user specifies a name, track number, and time in seconds.
- If the user asks to remove scrubbers in a specific track, call LLMDeleteScrubbersInTrack with that track number.

Conversation so far (oldest first): ${JSON.stringify(chat_history || [])}

User message: ${message}
Mentioned scrubber ids: ${JSON.stringify(mentioned_scrubber_ids || [])}
Timeline state: ${JSON.stringify(timeline_state || {})}
Media bin items: ${JSON.stringify(mediabin_items || [])}
`;

    let parsedResponse;

    // Use different providers based on selection
    if (ai_provider === "gemini") {
      // Get the generative model
      const model = genAI.getGenerativeModel({
        model: ai_model,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: functionCallSchema as any,
        },
      });

      // Generate content
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse the JSON response
      parsedResponse = JSON.parse(text);
    } else {
      // Use the unified AI service for other providers
      try {
        const chatMessages = [
          {
            role: "system" as const,
            content: "You are Kylo, an AI assistant in a video editor. Respond in JSON format matching the schema provided.",
          },
          ...(chat_history || []).map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: prompt,
          },
        ];

        const responseText = await aiService.chat(
          { provider: ai_provider, model: ai_model },
          chatMessages
        );

        // Try to parse as JSON, if it fails, wrap in assistant_message
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = {
            function_call: null,
            assistant_message: responseText,
          };
        }
      } catch (providerError) {
        console.error(`[AI Chat] Provider error:`, providerError);
        return new Response(
          JSON.stringify({
            error: `Failed to use ${ai_provider}`,
            assistant_message: `Sorry, I encountered an error with ${ai_provider}. ${providerError instanceof Error ? providerError.message : "Unknown error"}`,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing AI request:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        assistant_message:
          "Sorry, I encountered an error while processing your request. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle GET requests (not supported)
export async function loader() {
  return new Response(
    JSON.stringify({ error: "GET method not supported for this endpoint" }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}