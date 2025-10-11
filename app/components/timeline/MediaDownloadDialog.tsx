import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Search,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Download,
  Loader2,
  Play,
  Pause,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";

interface MediaDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadMedia: (url: string, filename: string, type: "image" | "video" | "audio") => Promise<void>;
}

type MediaType = "images" | "videos" | "music";

interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    small: string;
    full: string;
  };
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

interface UnsplashVideo {
  id: string;
  video_files: Array<{
    link: string;
    quality: string;
    width: number;
    height: number;
  }>;
  image: string;
  user: {
    name: string;
    url: string;
  };
  duration: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  preview_url: string | null;
  duration_ms: number;
}

export function MediaDownloadDialog({
  open,
  onOpenChange,
  onDownloadMedia,
}: MediaDownloadDialogProps) {
  const [activeTab, setActiveTab] = useState<MediaType>("images");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Results
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [videos, setVideos] = useState<UnsplashVideo[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);

  // Audio preview
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (activeTab === "images") {
        const response = await fetch(
          `/api/media/unsplash/search?query=${encodeURIComponent(searchQuery)}&type=photos`
        );
        const data = await response.json();
        setImages(data.results || []);
      } else if (activeTab === "videos") {
        const response = await fetch(
          `/api/media/unsplash/search?query=${encodeURIComponent(searchQuery)}&type=videos`
        );
        const data = await response.json();
        setVideos(data.results || []);
      } else if (activeTab === "music") {
        const response = await fetch(
          `/api/media/spotify/search?query=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        setTracks(data.tracks?.items || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, activeTab]);

  const handleDownload = async (
    url: string,
    filename: string,
    type: "image" | "video" | "audio",
    id: string
  ) => {
    setDownloadingIds((prev) => new Set(prev).add(id));
    try {
      await onDownloadMedia(url, filename, type);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const togglePlayPreview = (trackId: string, previewUrl: string | null) => {
    if (!previewUrl) return;

    if (playingTrackId === trackId) {
      audioElement?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(previewUrl);
      audio.play();
      audio.onended = () => setPlayingTrackId(null);
      setAudioElement(audio);
      setPlayingTrackId(trackId);
    }
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  // Clear results when tab changes
  useEffect(() => {
    setImages([]);
    setVideos([]);
    setTracks([]);
    setSearchQuery("");
  }, [activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Download Media</DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r bg-muted/20 p-4 space-y-2">
            <Button
              variant={activeTab === "images" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("images")}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Images
            </Button>
            <Button
              variant={activeTab === "videos" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("videos")}
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              Videos
            </Button>
            <Button
              variant={activeTab === "music" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("music")}
            >
              <MusicIcon className="h-4 w-4 mr-2" />
              Music
            </Button>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1 p-6">
            {activeTab === "images" && (
              <div className="grid grid-cols-3 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={image.urls.small}
                      alt={image.alt_description || "Unsplash image"}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground truncate">
                        by {image.user.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {image.width} × {image.height}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          handleDownload(
                            image.urls.regular,
                            `unsplash-${image.id}.jpg`,
                            "image",
                            image.id
                          )
                        }
                        disabled={downloadingIds.has(image.id)}
                      >
                        {downloadingIds.has(image.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "videos" && (
              <div className="grid grid-cols-2 gap-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={video.image}
                      alt="Video thumbnail"
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground truncate">
                        by {video.user.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.floor(video.duration)}s
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const bestQuality = video.video_files.sort(
                            (a, b) => b.width - a.width
                          )[0];
                          handleDownload(
                            bestQuality.link,
                            `pexels-${video.id}.mp4`,
                            "video",
                            video.id
                          );
                        }}
                        disabled={downloadingIds.has(video.id)}
                      >
                        {downloadingIds.has(video.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "music" && (
              <div className="space-y-3">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
                  >
                    <img
                      src={track.album.images[0]?.url || "/placeholder.png"}
                      alt={track.album.name}
                      className="w-16 h-16 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.album.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {track.preview_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePlayPreview(track.id, track.preview_url)}
                        >
                          {playingTrackId === track.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(
                            `https://open.spotify.com/track/${track.id}`,
                            "_blank"
                          );
                        }}
                        title="Open in Spotify (Preview only - full download not available)"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isSearching &&
              images.length === 0 &&
              videos.length === 0 &&
              tracks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Search for {activeTab} to get started
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {activeTab === "images" && "Powered by Unsplash"}
                    {activeTab === "videos" && "Powered by Pexels (via Unsplash API)"}
                    {activeTab === "music" && "Powered by Spotify"}
                  </p>
                </div>
              )}

            {isSearching && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}