/**
 * Advanced Panels Component
 * Integrates Phase 3 (Animation & Motion) and Phase 4 (Audio) panels into the editor
 */

import { useState } from 'react';
import { Card } from '~/components/ui/card';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import {
  Move,
  Maximize2,
  Gauge,
  Zap,
  Volume2,
  AudioWaveform,
  Mic,
  Music
} from 'lucide-react';

// Phase 3 Components
import { MotionTrackingPanel } from './MotionTrackingPanel';
import { StabilizationPanel } from './StabilizationPanel';
import { Transform3DPanel } from './Transform3DPanel';
import { SpeedRemapPanel } from './SpeedRemapPanel';

// Phase 4 Components
import { AudioDuckingPanel } from './AudioDuckingPanel';
import { AudioMixingPanel } from './AudioMixingPanel';

// New Components
import { WaveformVisualization } from './WaveformVisualization';
import { MultiChannelMeter } from './AudioMeter';
import { BezierCurveEditor } from './BezierCurveEditor';
import { KeyframeGraphEditor } from './KeyframeGraphEditor';

interface AdvancedPanelsProps {
  projectId?: string;
  selectedClipId?: string;
  onClose?: () => void;
}

export function AdvancedPanels({
  projectId,
  selectedClipId,
  onClose
}: AdvancedPanelsProps) {
  const [activeTab, setActiveTab] = useState('animation');

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="animation" className="flex items-center gap-2">
            <Move className="h-4 w-4" />
            Animation & Motion
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Audio Editing
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="animation" className="h-full">
            <ScrollArea type="scroll" className="h-full">
              <div className="space-y-4 p-4">
                <AnimationPanels projectId={projectId} selectedClipId={selectedClipId} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audio" className="h-full">
            <ScrollArea type="scroll" className="h-full">
              <div className="space-y-4 p-4">
                <AudioPanels projectId={projectId} selectedClipId={selectedClipId} />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

/**
 * Animation & Motion Panels
 */
function AnimationPanels({
  projectId,
  selectedClipId
}: {
  projectId?: string;
  selectedClipId?: string;
}) {
  if (!projectId) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Select a project to access advanced panels
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={['motion-tracking']} className="space-y-2">
      <AccordionItem value="motion-tracking">
        <AccordionTrigger className="flex items-center gap-2">
          <Move className="h-4 w-4" />
          Motion Tracking
        </AccordionTrigger>
        <AccordionContent>
          <MotionTrackingPanel 
            projectId={projectId!} 
            scrubberId={selectedClipId!} 
            currentFrame={0} 
            totalFrames={100} 
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="stabilization">
        <AccordionTrigger className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Video Stabilization
        </AccordionTrigger>
        <AccordionContent>
          <StabilizationPanel projectId={projectId!} scrubberId={selectedClipId!} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="3d-transform">
        <AccordionTrigger className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4" />
          3D Transform
        </AccordionTrigger>
        <AccordionContent>
          <Transform3DPanel projectId={projectId!} scrubberId={selectedClipId!} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="speed-remap">
        <AccordionTrigger className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Speed Remapping
        </AccordionTrigger>
        <AccordionContent>
          <SpeedRemapPanel projectId={projectId!} scrubberId={selectedClipId!} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="keyframe-editor">
        <AccordionTrigger className="flex items-center gap-2">
          <Move className="h-4 w-4" />
          Keyframe Editor
        </AccordionTrigger>
        <AccordionContent>
          <KeyframeGraphEditor
            keyframes={[
              { time: 0, value: 0, easing: [0.25, 0.1, 0.25, 1] },
              { time: 0.5, value: 1, easing: [0.42, 0, 0.58, 1] },
              { time: 1, value: 0, easing: [0.25, 0.1, 0.25, 1] }
            ]}
            onChange={keyframes => console.log('Keyframes updated:', keyframes)}
            duration={10}
            label="Opacity"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="easing-curve">
        <AccordionTrigger className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Easing Curve
        </AccordionTrigger>
        <AccordionContent>
          <BezierCurveEditor
            value={[0.25, 0.1, 0.25, 1]}
            onChange={curve => console.log('Curve updated:', curve)}
            showPresets
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * Audio Editing Panels
 */
function AudioPanels({
  projectId,
  selectedClipId
}: {
  projectId?: string;
  selectedClipId?: string;
}) {
  // Mock audio data for demonstration
  const mockAudioData = new Float32Array(44100).map(() => Math.random() * 2 - 1);

  return (
    <Accordion type="multiple" defaultValue={['audio-meters']} className="space-y-2">
      <AccordionItem value="audio-meters">
        <AccordionTrigger className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Audio Meters
        </AccordionTrigger>
        <AccordionContent>
          <MultiChannelMeter
            channels={[
              { label: 'Left', level: 0.7 },
              { label: 'Right', level: 0.6 },
              { label: 'Master', level: 0.65 }
            ]}
            orientation="vertical"
            showPeak
            showDb
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="waveform">
        <AccordionTrigger className="flex items-center gap-2">
          <AudioWaveform className="h-4 w-4" />
          Waveform
        </AccordionTrigger>
        <AccordionContent>
          <WaveformVisualization
            audioData={mockAudioData}
            sampleRate={44100}
            currentTime={2.5}
            duration={10}
            onSeek={time => console.log('Seek to:', time)}
            height={120}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="audio-ducking">
        <AccordionTrigger className="flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Audio Ducking
        </AccordionTrigger>
        <AccordionContent>
          <AudioDuckingPanel 
            projectId={projectId!} 
            availableTracks={[]} 
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="audio-mixing">
        <AccordionTrigger className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          Audio Mixing
        </AccordionTrigger>
        <AccordionContent>
          <AudioMixingPanel 
            projectId={projectId!} 
            tracks={[]} 
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * Compact version for sidebar
 */
export function AdvancedPanelsSidebar({
  projectId,
  selectedClipId
}: {
  projectId?: string;
  selectedClipId?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <Card className="p-2">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
        >
          <span className="text-sm font-medium">Advanced Tools</span>
          <Move className="h-4 w-4" />
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card className="p-2">
        <button
          onClick={() => setExpanded(false)}
          className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
        >
          <span className="text-sm font-medium">Advanced Tools</span>
          <Move className="h-4 w-4" />
        </button>
      </Card>
      <AdvancedPanels projectId={projectId} selectedClipId={selectedClipId} />
    </div>
  );
}