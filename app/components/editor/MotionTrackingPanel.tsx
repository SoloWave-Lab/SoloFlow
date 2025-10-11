import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useMotionTracking } from "~/hooks/useAnimation";
import { Target, Trash2, Plus, Play, Square } from "lucide-react";

interface MotionTrackingPanelProps {
  projectId: string;
  scrubberId: string;
  currentFrame: number;
  totalFrames: number;
  onSeek?: (frame: number) => void;
}

export function MotionTrackingPanel({
  projectId,
  scrubberId,
  currentFrame,
  totalFrames,
  onSeek,
}: MotionTrackingPanelProps) {
  const {
    trackers,
    loading,
    loadTrackers,
    createTracker,
    updateTracker,
    deleteTracker,
    addTrackPoint,
  } = useMotionTracking(projectId);

  const [selectedTracker, setSelectedTracker] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackerName, setTrackerName] = useState("");

  useEffect(() => {
    loadTrackers(scrubberId);
  }, [scrubberId, loadTrackers]);

  const handleCreateTracker = async () => {
    if (!trackerName.trim()) return;

    await createTracker({
      scrubberId,
      name: trackerName,
      startFrame: currentFrame,
      endFrame: totalFrames,
    });

    setTrackerName("");
  };

  const handleStartTracking = async (trackerId: string) => {
    setIsTracking(true);
    setSelectedTracker(trackerId);
    // In a real implementation, this would start the tracking algorithm
    // For now, we'll just simulate adding track points
  };

  const handleStopTracking = () => {
    setIsTracking(false);
  };

  const handleAddTrackPoint = async (trackerId: string, x: number, y: number) => {
    await addTrackPoint(trackerId, {
      frame: currentFrame,
      x,
      y,
      confidence: 1.0,
    });
  };

  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          Motion Tracking
        </h3>
      </div>

      <Tabs defaultValue="trackers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trackers">Trackers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="trackers" className="space-y-4">
          {/* Create New Tracker */}
          <Card className="p-4 space-y-3">
            <Label>Create New Tracker</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Tracker name"
                value={trackerName}
                onChange={(e) => setTrackerName(e.target.value)}
              />
              <Button onClick={handleCreateTracker} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Tracker List */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading trackers...</p>
            ) : trackers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trackers yet. Create one to get started.
              </p>
            ) : (
              trackers
                .filter((t) => t.scrubberId === scrubberId)
                .map((tracker) => (
                  <Card
                    key={tracker.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedTracker === tracker.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedTracker(tracker.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{tracker.name}</h4>
                          <Switch
                            checked={tracker.enabled}
                            onCheckedChange={(enabled) =>
                              updateTracker(tracker.id, { enabled })
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Frames {tracker.startFrame} - {tracker.endFrame}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {(tracker.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Points: {tracker.trackPoints?.length || 0}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {isTracking && selectedTracker === tracker.id ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopTracking();
                            }}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTracking(tracker.id);
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTracker(tracker.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {selectedTrackerData ? (
            <Card className="p-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">{selectedTrackerData.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Configure tracking settings for this tracker
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Start Frame</Label>
                  <Input
                    type="number"
                    value={selectedTrackerData.startFrame}
                    onChange={(e) =>
                      updateTracker(selectedTrackerData.id, {
                        startFrame: parseInt(e.target.value),
                      })
                    }
                    min={0}
                    max={totalFrames}
                  />
                </div>

                <div>
                  <Label>End Frame</Label>
                  <Input
                    type="number"
                    value={selectedTrackerData.endFrame}
                    onChange={(e) =>
                      updateTracker(selectedTrackerData.id, {
                        endFrame: parseInt(e.target.value),
                      })
                    }
                    min={0}
                    max={totalFrames}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (onSeek) onSeek(selectedTrackerData.startFrame);
                    }}
                  >
                    Go to Start Frame
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Select a tracker to view settings
            </p>
          )}
        </TabsContent>
      </Tabs>

      {isTracking && (
        <Card className="p-4 bg-primary/10 border-primary">
          <p className="text-sm font-medium">
            🎯 Tracking in progress...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click on the video preview to place tracking points
          </p>
        </Card>
      )}
    </div>
  );
}