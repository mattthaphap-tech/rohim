import React from "react";
import { AbsoluteFill } from "remotion";
import { TuyulCaptionOverlay } from "./TuyulCaptionOverlay";

export const TuyulCaptionsOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "transparent" }}>
    <TuyulCaptionOverlay />
  </AbsoluteFill>
);
