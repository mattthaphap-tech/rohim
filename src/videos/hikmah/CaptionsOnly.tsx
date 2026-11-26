import React from "react";
import { AbsoluteFill } from "remotion";
import { HikmahCaptionOverlay } from "./HikmahCaptionOverlay";

export const HikmahCaptionsOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "transparent" }}>
    <HikmahCaptionOverlay />
  </AbsoluteFill>
);
