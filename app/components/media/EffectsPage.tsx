import React from "react";
import { useOutletContext } from "react-router";
import EffectsPanel from "~/components/editor/EffectsPanel";

interface EffectsPageContext {
  selectedScrubberIds: string[];
}

export default function EffectsPage() {
  const { selectedScrubberIds } = useOutletContext<EffectsPageContext>();
  
  return <EffectsPanel selectedScrubberIds={selectedScrubberIds} />;
}