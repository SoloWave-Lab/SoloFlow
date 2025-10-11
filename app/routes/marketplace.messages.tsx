import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useFetcher, useSearchParams, Form } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { MessageSquare, Send, Search, User, Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useEffect, useState, Suspense } from 'react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { MessageListSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { AvatarImage as OptimizedAvatar } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Get user from session
  // const user = await requireUser(request);
  
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation');

  try {
    // Fetch conversations from API
    const { conversations } = await marketplaceApi.messages.listConversations();

    // Fetch messages for selected conversation
    let messages: any[] = [];
    if (conversationId) {
      const messagesData = await marketplaceApi.messages.list(conversationId);
      messages = messagesData.messages || [];
    }

    const selectedConversation = conversations.find((c) => c.id === conversationId);

    return json({
      conversations: conversations || [],
      messages,
      selectedConversation: selectedConversation || null,
      currentUserId: 'current-user', // TODO: Get from session
    });
  } catch (error) {
    console.error('Failed to load messages:', error);
    return json({
      conversations: [],
      messages: [],
      selectedConversation: null,
      currentUserId: 'current-user',
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'send-message') {
    const conversationId = formData.get('conversationId') as string;
    const content = formData.get('content') as string;
    
    try {
      await marketplaceApi.messages.send(conversationId, content);
      return json({ success: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      return json({ success: false, error: 'Failed to send message' }, { status: 500 });
    }
  }

  if (intent === 'mark-read') {
    const conversationId = formData.get('conversationId') as string;
    
    try {
      await marketplaceApi.messages.markRead(conversationId);
      return json({ success: true });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      return json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

function MessagesContent() {
  const { conversations, messages, selectedConversation, currentUserId } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();
  const [searchQuery, setSearchQuery] = useState('');

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Messages</h1>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnread} unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Chat with sellers about their products
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations */}
              <ScrollArea className="h-[calc(100vh-350px)]">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No conversations found' : 'No messages yet'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          setSearchParams({ conversation: conversation.id });
                          // Mark as read
                          if (conversation.unreadCount > 0) {
                            fetcher.submit(
                              { intent: 'mark-read', conversationId: conversation.id },
                              { method: 'post' }
                            );
                          }
                        }}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted transition-colors',
                          selectedConversation?.id === conversation.id && 'bg-muted'
                        )}
                      >
                        <div className="flex gap-3">
                          <OptimizedAvatar
                            src={conversation.otherUser.avatarUrl}
                            alt={conversation.otherUser.displayName}
                            name={conversation.otherUser.displayName}
                            size={40}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm truncate">
                                {conversation.otherUser.displayName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(conversation.lastMessage.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {conversation.listing.title}
                            </p>
                            <div className="flex items-center justify-between">
                              <p
                                className={cn(
                                  'text-sm truncate',
                                  conversation.unreadCount > 0
                                    ? 'font-semibold'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {conversation.lastMessage.content}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Thread Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <OptimizedAvatar
                        src={selectedConversation.otherUser.avatarUrl}
                        alt={selectedConversation.otherUser.displayName}
                        name={selectedConversation.otherUser.displayName}
                        size={40}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">
                          {selectedConversation.otherUser.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.listing.title}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/marketplace/listings/${selectedConversation.listing.id}`}>
                          View Listing
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea
                    id="messages-container"
                    className="flex-1 p-4 h-[calc(100vh-500px)]"
                  >
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === currentUserId;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isCurrentUser ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg p-3',
                                isCurrentUser
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p
                                className={cn(
                                  'text-xs mt-1',
                                  isCurrentUser
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <Form method="post" className="flex gap-2">
                      <input type="hidden" name="intent" value="send-message" />
                      <input
                        type="hidden"
                        name="conversationId"
                        value={selectedConversation.id}
                      />
                      <Textarea
                        name="content"
                        placeholder="Type your message..."
                        className="resize-none"
                        rows={2}
                        required
                        disabled={fetcher.state !== 'idle'}
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        className="self-end"
                        disabled={fetcher.state !== 'idle'}
                      >
                        {fetcher.state !== 'idle' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </Form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a conversation from the list to view messages
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

// Wrap with Suspense for loading states
export default function Messages() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground mt-2">
              Communicate with buyers and sellers
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MessageListSkeleton />
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center h-96">
                    <MessageSquare className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    }>
      <MessagesContent />
    </Suspense>
  );
}