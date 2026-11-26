import React from "react";
import { AbsoluteFill } from "remotion";
import { RohimCaptionOverlay } from "./RohimCaptionOverlay";

export const RohimCaptionsOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "transparent" }}>
    <RohimCaptionOverlay />
  </AbsoluteFill>
);
