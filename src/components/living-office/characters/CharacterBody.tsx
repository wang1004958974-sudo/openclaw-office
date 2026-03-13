import {
  BODY_GRADIENT_FROM,
  BODY_GRADIENT_TO,
  BODY_RADIUS,
  BODY_SIZE,
  CHARACTER_SIZE,
  HEAD_SIZE,
  SHADOW_COLOR,
  SKIN_COLOR,
  TAG_BG,
  TAG_COLOR,
} from "./constants";

interface CharacterBodyProps {
  name: string;
  cssClass: string;
}

export function CharacterBody({ name, cssClass }: CharacterBodyProps) {
  return (
    <div
      className={`lo-char-body ${cssClass}`}
      style={{
        position: "relative",
        width: CHARACTER_SIZE,
        height: CHARACTER_SIZE + 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Tag (name label) */}
      <div
        className="lo-char-tag"
        style={{
          position: "absolute",
          top: -18,
          left: "50%",
          transform: "translateX(-50%) translateZ(18px)",
          fontSize: 10,
          fontWeight: 600,
          color: TAG_COLOR,
          background: TAG_BG,
          borderRadius: 8,
          padding: "1px 8px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          lineHeight: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {name}
      </div>

      {/* Head */}
      <div
        className="lo-char-head"
        style={{
          width: HEAD_SIZE,
          height: HEAD_SIZE,
          borderRadius: "50%",
          background: SKIN_COLOR,
          boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.2)`,
          flexShrink: 0,
          zIndex: 2,
        }}
      />

      {/* Body */}
      <div
        className="lo-char-torso"
        style={{
          width: BODY_SIZE,
          height: BODY_SIZE,
          borderRadius: `${BODY_RADIUS}px ${BODY_RADIUS}px 6px 6px`,
          background: `linear-gradient(180deg, ${BODY_GRADIENT_FROM}, ${BODY_GRADIENT_TO})`,
          marginTop: -3,
          boxShadow: `0 0 12px rgba(92,200,255,0.25), 0 4px 12px rgba(0,0,0,0.3)`,
          zIndex: 1,
        }}
      />

      {/* Shadow */}
      <div
        className="lo-char-shadow"
        style={{
          width: BODY_SIZE + 4,
          height: 6,
          borderRadius: "50%",
          background: SHADOW_COLOR,
          filter: "blur(4px)",
          marginTop: 2,
          zIndex: 0,
        }}
      />
    </div>
  );
}
