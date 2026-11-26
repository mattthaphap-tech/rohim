import React from "react";
import { AbsoluteFill } from "remotion";
import { HihuCaptionOverlay } from "./HihuCaptionOverlay";

export const HihuCaptionsOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "transparent" }}>
    <HihuCaptionOverlay />
  </AbsoluteFill>
);
