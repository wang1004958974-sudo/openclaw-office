import { useEffect, useRef, useState } from "react";
import { transition, resetToIdle } from "@/perception/state-machine";
import type { PerceivedAgentState, PerceivedKind } from "@/perception/types";
import { CharacterBody } from "./CharacterBody";
import {
  AGENT_HOME_POSITIONS,
  CHARACTER_SIZE,
  CHARACTER_Z,
  MOVE_DURATION_MS,
  MOVE_EASING,
  type Position2D,
} from "./constants";

interface AgentCharacter2D5Props {
  agentId: string;
  deskId: string;
  name: string;
  perceivedState: PerceivedAgentState;
  eventKind?: PerceivedKind;
  targetPosition?: Position2D;
}

export function AgentCharacter2D5({
  agentId,
  deskId,
  name,
  perceivedState,
  eventKind,
  targetPosition,
}: AgentCharacter2D5Props) {
  const homePos = AGENT_HOME_POSITIONS[deskId] ?? { left: 0, top: 0 };
  const [internalState, setInternalState] = useState<PerceivedAgentState>("IDLE");
  const [cssClass, setCssClass] = useState("idle");
  const [walking, setWalking] = useState(false);
  const [position, setPosition] = useState<Position2D>(homePos);
  const prevStateRef = useRef<PerceivedAgentState>("IDLE");
  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Process state transitions
  useEffect(() => {
    if (!eventKind) return;

    const result = transition(prevStateRef.current, eventKind);
    prevStateRef.current = result.nextState;
    setInternalState(result.nextState);
    setCssClass(result.visual.cssClass);

    if (result.visual.shouldMove && targetPosition) {
      setWalking(true);
      setPosition(targetPosition);

      clearTimeout(walkTimerRef.current);
      walkTimerRef.current = setTimeout(() => {
        setWalking(false);
      }, MOVE_DURATION_MS);
    }
  }, [eventKind, targetPosition]);

  // Sync external state for direct state override (from ProjectionStore)
  useEffect(() => {
    if (perceivedState !== internalState && !eventKind) {
      prevStateRef.current = perceivedState;
      setInternalState(perceivedState);
      setCssClass(getCssClassForState(perceivedState));
    }
  }, [perceivedState, internalState, eventKind]);

  // DONE → IDLE auto-transition
  useEffect(() => {
    if (internalState !== "DONE") return;
    const timer = setTimeout(() => {
      const result = resetToIdle();
      prevStateRef.current = result.nextState;
      setInternalState(result.nextState);
      setCssClass(result.visual.cssClass);
      setPosition(homePos);
    }, 1200);
    return () => clearTimeout(timer);
  }, [internalState, homePos]);

  // RETURNING → walk home
  useEffect(() => {
    if (internalState !== "RETURNING") return;
    setWalking(true);
    setPosition(homePos);
    const timer = setTimeout(() => {
      setWalking(false);
    }, MOVE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [internalState, homePos]);

  // Cleanup walk timers
  useEffect(() => {
    return () => clearTimeout(walkTimerRef.current);
  }, []);

  const stateClasses = [
    `lo-char-state-${cssClass}`,
    walking ? "lo-char-walking" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-agent-id={agentId}
      data-agent-state={internalState}
      className={`lo-character ${stateClasses}`}
      style={{
        position: "absolute",
        left: position.left - CHARACTER_SIZE / 2,
        top: position.top - CHARACTER_SIZE / 2,
        width: CHARACTER_SIZE,
        transform: `translateZ(${CHARACTER_Z}px)`,
        transition: walking
          ? `left ${MOVE_DURATION_MS}ms ${MOVE_EASING}, top ${MOVE_DURATION_MS}ms ${MOVE_EASING}`
          : "none",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <CharacterBody name={name} cssClass={stateClasses} />
    </div>
  );
}

function getCssClassForState(state: PerceivedAgentState): string {
  const map: Record<PerceivedAgentState, string> = {
    IDLE: "idle",
    INCOMING: "incoming",
    ACK: "ack",
    WORKING: "working",
    TOOL_CALL: "tool-call",
    WAITING: "waiting",
    COLLABORATING: "collaborating",
    RETURNING: "returning",
    DONE: "done",
    BLOCKED: "blocked",
    RECOVERED: "recovered",
  };
  return map[state];
}
