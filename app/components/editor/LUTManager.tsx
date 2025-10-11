/**
 * LUT Manager Component
 * 
 * Provides UI for:
 * - Uploading LUT files (.cube and .3dl formats)
 * - Browsing user's LUT library
 * - Applying LUTs to selected clips
 * - Adjusting LUT intensity
 * - Removing LUTs from clips
 */

import React, { useState, useCallback, useRef } from "react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Upload, Trash2, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { parseCubeLUT, parse3dlLUT } from "~/lib/lut-parser";
import type { LUT } from "~/components/timeline/advanced-types";

interface LUTManagerProps {
  selectedScrubberId: string | null;
  currentLUT?: LUT;
  onApplyLUT: (lut: LUT) => void;
  onRemoveLUT: () => void;
  onIntensityChange?: (intensity: number) => void;
}

export default function LUTManager({
  selectedScrubberId,
  currentLUT,
  onApplyLUT,
  onRemoveLUT,
  onIntensityChange,
}: LUTManagerProps) {
  const [userLUTs, setUserLUTs] = useState<LUT[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [intensity, setIntensity] = useState(currentLUT?.intensity || 100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle LUT file upload
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "cube" && extension !== "3dl") {
      toast.error("Invalid file format. Please upload .cube or .3dl files.");
      return;
    }

    setIsUploading(true);

    try {
      // Read file content
      const fileContent = await file.text();

      // Parse LUT based on format
      let lutData;
      if (extension === "cube") {
        lutData = parseCubeLUT(fileContent);
      } else {
        lutData = parse3dlLUT(fileContent);
      }

      // Create LUT object
      const newLUT: LUT = {
        id: `lut-${Date.now()}`,
        name: file.name.replace(/\.(cube|3dl)$/i, ""),
        url: "", // Will be set by server after upload
        format: extension as "cube" | "3dl",
        size: lutData.size,
        data: lutData.data,
        intensity: 100,
        metadata: {
          title: lutData.title || file.name,
          description: undefined,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
        },
      };

      // Upload to server
      const response = await fetch("/api/effects/luts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newLUT.name,
          format: newLUT.format,
          size: newLUT.size,
          data: Array.from(newLUT.data), // Convert Float32Array to regular array for JSON
          metadata: newLUT.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload LUT");
      }

      const uploadedLUT = await response.json();

      // Add to user's LUT library
      setUserLUTs((prev) => [...prev, { ...newLUT, id: uploadedLUT.id }]);

      toast.success(`LUT "${newLUT.name}" uploaded successfully`);
    } catch (error) {
      console.error("LUT upload error:", error);
      toast.error("Failed to upload LUT. Please check the file format.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  /**
   * Load user's LUT library from server
   */
  const loadUserLUTs = useCallback(async () => {
    try {
      const response = await fetch("/api/effects/luts/user");
      if (!response.ok) {
        throw new Error("Failed to load LUTs");
      }

      const luts = await response.json();
      setUserLUTs(luts);
    } catch (error) {
      console.error("Failed to load LUTs:", error);
      toast.error("Failed to load LUT library");
    }
  }, []);

  /**
   * Apply LUT to selected clip
   */
  const handleApplyLUT = useCallback(
    (lut: LUT) => {
      if (!selectedScrubberId) {
        toast.error("Please select a clip first");
        return;
      }

      onApplyLUT({ ...lut, intensity });
      toast.success(`Applied LUT: ${lut.name}`);
    },
    [selectedScrubberId, intensity, onApplyLUT]
  );

  /**
   * Handle intensity slider change
   */
  const handleIntensityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newIntensity = parseInt(event.target.value, 10);
      setIntensity(newIntensity);
      onIntensityChange?.(newIntensity);
    },
    [onIntensityChange]
  );

  /**
   * Delete LUT from library
   */
  const handleDeleteLUT = useCallback(
    async (lutId: string) => {
      try {
        const response = await fetch(`/api/effects/luts/${lutId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete LUT");
        }

        setUserLUTs((prev) => prev.filter((lut) => lut.id !== lutId));
        toast.success("LUT deleted");
      } catch (error) {
        console.error("Failed to delete LUT:", error);
        toast.error("Failed to delete LUT");
      }
    },
    []
  );

  // Load LUTs on mount
  React.useEffect(() => {
    loadUserLUTs();
  }, [loadUserLUTs]);

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Upload LUT
        </h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".cube,.3dl"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            <Upload className="h-3 w-3 mr-2" />
            {isUploading ? "Uploading..." : "Upload LUT"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Supports .cube and .3dl formats
        </p>
      </div>

      <Separator />

      {/* Current LUT Section */}
      {currentLUT && (
        <>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current LUT
            </h3>
            <div className="rounded-md bg-muted/50 border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{currentLUT.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveLUT}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Intensity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Intensity</label>
                  <span className="text-xs font-mono">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={handleIntensityChange}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* LUT Library */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          LUT Library ({userLUTs.length})
        </h3>

        {userLUTs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No LUTs uploaded yet</p>
            <p className="text-xs mt-1">Upload your first LUT to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {userLUTs.map((lut) => (
                <div
                  key={lut.id}
                  className="rounded-md bg-muted/30 border border-border p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{lut.name}</span>
                        {currentLUT?.id === lut.id && (
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {lut.format.toUpperCase()} • {lut.size}x{lut.size}x{lut.size}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApplyLUT(lut)}
                        disabled={!selectedScrubberId}
                        className="h-6 px-2 text-xs"
                      >
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLUT(lut.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Info Section */}
      <div className="rounded-md bg-muted/30 border border-border p-3">
        <h4 className="text-xs font-semibold mb-2">About LUTs</h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          LUTs (Look-Up Tables) are professional color grading presets used in film and video
          production. They transform colors to achieve specific looks or match camera profiles.
        </p>
      </div>
    </div>
  );
}