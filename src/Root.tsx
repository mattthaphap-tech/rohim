import React from "react";
import { Composition, Folder } from "remotion";
import {
  DemoShort,
  DemoShortWithCaptions,
  DemoFrames,
} from "./videos/demo/Bridge";
import { DemoCaptionOverlay } from "./videos/demo/DemoCaptionOverlay";
import { DemoCaptionsOnly } from "./videos/demo/CaptionsOnly";
import { TipsShort, TipsShortWithCaptions, TipsFrames } from "./videos/tips/Bridge";
import { TipsCaptionOverlay } from "./videos/tips/TipsCaptionOverlay";
import { TipsCaptionsOnly } from "./videos/tips/CaptionsOnly";
import { HikmahShort, HikmahShortWithCaptions, HikmahFrames } from "./videos/hikmah/Bridge";
import { HikmahCaptionOverlay } from "./videos/hikmah/HikmahCaptionOverlay";
import { HikmahCaptionsOnly } from "./videos/hikmah/CaptionsOnly";
import { TuyulShort, TuyulShortWithCaptions, TuyulFrames } from "./videos/tuyul/Bridge";
import { TuyulCaptionOverlay } from "./videos/tuyul/TuyulCaptionOverlay";
import { TuyulCaptionsOnly } from "./videos/tuyul/CaptionsOnly";
import { HihuShort, HihuShortWithCaptions, HihuFrames } from "./videos/hihu/Bridge";
import { HihuCaptionOverlay } from "./videos/hihu/HihuCaptionOverlay";
import { HihuCaptionsOnly } from "./videos/hihu/CaptionsOnly";
import { RohimShort, RohimShortWithCaptions, RohimFrames } from "./videos/rohim/Bridge";
import { RohimCaptionOverlay } from "./videos/rohim/RohimCaptionOverlay";
import { RohimCaptionsOnly } from "./videos/rohim/CaptionsOnly";

export const Root: React.FC = () => {
  return (
    <>
      <Folder name="Demo">
        <Composition
          id="DemoShort"
          component={DemoShort}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoShortWithCaptions"
          component={DemoShortWithCaptions}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptionOverlay"
          component={DemoCaptionOverlay}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptionGreenScreen"
          component={() => <DemoCaptionOverlay bg="#00FF00" />}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptions"
          component={DemoCaptionsOnly}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Rohim">
        <Composition id="RohimShort" component={RohimShort} durationInFrames={RohimFrames} fps={30} width={1080} height={1920} />
        <Composition id="RohimShortWithCaptions" component={RohimShortWithCaptions} durationInFrames={RohimFrames} fps={30} width={1080} height={1920} />
        <Composition id="RohimCaptionOverlay" component={RohimCaptionOverlay} durationInFrames={RohimFrames} fps={30} width={1080} height={1920} />
        <Composition id="RohimCaptionGreenScreen" component={() => <RohimCaptionOverlay bg="#00FF00" />} durationInFrames={RohimFrames} fps={30} width={1080} height={1920} />
        <Composition id="RohimCaptions" component={RohimCaptionsOnly} durationInFrames={RohimFrames} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Hihu">
        <Composition id="HihuShort" component={HihuShort} durationInFrames={HihuFrames} fps={30} width={1080} height={1920} />
        <Composition id="HihuShortWithCaptions" component={HihuShortWithCaptions} durationInFrames={HihuFrames} fps={30} width={1080} height={1920} />
        <Composition id="HihuCaptionOverlay" component={HihuCaptionOverlay} durationInFrames={HihuFrames} fps={30} width={1080} height={1920} />
        <Composition id="HihuCaptionGreenScreen" component={() => <HihuCaptionOverlay bg="#00FF00" />} durationInFrames={HihuFrames} fps={30} width={1080} height={1920} />
        <Composition id="HihuCaptions" component={HihuCaptionsOnly} durationInFrames={HihuFrames} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Tuyul">
        <Composition id="TuyulShort" component={TuyulShort} durationInFrames={TuyulFrames} fps={30} width={1080} height={1920} />
        <Composition id="TuyulShortWithCaptions" component={TuyulShortWithCaptions} durationInFrames={TuyulFrames} fps={30} width={1080} height={1920} />
        <Composition id="TuyulCaptionOverlay" component={TuyulCaptionOverlay} durationInFrames={TuyulFrames} fps={30} width={1080} height={1920} />
        <Composition id="TuyulCaptionGreenScreen" component={() => <TuyulCaptionOverlay bg="#00FF00" />} durationInFrames={TuyulFrames} fps={30} width={1080} height={1920} />
        <Composition id="TuyulCaptions" component={TuyulCaptionsOnly} durationInFrames={TuyulFrames} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Hikmah">
        <Composition id="HikmahShort" component={HikmahShort} durationInFrames={HikmahFrames} fps={30} width={1080} height={1920} />
        <Composition id="HikmahShortWithCaptions" component={HikmahShortWithCaptions} durationInFrames={HikmahFrames} fps={30} width={1080} height={1920} />
        <Composition id="HikmahCaptionOverlay" component={HikmahCaptionOverlay} durationInFrames={HikmahFrames} fps={30} width={1080} height={1920} />
        <Composition id="HikmahCaptionGreenScreen" component={() => <HikmahCaptionOverlay bg="#00FF00" />} durationInFrames={HikmahFrames} fps={30} width={1080} height={1920} />
        <Composition id="HikmahCaptions" component={HikmahCaptionsOnly} durationInFrames={HikmahFrames} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Tips">
        <Composition id="TipsShort" component={TipsShort} durationInFrames={TipsFrames} fps={30} width={1080} height={1920} />
        <Composition id="TipsShortWithCaptions" component={TipsShortWithCaptions} durationInFrames={TipsFrames} fps={30} width={1080} height={1920} />
        <Composition id="TipsCaptionOverlay" component={TipsCaptionOverlay} durationInFrames={TipsFrames} fps={30} width={1080} height={1920} />
        <Composition id="TipsCaptionGreenScreen" component={() => <TipsCaptionOverlay bg="#00FF00" />} durationInFrames={TipsFrames} fps={30} width={1080} height={1920} />
        <Composition id="TipsCaptions" component={TipsCaptionsOnly} durationInFrames={TipsFrames} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
