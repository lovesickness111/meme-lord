import React from "react";
import {
  registerRoot,
  Composition,
  AbsoluteFill,
  Sequence,
  Audio,
  Img,
  staticFile,
  delayRender,
  continueRender,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import storyboard from "../storyboard.json";

const FPS = storyboard.format.fps;
const WIDTH = storyboard.format.width;
const HEIGHT = storyboard.format.height;

// ---------------------------------------------------------------------------
// Design system
// ---------------------------------------------------------------------------
const BG = "#0d1117";
const INK = "#f2efe9";
const ACCENT = "#ffd400";
const DIM = "#8b949e";
const MONO = "'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', monospace";
const BRAND_FONT = "Anton, 'Arial Black', sans-serif";

const FADE = 5; // fade-through-black frames on "fade" transitions
const END_FADE = 15; // final picture+audio fade (0.5s)

let antonPromise: Promise<void> | null = null;
const loadAnton = (): Promise<void> => {
  if (!antonPromise) {
    const anton = new FontFace("Anton", `url(${staticFile("fonts/Anton-Regular.ttf")})`);
    antonPromise = anton.load().then((f) => {
      document.fonts.add(f);
    });
  }
  return antonPromise;
};

const useBrandFont = () => {
  const [handle] = React.useState(() => delayRender("load Anton font"));
  React.useEffect(() => {
    loadAnton()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};

type SceneText = { content: string; role: string };
type Scene = {
  id: string;
  duration: number;
  template: string | null;
  image: string | null;
  text: SceneText[];
  transition: string;
};

const scenes = storyboard.scenes as Scene[];
const sceneFrames = scenes.map((s) => Math.round(s.duration * FPS));
const totalFrames = sceneFrames.reduce((a, b) => a + b, 0);

const textFor = (scene: Scene, role: string): string =>
  scene.text.find((t) => t.role === role)?.content ?? "";

// ---------------------------------------------------------------------------
// Texture overlay: grain + scanlines + vignette (persistent, unifies scenes)
// ---------------------------------------------------------------------------
const GRAIN_URIS = [0, 1, 2, 3].map((seed) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>`;
  return `url("data:image/svg+xml,${svg}")`;
});

const BackgroundTexture: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {/* animated film grain */}
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_URIS[frame % 4],
          backgroundRepeat: "repeat",
          opacity: 0.07,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 4px)",
          opacity: 0.28,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.5) 100%)",
      pointerEvents: "none",
    }}
  />
);

// ---------------------------------------------------------------------------
// Persistent HUD chrome
// ---------------------------------------------------------------------------
const Bracket: React.FC<{ corner: "tl" | "tr" | "bl" | "br" }> = ({ corner }) => {
  const size = 26;
  const t = "2px solid rgba(242,239,233,0.5)";
  const pos: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    ...(corner === "tl" && { top: 28, left: 28, borderTop: t, borderLeft: t }),
    ...(corner === "tr" && { top: 28, right: 28, borderTop: t, borderRight: t }),
    ...(corner === "bl" && { bottom: 28, left: 28, borderBottom: t, borderLeft: t }),
    ...(corner === "br" && { bottom: 28, right: 28, borderBottom: t, borderRight: t }),
  };
  return <div style={pos} />;
};

const HUD: React.FC = () => {
  const frame = useCurrentFrame();
  // which scene are we in?
  let acc = 0;
  let idx = 0;
  for (let i = 0; i < sceneFrames.length; i++) {
    if (frame < acc + sceneFrames[i]) {
      idx = i;
      break;
    }
    acc += sceneFrames[i];
    idx = i;
  }
  const seconds = frame / FPS;
  const timecode = `00:${String(Math.floor(seconds)).padStart(2, "0")}.${String(
    Math.floor((seconds % 1) * 100)
  ).padStart(2, "0")}`;
  const hudText: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 22,
    letterSpacing: 2,
    color: "rgba(242,239,233,0.88)",
  };
  return (
    <>
      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />
      <div style={{ position: "absolute", top: 34, left: 72, ...hudText }}>
        meme-maker
      </div>
      <div style={{ position: "absolute", top: 34, right: 72, ...hudText }}>
        {String(idx + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
      </div>
      <div style={{ position: "absolute", bottom: 34, left: 72, ...hudText }}>
        kartikkabadi/meme-maker
      </div>
      <div style={{ position: "absolute", bottom: 34, right: 72, ...hudText }}>
        {timecode}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Kinetic type helpers
// ---------------------------------------------------------------------------
const Cursor: React.FC<{ color?: string }> = ({ color = ACCENT }) => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 8) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.55em",
        height: "1.05em",
        marginLeft: 4,
        verticalAlign: "text-bottom",
        backgroundColor: on ? color : "transparent",
      }}
    />
  );
};

const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
  cursorColor?: string;
  hideCursorWhenDone?: boolean;
}> = ({ text, startFrame, charsPerFrame = 0.9, style, cursorColor, hideCursorWhenDone }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - startFrame) * charsPerFrame));
  const shown = text.slice(0, chars);
  const done = chars >= text.length;
  return (
    <span style={style}>
      {shown}
      {done && hideCursorWhenDone ? null : <Cursor color={cursorColor} />}
    </span>
  );
};

const PopTitle: React.FC<{
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
  snap?: boolean; // fully visible from startFrame, snap 1.14 -> 1
}> = ({ text, startFrame, fontSize = 96, color = INK, style, snap }) => {
  const frame = useCurrentFrame();
  const s = spring({
    frame: frame - startFrame,
    fps: FPS,
    config: { damping: 12, stiffness: 160, mass: 0.8 },
  });
  const opacity = snap
    ? frame >= startFrame
      ? 1
      : 0
    : interpolate(frame - startFrame, [0, 4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const scale = snap
    ? interpolate(frame - startFrame, [0, 5], [1.14, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.6)),
      })
    : 0.8 + 0.2 * s;
  const ty = snap ? 0 : (1 - s) * 30;
  return (
    <div
      style={{
        fontFamily: BRAND_FONT,
        fontSize,
        color,
        letterSpacing: 2,
        lineHeight: 1.1,
        textAlign: "center",
        transform: `scale(${scale}) translateY(${ty}px)`,
        opacity,
        textShadow: "0 4px 20px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const CountUp: React.FC<{
  to: number;
  startFrame: number;
  durationFrames: number;
  fontSize?: number;
}> = ({ to, startFrame, durationFrames, fontSize = 260 }) => {
  const frame = useCurrentFrame();
  const value = Math.round(
    interpolate(frame, [startFrame, startFrame + durationFrames], [0, to], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  // landing pop when the counter hits its target
  const landed = startFrame + durationFrames;
  const pop = interpolate(frame, [landed, landed + 2, landed + 6], [1, 1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        fontFamily: BRAND_FONT,
        fontSize,
        color: ACCENT,
        lineHeight: 1,
        transform: `scale(${pop})`,
        transformOrigin: "left center",
        textShadow: "0 6px 30px rgba(0,0,0,0.7)",
      }}
    >
      {value}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Meme prop: masked rounded card, drop shadow, spring in, slow Ken Burns
// ---------------------------------------------------------------------------
const MemeProp: React.FC<{
  src: string;
  startFrame: number;
  width: number;
  tilt?: number;
  kenBurnsFrames: number;
  backing?: boolean; // light card frame for dark source images
  slideIn?: boolean; // slide in from the right instead of scale-pop
  popFrame?: number; // extra pop accent (e.g. on the 609 landing)
}> = ({ src, startFrame, width, tilt = -2, kenBurnsFrames, backing, slideIn, popFrame }) => {
  const frame = useCurrentFrame();
  const s = spring({
    frame: frame - startFrame,
    fps: FPS,
    config: { damping: 13, stiffness: 140, mass: 0.9 },
  });
  // Ken Burns: slow drift in scale + slight rotation so holds never freeze
  const kb = interpolate(frame, [startFrame, startFrame + kenBurnsFrames], [1, 1.035], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotDrift = interpolate(
    frame,
    [startFrame, startFrame + kenBurnsFrames],
    [0, 0.8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = interpolate(frame - startFrame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slideX = slideIn ? (1 - s) * 140 : 0;
  const pop =
    popFrame !== undefined
      ? interpolate(frame, [popFrame, popFrame + 2, popFrame + 7], [1, 1.07, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        ...(backing
          ? {
              padding: 12,
              backgroundColor: "#e8e4dc",
              boxShadow:
                "0 24px 70px rgba(0,0,0,0.75), 0 0 0 2px rgba(242,239,233,0.4)",
            }
          : {
              boxShadow:
                "0 24px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(242,239,233,0.12)",
            }),
        transform: `translateX(${slideX}px) rotate(${tilt + rotDrift}deg) scale(${
          (slideIn ? 0.9 + 0.1 * s : 0.85 + 0.15 * s) * pop
        })`,
        opacity,
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          display: "block",
          borderRadius: backing ? 8 : 0,
          transform: `scale(${kb})`,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene wrapper: unified bg + crossfade in/out
// ---------------------------------------------------------------------------
// Scenes never overlap: a "fade" transition fades the outgoing scene fully
// to the background, then fades the incoming one in (no text-on-text mush).
const SceneShell: React.FC<{
  durationInFrames: number;
  transitionIn: string;
  nextIsFade: boolean;
  isLast: boolean;
  children: React.ReactNode;
}> = ({ durationInFrames, transitionIn, nextIsFade, isLast, children }) => {
  const frame = useCurrentFrame();
  const fadeIn =
    transitionIn === "fade"
      ? interpolate(frame, [0, FADE], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const fadeOut = isLast
    ? interpolate(
        frame,
        [durationInFrames - END_FADE, durationInFrames - 1],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : nextIsFade
    ? interpolate(frame, [durationInFrames - FADE, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>{children}</AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
// Pre-computed line breaks so the typewriter never reflows mid-word
// ("file PRs" stays together).
const HOOK_LINES = ["your agent can write code,", "file PRs, book flights."];
const HOOK_CPF = 1.7;
const HOOK_TYPE_START = 18; // punchline flash holds frames 0-17
const HOOK_LINE_STARTS = HOOK_LINES.reduce<number[]>((acc, _, i) => {
  const prev = HOOK_LINES.slice(0, i).reduce((a, l) => a + l.length, 0);
  acc.push(HOOK_TYPE_START + Math.ceil(prev / HOOK_CPF));
  return acc;
}, []);
const HOOK_PUNCH = 70; // punchline snap-in (2.33s, on the music accent)

const HookScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const flash = frame < HOOK_TYPE_START;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 110 }}>
      {flash ? (
        // frame 0: bold yellow punchline fills the thumbnail
        <PopTitle
          text={textFor(scene, "title")}
          startFrame={0}
          fontSize={118}
          color={ACCENT}
          snap
        />
      ) : (
        <div style={{ textAlign: "center", maxWidth: 900 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 40,
              color: "rgba(242,239,233,0.85)",
              lineHeight: 1.6,
            }}
          >
            {HOOK_LINES.map((line, i) => (
              <div key={i} style={{ whiteSpace: "pre", minHeight: "1.6em" }}>
                {frame >= HOOK_LINE_STARTS[i] ? (
                  <Typewriter
                    text={line}
                    startFrame={HOOK_LINE_STARTS[i]}
                    charsPerFrame={HOOK_CPF}
                    hideCursorWhenDone={i < HOOK_LINES.length - 1 || frame >= HOOK_PUNCH}
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ height: 48 }} />
          {frame >= HOOK_PUNCH ? (
            <PopTitle
              text={textFor(scene, "title")}
              startFrame={HOOK_PUNCH}
              fontSize={104}
              color={ACCENT}
              snap
            />
          ) : null}
        </div>
      )}
    </AbsoluteFill>
  );
};

const RevealScene: React.FC<{ scene: Scene; durationInFrames: number }> = ({
  scene,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const subOpacity = interpolate(frame, [8, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glitch = frame >= 2 && frame <= 10 && frame % 3 !== 0;
  // idle life: slow scale drift + letter tracking-in on the wordmark
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.03]);
  const tracking = interpolate(frame, [0, durationInFrames], [9, 3]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          textAlign: "center",
          position: "relative",
          transform: `scale(${drift})`,
        }}
      >
        {glitch ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: BRAND_FONT,
              fontSize: 150,
              letterSpacing: 4,
              color: ACCENT,
              opacity: 0.5,
              transform: `translate(${frame % 2 === 0 ? 6 : -6}px, 0)`,
            }}
          >
            {textFor(scene, "title")}
          </div>
        ) : null}
        <PopTitle
          text={textFor(scene, "title")}
          startFrame={2}
          fontSize={150}
          style={{ letterSpacing: tracking }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 38,
            color: ACCENT,
            marginTop: 30,
            letterSpacing: 3,
            opacity: subOpacity,
          }}
        >
          {textFor(scene, "subtitle")}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DEMO_JSON = [
  "{",
  '  "template": "drake",',
  '  "texts": [',
  '    { "slot": "no",',
  '      "text": "manual editors" },',
  '    { "slot": "yes",',
  '      "text": "a tool for agents" }',
  "  ]",
  "}",
];

const DEMO_CPF = 2.4; // typing speed, chars per frame
const DEMO_STARTS = DEMO_JSON.reduce<number[]>((acc, _, i) => {
  const prevChars = DEMO_JSON.slice(0, i).reduce((a, l) => a + l.length, 0);
  acc.push(8 + Math.ceil(prevChars / DEMO_CPF));
  return acc;
}, []);
const DEMO_TYPING_END =
  8 + Math.ceil(DEMO_JSON.reduce((a, l) => a + l.length, 0) / DEMO_CPF);

const DemoScene: React.FC<{ scene: Scene; durationInFrames: number }> = ({
  scene,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const arrowOpacity = interpolate(
    frame,
    [DEMO_TYPING_END - 10, DEMO_TYPING_END - 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 118, width: "100%", textAlign: "center" }}>
        <PopTitle text={textFor(scene, "title")} startFrame={2} fontSize={66} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          marginTop: 70,
        }}
      >
        {/* terminal card */}
        <div
          style={{
            width: 520,
            borderRadius: 14,
            backgroundColor: "#161b22",
            boxShadow: "0 18px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(242,239,233,0.12)",
            padding: "22px 26px",
            fontFamily: MONO,
            fontSize: 21,
            lineHeight: 1.5,
            color: INK,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: c }} />
            ))}
          </div>
          {DEMO_JSON.map((line, i) => {
            const lineStart = DEMO_STARTS[i];
            const isLastLine = i === DEMO_JSON.length - 1;
            return (
              <div key={i} style={{ whiteSpace: "pre", minHeight: "1.5em" }}>
                {frame >= lineStart ? (
                  <Typewriter
                    text={line}
                    startFrame={lineStart}
                    charsPerFrame={DEMO_CPF}
                    // cursor keeps blinking on the last line: terminal stays alive
                    hideCursorWhenDone={!isLastLine}
                    cursorColor={ACCENT}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: BRAND_FONT,
            fontSize: 60,
            color: ACCENT,
            opacity: arrowOpacity,
          }}
        >
          →
        </div>
        <MemeProp
          src={staticFile("scene2-drake.png")}
          startFrame={DEMO_TYPING_END + 2}
          width={380}
          tilt={2.5}
          kenBurnsFrames={durationInFrames - (DEMO_TYPING_END + 2)}
        />
      </div>
    </AbsoluteFill>
  );
};

const FeatureScene: React.FC<{
  scene: Scene;
  durationInFrames: number;
  tilt: number;
  cardWidth?: number;
  backing?: boolean;
}> = ({ scene, durationInFrames, tilt, cardWidth = 400, backing }) => {
  const frame = useCurrentFrame();
  const isCount = scene.text.some((t) => t.role === "countup");
  const img = scene.image ? staticFile(scene.image.replace(/^assets\//, "")) : null;
  // count-up: card slides in during the count and pops on the 609 landing
  const imgStart = isCount ? 14 : 8;
  const countLand = 4 + 40; // CountUp startFrame + durationFrames
  // dimmed label visible from the first frame, full strength on landing
  const labelOpacity = isCount
    ? interpolate(frame, [countLand - 2, countLand + 4], [0.4, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 60,
          padding: "0 90px",
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          {isCount ? (
            <CountUp to={609} startFrame={4} durationFrames={40} fontSize={230} />
          ) : null}
          <PopTitle
            text={textFor(scene, "title")}
            startFrame={isCount ? 0 : 3}
            fontSize={isCount ? 64 : 72}
            style={{ textAlign: "left", opacity: labelOpacity }}
          />
          {textFor(scene, "subtitle") ? (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 27,
                color: ACCENT,
                marginTop: 26,
                letterSpacing: 1,
                lineHeight: 1.7,
              }}
            >
              {textFor(scene, "subtitle")
                .split(" · ")
                .map((part, i) => {
                  const o = interpolate(frame, [14 + i * 4, 22 + i * 4], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  return (
                    <div
                      key={i}
                      style={{
                        whiteSpace: "nowrap",
                        opacity: o,
                        transform: `translateY(${(1 - o) * 10}px)`,
                      }}
                    >
                      {"· "}
                      {part}
                    </div>
                  );
                })}
            </div>
          ) : null}
        </div>
        {img ? (
          <MemeProp
            src={img}
            startFrame={imgStart}
            width={cardWidth}
            tilt={tilt}
            kenBurnsFrames={durationInFrames - imgStart}
            backing={backing}
            slideIn={isCount}
            popFrame={isCount ? countLand : undefined}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Six unique templates (none reused from earlier scenes), all with 1-2 large
// captions and similar aspect ratios so cover-fit crops almost nothing.
const PROOF_IMAGES = [
  "proof-this-is-fine.png",
  "proof-disaster-girl.png",
  "proof-futurama-fry.png",
  "proof-buff-doge.png",
  "proof-tuxedo-pooh.png",
  "scene7-change-my-mind.png",
];

const ProofScene: React.FC<{ scene: Scene; durationInFrames: number }> = ({
  scene,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  // subtle drift keeps the held grid alive
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.02]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 96, width: "100%", textAlign: "center" }}>
        <PopTitle text={textFor(scene, "title")} startFrame={2} fontSize={52} />
      </div>
      {/* grid vertically centered between headline (~180px) and footer (~90px) */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 180,
          paddingBottom: 90,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 296px)",
            gap: 26,
            justifyContent: "center",
            transform: `scale(${drift})`,
          }}
        >
          {PROOF_IMAGES.map((name, i) => {
            const s = spring({
              frame: frame - (2 + i * 2),
              fps: FPS,
              config: { damping: 12, stiffness: 170, mass: 0.7 },
            });
            return (
              <div
                key={i}
                style={{
                  width: 296,
                  height: 222,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "#161b22",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(242,239,233,0.1)",
                  transform: `rotate(${i % 2 === 0 ? -2 : 2}deg) scale(${0.7 + 0.3 * s})`,
                  opacity: Math.min(1, s * 1.4),
                }}
              >
                <Img
                  src={staticFile(name)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CTA_CURL =
  "curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh";

const CtaScene: React.FC<{ scene: Scene; durationInFrames: number }> = ({
  scene,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const urlOpacity = interpolate(frame, [24, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const actionOpacity = interpolate(frame, [32, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // wordmark shimmer: slow tracking drift keeps the hold alive
  const tracking = interpolate(frame, [0, durationInFrames], [2, 5]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", width: "100%" }}>
        <PopTitle
          text={textFor(scene, "title")}
          startFrame={0}
          fontSize={120}
          snap
          style={{ letterSpacing: tracking }}
        />
        {/* one clean line: mono sized to fit the full curl command */}
        <div
          style={{
            margin: "40px auto 0",
            width: 1000,
            borderRadius: 14,
            backgroundColor: "#161b22",
            boxShadow: "0 18px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,212,0,0.35)",
            padding: "28px 22px",
            fontFamily: MONO,
            fontSize: 17,
            lineHeight: 1.6,
            color: ACCENT,
            textAlign: "center",
            whiteSpace: "pre",
          }}
        >
          <span style={{ color: DIM }}>$ </span>
          <Typewriter
            text={CTA_CURL}
            startFrame={4}
            charsPerFrame={6}
            cursorColor={ACCENT}
          />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 34,
            color: INK,
            marginTop: 36,
            letterSpacing: 1.5,
            opacity: urlOpacity,
          }}
        >
          {textFor(scene, "subtitle")}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: ACCENT,
            marginTop: 18,
            letterSpacing: 2,
            opacity: actionOpacity,
          }}
        >
          one curl. no npm. link below ↓
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderScene = (scene: Scene, durationInFrames: number): React.ReactNode => {
  switch (scene.id) {
    case "hook":
      return <HookScene scene={scene} />;
    case "reveal":
      return <RevealScene scene={scene} durationInFrames={durationInFrames} />;
    case "demo":
      return <DemoScene scene={scene} durationInFrames={durationInFrames} />;
    case "surfaces":
      return <FeatureScene scene={scene} durationInFrames={durationInFrames} tilt={-3} />;
    case "deterministic":
      return (
        <FeatureScene
          scene={scene}
          durationInFrames={durationInFrames}
          tilt={2.5}
          cardWidth={540}
          backing
        />
      );
    case "templates":
      return <FeatureScene scene={scene} durationInFrames={durationInFrames} tilt={-2} />;
    case "proof":
      return <ProofScene scene={scene} durationInFrames={durationInFrames} />;
    case "cta":
      return <CtaScene scene={scene} durationInFrames={durationInFrames} />;
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Root composition
// ---------------------------------------------------------------------------
const Launch: React.FC = () => {
  useBrandFont();
  const { durationInFrames: total } = useVideoConfig();
  const frame = useCurrentFrame();
  // track is mastered to -14 LUFS with its own 0.5s ending fade; play at
  // full volume and only mirror the final picture fade
  const musicVolume = interpolate(frame, [0, total - END_FADE, total - 1], [1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  let offset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile("music-v3.mp3")} volume={() => musicVolume} />
      <BackgroundTexture />
      {scenes.map((scene, i) => {
        const durationInFrames = sceneFrames[i];
        const from = offset;
        offset += durationInFrames;
        const isLast = i === scenes.length - 1;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <SceneShell
              durationInFrames={durationInFrames}
              transitionIn={i > 0 ? scene.transition : "cut"}
              nextIsFade={!isLast && scenes[i + 1].transition === "fade"}
              isLast={isLast}
            >
              {renderScene(scene, durationInFrames)}
            </SceneShell>
          </Sequence>
        );
      })}
      <Vignette />
      <HUD />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="Launch"
    component={Launch}
    durationInFrames={totalFrames}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);

registerRoot(Root);
