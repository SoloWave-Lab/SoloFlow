import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  ChevronDown,
  AtSign,
  FileVideo,
  FileImage,
  Type,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  type MediaBinItem,
  type TimelineState,
  type ScrubberState,
} from "../timeline/types";
import { cn } from "~/lib/utils";
import axios from "axios";
import { apiUrl } from "~/utils/api";
import { AI_MODELS } from "~/lib/ai-models";

// llm tools
import {
  llmAddScrubberToTimeline,
  llmMoveScrubber,
  llmAddScrubberByName,
  llmDeleteScrubbersInTrack,
} from "~/utils/llm-handler";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  className?: string;
  mediaBinItems: MediaBinItem[];
  handleDropOnTrack: (
    item: MediaBinItem,
    trackId: string,
    dropLeftPx: number
  ) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  timelineState: TimelineState;
  handleUpdateScrubber: (updatedScrubber: ScrubberState) => void;
  handleDeleteScrubber?: (scrubberId: string) => void;
  projectId?: string;
  onAddMediaToLibrary?: (media: MediaBinItem) => void;
  autoAddVideoToTimeline?: boolean; // If true, generated videos will be automatically added to timeline
}

export function ChatBox({
  className = "",
  mediaBinItems,
  handleDropOnTrack,
  isMinimized = false,
  onToggleMinimize,
  messages,
  onMessagesChange,
  timelineState,
  handleUpdateScrubber,
  handleDeleteScrubber,
  projectId,
  onAddMediaToLibrary,
  autoAddVideoToTimeline = true,
}: ChatBoxProps) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showAiModelSelector, setShowAiModelSelector] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState<string>("gemini");
  const [selectedAiModel, setSelectedAiModel] = useState<string>("gemini-1.5-pro-latest");
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [textareaHeight, setTextareaHeight] = useState(36); // Starting height for proper size
  const [sendWithMedia, setSendWithMedia] = useState(false); // Track send mode
  const [mentionedItems, setMentionedItems] = useState<MediaBinItem[]>([]); // Store actual mentioned items
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const sendOptionsRef = useRef<HTMLDivElement>(null);
  const aiModelSelectorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Click outside handler for send options
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sendOptionsRef.current &&
        !sendOptionsRef.current.contains(event.target as Node)
      ) {
        setShowSendOptions(false);
      }
    };

    if (showSendOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSendOptions]);

  // Click outside handler for AI model selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aiModelSelectorRef.current &&
        !aiModelSelectorRef.current.contains(event.target as Node)
      ) {
        setShowAiModelSelector(false);
      }
    };

    if (showAiModelSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAiModelSelector]);

  // Filter media bin items based on mention query
  const filteredMentions = mediaBinItems.filter((item) =>
    item.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle input changes and @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    setInputValue(value);
    setCursorPosition(cursorPos);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 96); // max about 4 lines
    textarea.style.height = newHeight + "px";
    setTextareaHeight(newHeight);

    // Clean up mentioned items that are no longer in the text
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    const currentMentions = Array.from(value.matchAll(mentionPattern)).map(
      (match) => match[1]
    );
    setMentionedItems((prev) =>
      prev.filter((item) =>
        currentMentions.some(
          (mention) => mention.toLowerCase() === item.name.toLowerCase()
        )
      )
    );

    // Check for @ mentions
    const beforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      // Only show mentions if @ is at start or after whitespace, and no spaces after @
      const isValidMention =
        (lastAtIndex === 0 || /\s/.test(beforeCursor[lastAtIndex - 1])) &&
        !afterAt.includes(" ");

      if (isValidMention) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention into input
  const insertMention = (item: MediaBinItem) => {
    const beforeCursor = inputValue.slice(0, cursorPosition);
    const afterCursor = inputValue.slice(cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    const newValue =
      beforeCursor.slice(0, lastAtIndex) + `@${item.name} ` + afterCursor;
    setInputValue(newValue);
    setShowMentions(false);

    // Store the actual item reference for later use
    setMentionedItems((prev) => {
      // Avoid duplicates
      if (!prev.find((existingItem) => existingItem.id === item.id)) {
        return [...prev, item];
      }
      return prev;
    });

    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = lastAtIndex + item.name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Helper function to detect if message is requesting image generation
  const detectImageGeneration = (message: string): string | null => {
    const imageKeywords = [
      /generate.*image/i,
      /create.*image/i,
      /make.*image/i,
      /generate.*picture/i,
      /create.*picture/i,
      /draw/i,
      /paint/i,
    ];

    for (const pattern of imageKeywords) {
      if (pattern.test(message)) {
        // Extract the prompt (everything after the command)
        const match = message.match(/(?:generate|create|make|draw|paint)\s+(?:an?\s+)?(?:image|picture)?\s*(?:of|with|showing)?\s*(.+)/i);
        return match ? match[1].trim() : message;
      }
    }
    return null;
  };

  // Helper function to detect if message is requesting video generation
  const detectVideoGeneration = (message: string): string | null => {
    const videoKeywords = [
      /generate.*video/i,
      /create.*video/i,
      /make.*video/i,
      /generate.*animation/i,
      /create.*animation/i,
    ];

    for (const pattern of videoKeywords) {
      if (pattern.test(message)) {
        // Extract the prompt (everything after the command)
        const match = message.match(/(?:generate|create|make)\s+(?:a\s+)?(?:video|animation)?\s*(?:of|with|showing|about)?\s*(.+)/i);
        return match ? match[1].trim() : message;
      }
    }
    return null;
  };

  // Handle image generation
  const handleImageGeneration = async (prompt: string): Promise<string> => {
    if (!projectId) {
      return "❌ Error: Project ID is required for image generation.";
    }

    try {
      const response = await axios.post(apiUrl("/api/ai/generate-image", false, true), {
        prompt,
        ai_provider: selectedAiProvider,
        ai_model: selectedAiModel,
        width: 1024,
        height: 1024,
        project_id: projectId,
      });

      if (response.data.success && response.data.media) {
        const newMedia = response.data.media as MediaBinItem;
        
        // Add to media library
        if (onAddMediaToLibrary) {
          onAddMediaToLibrary(newMedia);
        }

        return `✅ Successfully generated image: "${newMedia.name}". Added to Media Library!`;
      } else {
        return "❌ Failed to generate image. Please try again.";
      }
    } catch (error) {
      console.error("Image generation error:", error);
      return `❌ Error generating image: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  };

  // Handle video generation
  const handleVideoGeneration = async (prompt: string): Promise<string> => {
    if (!projectId) {
      return "❌ Error: Project ID is required for video generation.";
    }

    try {
      const response = await axios.post(apiUrl("/api/ai/generate-video", false, true), {
        prompt,
        ai_provider: selectedAiProvider,
        ai_model: selectedAiModel,
        duration: 5,
        width: 1280,
        height: 720,
        fps: 24,
        project_id: projectId,
      });

      if (response.data.success && response.data.media) {
        const newMedia = response.data.media as MediaBinItem;
        
        // Add to media library
        if (onAddMediaToLibrary) {
          onAddMediaToLibrary(newMedia);
        }

        // Automatically add to timeline if enabled
        if (autoAddVideoToTimeline && timelineState.tracks.length > 0) {
          // Find the first video track or use the first track
          const videoTrack = timelineState.tracks.find(t => t.type === "video") || timelineState.tracks[0];
          if (videoTrack) {
            // Add at the end of the timeline
            const lastScrubber = videoTrack.scrubbers[videoTrack.scrubbers.length - 1];
            const dropPosition = lastScrubber 
              ? lastScrubber.leftPx + lastScrubber.widthPx + 10 
              : 0;
            handleDropOnTrack(newMedia, videoTrack.id, dropPosition);
          }
        }

        const addedToTimeline = autoAddVideoToTimeline ? " and Timeline" : "";
        return `✅ Successfully generated video: "${newMedia.name}". Added to Media Library${addedToTimeline}!`;
      } else {
        return "❌ Failed to generate video. Please try again.";
      }
    } catch (error) {
      console.error("Video generation error:", error);
      return `❌ Error generating video: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  };

  const handleSendMessage = async (includeAllMedia = false) => {
    if (!inputValue.trim()) return;

    let messageContent = inputValue.trim();
    let itemsToSend = mentionedItems;

    // If sending with all media, include all media items
    if (includeAllMedia && mediaBinItems.length > 0) {
      const mediaList = mediaBinItems.map((item) => `@${item.name}`).join(" ");
      messageContent = `${messageContent} ${mediaList}`;
      // Add all media items to the items to send
      itemsToSend = [
        ...mentionedItems,
        ...mediaBinItems.filter(
          (item) =>
            !mentionedItems.find((mentioned) => mentioned.id === item.id)
        ),
      ];
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      isUser: true,
      timestamp: new Date(),
    };

    onMessagesChange([...messages, userMessage]);
    setInputValue("");
    setMentionedItems([]); // Clear mentioned items after sending
    setIsTyping(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "36px"; // Back to normal height
      setTextareaHeight(36);
    }

    try {
      // Check if this is an image generation request
      const imagePrompt = detectImageGeneration(messageContent);
      if (imagePrompt) {
        const result = await handleImageGeneration(imagePrompt);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result,
          isUser: false,
          timestamp: new Date(),
        };
        onMessagesChange([...messages, userMessage, aiMessage]);
        setIsTyping(false);
        return;
      }

      // Check if this is a video generation request
      const videoPrompt = detectVideoGeneration(messageContent);
      if (videoPrompt) {
        const result = await handleVideoGeneration(videoPrompt);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result,
          isUser: false,
          timestamp: new Date(),
        };
        onMessagesChange([...messages, userMessage, aiMessage]);
        setIsTyping(false);
        return;
      }

      // Otherwise, proceed with normal chat/function calling
      // Use the stored mentioned items to get their IDs
      const mentionedScrubberIds = itemsToSend.map((item) => item.id);

      // Build short chat history to give context to the backend
      const history = messages.slice(-10).map((m) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.content,
        timestamp: m.timestamp,
      }));

      // Make API call to the backend
      const response = await axios.post(apiUrl("/api/ai", false, true), {
        message: messageContent,
        mentioned_scrubber_ids: mentionedScrubberIds,
        timeline_state: timelineState,
        mediabin_items: mediaBinItems,
        chat_history: history,
        ai_provider: selectedAiProvider,
        ai_model: selectedAiModel,
      });

      const functionCallResponse = response.data;
      let aiResponseContent = "";

      // Handle the function call based on function_name
      if (functionCallResponse.function_call) {
        const { function_call } = functionCallResponse;

        try {
          if (function_call.function_name === "LLMAddScrubberToTimeline") {
            // Find the media item by ID
            const mediaItem = mediaBinItems.find(
              (item) => item.id === function_call.scrubber_id
            );

            if (!mediaItem) {
              aiResponseContent = `❌ Error: Media item with ID "${function_call.scrubber_id}" not found in the media bin.`;
            } else {
              // Execute the function
              llmAddScrubberToTimeline(
                function_call.scrubber_id,
                mediaBinItems,
                function_call.track_id,
                function_call.drop_left_px,
                handleDropOnTrack
              );

              aiResponseContent = `✅ Successfully added "${mediaItem.name}" to ${function_call.track_id} at position ${function_call.drop_left_px}px.`;
            }
          } else if (function_call.function_name === "LLMMoveScrubber") {
            // Execute move scrubber operation
            llmMoveScrubber(
              function_call.scrubber_id,
              function_call.new_position_seconds,
              function_call.new_track_number,
              function_call.pixels_per_second,
              timelineState,
              handleUpdateScrubber
            );

            // Try to locate the scrubber name for a nicer message
            const allScrubbers = timelineState.tracks.flatMap(
              (t) => t.scrubbers
            );
            const moved = allScrubbers.find(
              (s) => s.id === function_call.scrubber_id
            );
            const movedName = moved ? moved.name : function_call.scrubber_id;
            aiResponseContent = `✅ Moved "${movedName}" to track ${function_call.new_track_number} at ${function_call.new_position_seconds}s.`;
          } else if (function_call.function_name === "LLMAddScrubberByName") {
            // Add media by name with defaults
            llmAddScrubberByName(
              function_call.scrubber_name,
              mediaBinItems,
              function_call.track_number,
              function_call.position_seconds,
              function_call.pixels_per_second ?? 100,
              handleDropOnTrack
            );

            aiResponseContent = `✅ Added "${function_call.scrubber_name}" to track ${function_call.track_number} at ${function_call.position_seconds}s.`;
          } else if (
            function_call.function_name === "LLMDeleteScrubbersInTrack"
          ) {
            if (!handleDeleteScrubber) {
              throw new Error("Delete handler is not available");
            }
            llmDeleteScrubbersInTrack(
              function_call.track_number,
              timelineState,
              handleDeleteScrubber
            );
            aiResponseContent = `✅ Removed all scrubbers in track ${function_call.track_number}.`;
          } else {
            aiResponseContent = `❌ Unknown function: ${function_call.function_name}`;
          }
        } catch (error) {
          aiResponseContent = `❌ Error executing function: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
        }
      } else if (functionCallResponse.assistant_message) {
        aiResponseContent = functionCallResponse.assistant_message;
      } else {
        aiResponseContent =
          "I understand your request, but I couldn't determine a specific action to take. Could you please be more specific?";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseContent,
        isUser: false,
        timestamp: new Date(),
      };

      onMessagesChange([...messages, userMessage, aiMessage]);
    } catch (error) {
      console.error("Error calling AI API:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ Sorry, I encountered an error while processing your request. Please try again.`,
        isUser: false,
        timestamp: new Date(),
      };

      onMessagesChange([...messages, userMessage, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMentions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMentions.length - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredMentions[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow default behavior for Shift+Enter (new line)
        return;
      } else {
        // Send message on Enter
        e.preventDefault();
        handleSendMessage(sendWithMedia);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Chat Header */}
      <div className="h-9 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium tracking-tight">Ask Kylo</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessagesChange([])}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Clear chat"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          {onToggleMinimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimize}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title={isMinimized ? "Expand chat" : "Minimize chat"}
            >
              {isMinimized ? (
                <ChevronLeft className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          // Default clean state - Copilot style
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Ask Kylo</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
              Kylo is your AI assistant for video editing. Ask questions, get
              help with timeline operations, or request specific edits.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <AtSign className="h-3 w-3" />
                <span>to chat with media</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  Enter
                </kbd>
                <span>to send</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  Shift
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  Enter
                </kbd>
                <span>for new line</span>
              </div>
            </div>
          </div>
        ) : (
          // Messages Area
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3 scroll-smooth"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                      message.isUser
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!message.isUser && (
                        <Bot className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed break-words overflow-wrap-anywhere">
                          {message.content}
                        </p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      {message.isUser && (
                        <User className="h-3 w-3 mt-0.5 text-primary-foreground/70 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-muted mr-8">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex space-x-1">
                        <div
                          className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area with enhanced overlap effect */}
      <div className="relative bg-gradient-to-t from-background to-background/50 p-3 border-t border-border/30 backdrop-blur-sm -mt-2 pt-4">
        {/* Mentions Dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div
            ref={mentionsRef}
            className="absolute bottom-full left-4 right-4 mb-2 bg-background border border-border/50 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50"
          >
            {filteredMentions.map((item, index) => (
              <div
                key={item.id}
                className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-2 ${
                  index === selectedMentionIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => insertMention(item)}
              >
                <div className="w-6 h-6 bg-muted/50 rounded flex items-center justify-center">
                  {item.mediaType === "video" ? (
                    <FileVideo className="h-3 w-3 text-muted-foreground" />
                  ) : item.mediaType === "image" ? (
                    <FileImage className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Type className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.mediaType}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Send Options Dropdown */}
        {showSendOptions && (
          <div
            ref={sendOptionsRef}
            className="absolute bottom-full right-4 mb-2 bg-background border border-border/50 rounded-md shadow-lg z-50 min-w-48"
          >
            <div className="p-1">
              <div
                className="px-3 py-2 text-xs cursor-pointer hover:bg-muted rounded flex items-center justify-between"
                onClick={() => {
                  setSendWithMedia(false);
                  setShowSendOptions(false);
                  handleSendMessage(false);
                }}
              >
                <span>Send</span>
                <span className="text-xs text-muted-foreground font-mono">
                  Enter
                </span>
              </div>
              <div
                className="px-3 py-2 text-xs cursor-pointer hover:bg-muted rounded flex items-center justify-between"
                onClick={() => {
                  setSendWithMedia(true);
                  setShowSendOptions(false);
                  handleSendMessage(true);
                }}
              >
                <span>Send with all Media</span>
              </div>
              <div
                className="px-3 py-2 text-xs cursor-pointer hover:bg-muted rounded flex items-center justify-between"
                onClick={() => {
                  // Clear current messages and send to new chat
                  onMessagesChange([]);
                  setShowSendOptions(false);
                  handleSendMessage(false);
                }}
              >
                <span>Send to New Chat</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Model Selector Dropdown */}
        {showAiModelSelector && (
          <div
            ref={aiModelSelectorRef}
            className="absolute bottom-full left-4 mb-2 bg-background border border-border/50 rounded-md shadow-lg z-50 min-w-64 max-h-96 overflow-y-auto"
          >
            <div className="p-1">
              {Object.entries(AI_MODELS).map(([provider, models]) => (
                <div key={provider} className="mb-1">
                  <div
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 rounded flex items-center gap-2"
                    onClick={() => {
                      setSelectedAiProvider(provider);
                      if (models.length > 0) {
                        setSelectedAiModel(models[0]);
                      }
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{provider}</span>
                    {selectedAiProvider === provider && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </div>
                  {selectedAiProvider === provider && (
                    <div className="ml-2 border-l-2 border-border/30 pl-2">
                      {models.map((model) => (
                        <div
                          key={model}
                          className={`px-3 py-1.5 text-xs cursor-pointer rounded flex items-center justify-between ${
                            selectedAiModel === model
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            setSelectedAiModel(model);
                            setShowAiModelSelector(false);
                          }}
                        >
                          <span className="truncate">{model}</span>
                          {selectedAiModel === model && (
                            <span className="ml-2 text-primary">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Model Selector Dropdown */}
        {showAiModelSelector && (
          <div
            ref={aiModelSelectorRef}
            className="absolute bottom-full left-4 mb-2 bg-background border border-border/50 rounded-md shadow-lg z-50 min-w-64 max-h-96 overflow-y-auto"
          >
            <div className="p-1">
              {Object.entries(AI_MODELS).map(([provider, models]) => (
                <div key={provider} className="mb-1">
                  <div
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 rounded flex items-center gap-2"
                    onClick={() => {
                      setSelectedAiProvider(provider);
                      if (models.length > 0) {
                        setSelectedAiModel(models[0]);
                      }
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{provider}</span>
                    {selectedAiProvider === provider && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </div>
                  {selectedAiProvider === provider && (
                    <div className="ml-2 border-l-2 border-border/30 pl-2">
                      {models.map((model) => (
                        <div
                          key={model}
                          className={`px-3 py-1.5 text-xs cursor-pointer rounded flex items-center justify-between ${
                            selectedAiModel === model
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            setSelectedAiModel(model);
                            setShowAiModelSelector(false);
                          }}
                        >
                          <span className="truncate">{model}</span>
                          {selectedAiModel === model && (
                            <span className="ml-2 text-primary">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input container with subtle shadow and better styling */}
        <div className="relative border border-border/60 rounded-lg bg-background/90 backdrop-blur-sm focus-within: focus-within:border-ring transition-all duration-200 shadow-sm">
          {/* Full-width textarea */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Ask Kylo..."
            className={cn(
              "w-full min-h-8 max-h-20 resize-none text-xs bg-transparent border-0 px-3 pt-2.5 pb-1 placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200 leading-relaxed"
            )}
            disabled={isTyping}
            rows={1}
            style={{ height: `${Math.max(textareaHeight, 32)}px` }}
          />

          {/* Buttons row below text with refined styling */}
          <div className="flex items-center justify-between px-2.5 pb-2 pt-0">
            {/* Left side buttons */}
            <div className="flex items-center gap-1">
              {/* @ Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
                onClick={() => {
                  if (inputRef.current) {
                    const cursorPos =
                      inputRef.current.selectionStart || inputValue.length;
                    const newValue =
                      inputValue.slice(0, cursorPos) +
                      "@" +
                      inputValue.slice(cursorPos);
                    setInputValue(newValue);
                    const newCursorPos = cursorPos + 1;
                    setCursorPosition(newCursorPos);

                    // Trigger mentions dropdown immediately
                    setMentionQuery("");
                    setShowMentions(true);
                    setSelectedMentionIndex(0);

                    setTimeout(() => {
                      inputRef.current?.focus();
                      inputRef.current?.setSelectionRange(
                        newCursorPos,
                        newCursorPos
                      );
                    }, 0);
                  }
                }}
              >
                <AtSign className="h-2.5 w-2.5" />
              </Button>

              {/* AI Model Selector Button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 flex items-center gap-1 ${
                  showAiModelSelector ? "bg-muted/50" : ""
                }`}
                onClick={() => setShowAiModelSelector(!showAiModelSelector)}
                title={`AI Model: ${selectedAiProvider} - ${selectedAiModel}`}
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span className="text-xs font-medium">{selectedAiProvider}</span>
              </Button>
            </div>

            {/* Send buttons - right side, smaller and refined */}
            <div className="flex items-center gap-0.5">
              <Button
                onClick={() => handleSendMessage(sendWithMedia)}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="h-6 px-2 bg-transparent hover:bg-primary/10 text-primary hover:text-primary text-xs"
                variant="ghost"
              >
                <Send className="h-2.5 w-2.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
                disabled={isTyping}
                onClick={() => setShowSendOptions(!showSendOptions)}
              >
                <ChevronDown className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
