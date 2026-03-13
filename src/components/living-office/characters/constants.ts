// Agent 角色系统常量——尺寸、颜色、坐标映射

// --- 角色尺寸 ---

export const CHARACTER_SIZE = 34;
export const HEAD_SIZE = 14;
export const BODY_SIZE = 22;
export const BODY_RADIUS = 12;

// --- 颜色 ---

export const SKIN_COLOR = "#ffd8b4";
export const BODY_GRADIENT_FROM = "#7dd5ff";
export const BODY_GRADIENT_TO = "#5c8dff";
export const SHADOW_COLOR = "rgba(0, 0, 0, 0.35)";
export const TAG_BG = "rgba(11, 18, 32, 0.75)";
export const TAG_COLOR = "#e8f1ff";

// --- 角色在等距空间中的浮起高度 ---

export const CHARACTER_Z = 18;

// --- Agent 初始工位坐标映射 ---
// 基于 config.ts 中 DESK_CONFIGS 的 position，角色偏移到桌面上方

const DESK_CHAR_OFFSET_X = 64;
const DESK_CHAR_OFFSET_Y = -8;

export interface Position2D {
  left: number;
  top: number;
}

export const AGENT_HOME_POSITIONS: Record<string, Position2D> = {
  "desk-gm": { left: 170 + DESK_CHAR_OFFSET_X, top: 430 + DESK_CHAR_OFFSET_Y },
  "desk-sales": { left: 390 + DESK_CHAR_OFFSET_X, top: 430 + DESK_CHAR_OFFSET_Y },
  "desk-ops": { left: 610 + DESK_CHAR_OFFSET_X, top: 430 + DESK_CHAR_OFFSET_Y },
  "desk-fin": { left: 280 + DESK_CHAR_OFFSET_X, top: 590 + DESK_CHAR_OFFSET_Y },
  "desk-it": { left: 520 + DESK_CHAR_OFFSET_X, top: 590 + DESK_CHAR_OFFSET_Y },
};

// --- 区域目标坐标映射 ---

export const POSITION_MAP: Record<string, Position2D> = {
  ...AGENT_HOME_POSITIONS,
  gateway: { left: 238, top: 184 },
  ops: { left: 675, top: 180 },
  cron: { left: 1100, top: 170 },
  project: { left: 1100, top: 435 },
  memory: { left: 1095, top: 625 },
  whiteboard: { left: 675, top: 180 },
};

// --- 项目室 Sub-agent 坐标位 ---

export const SUB_AGENT_SLOTS: Position2D[] = [
  { left: 1020, top: 400 },
  { left: 1100, top: 460 },
  { left: 1180, top: 400 },
];

export const MAX_SUB_AGENTS = 3;

// --- 移动动画参数 ---

export const MOVE_DURATION_MS = 900;
export const MOVE_EASING = "cubic-bezier(.25, .9, .2, 1)";
export const WALK_BOB_DURATION = "0.5s";
