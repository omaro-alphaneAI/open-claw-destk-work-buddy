function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const AVATAR_SURFACE_PROFILES = Object.freeze({
  cat: Object.freeze({
    key: "cat",
    attach: Object.freeze({
      floorBleedBias: -2,
      wallBleedBias: 10,
      ceilingBleedBias: 0,
      wallLiftWindow: 8,
      wallLiftDisplay: 40,
      wallVelocityInfluence: 2.2,
      ceilingShiftWindow: 30,
      ceilingShiftDisplay: 48
    }),
    renderer: Object.freeze({
      bobBase: 2.6,
      wall: Object.freeze({
        rootRotationLeft: -88,
        rootRotationRight: 88,
        rootShiftXLeft: 10,
        rootShiftXRight: -10,
        rootLift: 1,
        rootScaleX: 0.992,
        rootScaleY: 1.018,
        artShiftXLeft: 8,
        artShiftXRight: -8,
        artShiftY: -6,
        shadowShiftXLeft: 12,
        shadowShiftXRight: -12,
        shadowOpacity: 0.18,
        rootOriginLeft: "14% 54%",
        rootOriginRight: "86% 54%",
        artOriginLeft: "16% 52%",
        artOriginRight: "84% 52%"
      })
    })
  }),
  kuribou: Object.freeze({
    key: "kuribou",
    attach: Object.freeze({
      floorBleedBias: 0,
      wallBleedBias: 4,
      ceilingBleedBias: 0,
      wallLiftWindow: 12,
      wallLiftDisplay: 46,
      wallVelocityInfluence: 2.8,
      ceilingShiftWindow: 34,
      ceilingShiftDisplay: 54
    }),
    renderer: Object.freeze({
      bobBase: 2.7,
      wall: Object.freeze({
        rootRotationLeft: 0,
        rootRotationRight: 0,
        rootShiftXLeft: -18,
        rootShiftXRight: 18,
        rootLift: 10,
        rootScaleX: 1,
        rootScaleY: 1.02,
        artShiftXLeft: -4,
        artShiftXRight: 4,
        artShiftY: -6,
        shadowShiftXLeft: -10,
        shadowShiftXRight: 10,
        shadowOpacity: 0.28,
        rootOriginLeft: "20% 48%",
        rootOriginRight: "80% 48%",
        artOriginLeft: "22% 46%",
        artOriginRight: "78% 46%"
      })
    })
  }),
  custom: Object.freeze({
    key: "custom",
    attach: Object.freeze({
      floorBleedBias: -1,
      wallBleedBias: 8,
      ceilingBleedBias: 0,
      wallLiftWindow: 10,
      wallLiftDisplay: 42,
      wallVelocityInfluence: 2.4,
      ceilingShiftWindow: 30,
      ceilingShiftDisplay: 48
    }),
    renderer: Object.freeze({
      bobBase: 2.4,
      wall: Object.freeze({
        rootRotationLeft: -16,
        rootRotationRight: 16,
        rootShiftXLeft: 8,
        rootShiftXRight: -8,
        rootLift: 6,
        rootScaleX: 0.99,
        rootScaleY: 1.02,
        artShiftXLeft: 6,
        artShiftXRight: -6,
        artShiftY: -4,
        shadowShiftXLeft: 8,
        shadowShiftXRight: -8,
        shadowOpacity: 0.22,
        rootOriginLeft: "18% 56%",
        rootOriginRight: "82% 56%",
        artOriginLeft: "18% 52%",
        artOriginRight: "82% 52%"
      })
    })
  })
});

function resolveAvatarMode(input) {
  return input === "cat" || input === "custom" ? input : "kuribou";
}

function getAvatarSurfaceProfile(avatarMode = "kuribou") {
  return AVATAR_SURFACE_PROFILES[resolveAvatarMode(avatarMode)];
}

function deriveActorSurfaceInsets(bounds = {}, avatarMode = "kuribou") {
  const width = Number(bounds.width) || 0;
  const height = Number(bounds.height) || 0;
  const attach = getAvatarSurfaceProfile(avatarMode).attach;

  return {
    floorBleed: clampToRange(
      Math.round(Math.min(18, Math.max(10, height * 0.068)) + attach.floorBleedBias),
      8,
      24
    ),
    wallBleed: clampToRange(
      Math.round(Math.min(16, Math.max(8, width * 0.07)) + attach.wallBleedBias),
      8,
      28
    ),
    ceilingBleed: clampToRange(
      Math.round(Math.min(10, Math.max(4, height * 0.036)) + attach.ceilingBleedBias),
      4,
      16
    )
  };
}

function buildSurfaceClingState(mode = "idle", avatarMode = "kuribou") {
  if (mode !== "climb-left" && mode !== "climb-right") {
    return null;
  }

  const wall = getAvatarSurfaceProfile(avatarMode).renderer.wall;
  const isLeft = mode === "climb-left";

  return {
    kind: "wall",
    side: isLeft ? "left" : "right",
    rootRotation: isLeft ? wall.rootRotationLeft : wall.rootRotationRight,
    rootShiftX: isLeft ? wall.rootShiftXLeft : wall.rootShiftXRight,
    rootLift: wall.rootLift,
    rootScaleX: wall.rootScaleX,
    rootScaleY: wall.rootScaleY,
    artShiftX: isLeft ? wall.artShiftXLeft : wall.artShiftXRight,
    artShiftY: wall.artShiftY,
    shadowShiftX: isLeft ? wall.shadowShiftXLeft : wall.shadowShiftXRight,
    shadowOpacity: wall.shadowOpacity,
    rootOrigin: isLeft ? wall.rootOriginLeft : wall.rootOriginRight,
    artOrigin: isLeft ? wall.artOriginLeft : wall.artOriginRight
  };
}

module.exports = {
  buildSurfaceClingState,
  deriveActorSurfaceInsets,
  getAvatarSurfaceProfile,
  resolveAvatarMode
};
