import React from "react";
import { AbsoluteFill } from "remotion";
import { TipsCaptionOverlay } from "./TipsCaptionOverlay";

export const TipsCaptionsOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "transparent" }}>
    <TipsCaptionOverlay />
  </AbsoluteFill>
);
