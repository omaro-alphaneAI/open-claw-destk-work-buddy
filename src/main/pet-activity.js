const DEFAULT_ACTIVITY_LEVEL = "low";
const ACTIVITY_LEVEL_OPTIONS = Object.freeze([
  {
    value: "low",
    label: "低活跃",
    hint: "大部分时间待着，偶尔巡场。"
  },
  {
    value: "medium",
    label: "标准",
    hint: "有存在感，但不一直乱动。"
  },
  {
    value: "high",
    label: "高活跃",
    hint: "更爱巡场、跳边和追着跑。"
  }
]);
const ACTIVITY_PROFILES = Object.freeze({
  low: Object.freeze({
    roamIntervalMs: 30_000,
    cloneRoamIntervalMs: 24_000,
    mouseStealMs: 12_000,
    cloneTickSkipChance: 0.38,
    main: Object.freeze({
      defaultSettleBias: 2,
      restLoops: 3,
      roamLoops: 1,
      poopChance: 0.02,
      cloneSpawnChance: 0.024,
      cloneSpawnPullChance: 0.01,
      cursorChaseChance: 0.03,
      wallPounceChance: 0.12,
      ceilingPounceChance: 0.1,
      windowPounceChance: 0.14,
      edgeClimbChance: 0.58,
      wallLoopsBeforeDescend: 2,
      ceilingLoops: 2,
      ceilingDropChance: 0.05,
      runChance: 0.04,
      crawlChance: 0.46,
      durationScale: 1.18
    }),
    clone: Object.freeze({
      defaultSettleBias: 3,
      restLoops: 4,
      roamLoops: 1,
      poopChance: 0.01,
      cloneSpawnChance: 0.012,
      cloneSpawnPullChance: 0.005,
      cursorChaseChance: 0.015,
      wallPounceChance: 0.08,
      ceilingPounceChance: 0.06,
      windowPounceChance: 0.08,
      edgeClimbChance: 0.44,
      wallLoopsBeforeDescend: 1,
      ceilingLoops: 1,
      ceilingDropChance: 0.03,
      runChance: 0.02,
      crawlChance: 0.42,
      durationScale: 1.26
    })
  }),
  medium: Object.freeze({
    roamIntervalMs: 22_000,
    cloneRoamIntervalMs: 16_000,
    mouseStealMs: 8_000,
    cloneTickSkipChance: 0.2,
    main: Object.freeze({
      defaultSettleBias: 1,
      restLoops: 2,
      roamLoops: 2,
      poopChance: 0.03,
      cloneSpawnChance: 0.05,
      cloneSpawnPullChance: 0.018,
      cursorChaseChance: 0.06,
      wallPounceChance: 0.22,
      ceilingPounceChance: 0.18,
      windowPounceChance: 0.22,
      edgeClimbChance: 0.68,
      wallLoopsBeforeDescend: 2,
      ceilingLoops: 2,
      ceilingDropChance: 0.08,
      runChance: 0.08,
      crawlChance: 0.36,
      durationScale: 1
    }),
    clone: Object.freeze({
      defaultSettleBias: 2,
      restLoops: 3,
      roamLoops: 1,
      poopChance: 0.015,
      cloneSpawnChance: 0.024,
      cloneSpawnPullChance: 0.01,
      cursorChaseChance: 0.03,
      wallPounceChance: 0.12,
      ceilingPounceChance: 0.1,
      windowPounceChance: 0.12,
      edgeClimbChance: 0.54,
      wallLoopsBeforeDescend: 2,
      ceilingLoops: 2,
      ceilingDropChance: 0.05,
      runChance: 0.05,
      crawlChance: 0.34,
      durationScale: 1.08
    })
  }),
  high: Object.freeze({
    roamIntervalMs: 16_000,
    cloneRoamIntervalMs: 11_000,
    mouseStealMs: 4_800,
    cloneTickSkipChance: 0.05,
    main: Object.freeze({
      defaultSettleBias: 0,
      restLoops: 1,
      roamLoops: 2,
      poopChance: 0.05,
      cloneSpawnChance: 0.08,
      cloneSpawnPullChance: 0.03,
      cursorChaseChance: 0.1,
      wallPounceChance: 0.3,
      ceilingPounceChance: 0.24,
      windowPounceChance: 0.28,
      edgeClimbChance: 0.76,
      wallLoopsBeforeDescend: 3,
      ceilingLoops: 3,
      ceilingDropChance: 0.12,
      runChance: 0.16,
      crawlChance: 0.24,
      durationScale: 0.86
    }),
    clone: Object.freeze({
      defaultSettleBias: 1,
      restLoops: 2,
      roamLoops: 2,
      poopChance: 0.025,
      cloneSpawnChance: 0.04,
      cloneSpawnPullChance: 0.014,
      cursorChaseChance: 0.05,
      wallPounceChance: 0.16,
      ceilingPounceChance: 0.14,
      windowPounceChance: 0.16,
      edgeClimbChance: 0.62,
      wallLoopsBeforeDescend: 2,
      ceilingLoops: 2,
      ceilingDropChance: 0.08,
      runChance: 0.08,
      crawlChance: 0.24,
      durationScale: 0.94
    })
  })
});

function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isValidActivityLevel(level) {
  return ACTIVITY_LEVEL_OPTIONS.some((option) => option.value === level);
}

function getActivityProfile(level = DEFAULT_ACTIVITY_LEVEL) {
  return ACTIVITY_PROFILES[isValidActivityLevel(level) ? level : DEFAULT_ACTIVITY_LEVEL];
}

function getActivityTimings(level = DEFAULT_ACTIVITY_LEVEL) {
  const profile = getActivityProfile(level);
  return {
    roamIntervalMs: profile.roamIntervalMs,
    cloneRoamIntervalMs: profile.cloneRoamIntervalMs,
    mouseStealMs: profile.mouseStealMs,
    cloneTickSkipChance: profile.cloneTickSkipChance
  };
}

function createCadenceState(actorKind = "main") {
  return {
    actorKind: actorKind === "clone" ? "clone" : "main",
    lane: "rest",
    restLoops: 0,
    roamLoops: 0,
    surfaceLoops: 0,
    settleBias: actorKind === "clone" ? 3 : 2,
    travelDirection: "left",
    surfaceTrack: "floor",
    cloneSpawnCooldown: actorKind === "clone" ? 2 : 1,
    burstCooldown: 0,
    lastSurface: "floor",
    lastAction: "floor-idle"
  };
}

function normalizeCadenceState(input = {}, actorKind = "main") {
  const defaults = createCadenceState(actorKind);
  const cleanActorKind = input.actorKind === "clone" ? "clone" : defaults.actorKind;

  return {
    actorKind: cleanActorKind,
    lane: ["rest", "travel", "surface"].includes(input.lane) ? input.lane : defaults.lane,
    restLoops: Number.isFinite(Number(input.restLoops)) ? Math.max(0, Number(input.restLoops)) : defaults.restLoops,
    roamLoops: Number.isFinite(Number(input.roamLoops)) ? Math.max(0, Number(input.roamLoops)) : defaults.roamLoops,
    surfaceLoops: Number.isFinite(Number(input.surfaceLoops)) ? Math.max(0, Number(input.surfaceLoops)) : defaults.surfaceLoops,
    settleBias: Number.isFinite(Number(input.settleBias)) ? Math.max(0, Number(input.settleBias)) : defaults.settleBias,
    travelDirection: input.travelDirection === "right" ? "right" : "left",
    surfaceTrack: typeof input.surfaceTrack === "string" && input.surfaceTrack.trim()
      ? input.surfaceTrack.trim()
      : defaults.surfaceTrack,
    cloneSpawnCooldown: Number.isFinite(Number(input.cloneSpawnCooldown))
      ? Math.max(0, Number(input.cloneSpawnCooldown))
      : defaults.cloneSpawnCooldown,
    burstCooldown: Number.isFinite(Number(input.burstCooldown))
      ? Math.max(0, Number(input.burstCooldown))
      : defaults.burstCooldown,
    lastSurface: ["floor", "wall", "ceiling", "air"].includes(input.lastSurface) ? input.lastSurface : defaults.lastSurface,
    lastAction: typeof input.lastAction === "string" && input.lastAction.trim()
      ? input.lastAction.trim()
      : defaults.lastAction
  };
}

function withCadence(cadence, patch = {}) {
  return {
    ...cadence,
    ...patch
  };
}

function decayCadence(cadence) {
  return withCadence(cadence, {
    settleBias: Math.max(0, cadence.settleBias - 1),
    burstCooldown: Math.max(0, cadence.burstCooldown - 1),
    cloneSpawnCooldown: Math.max(0, cadence.cloneSpawnCooldown - 1)
  });
}

function scaleDuration(baseMs, actorProfile) {
  return Math.max(420, Math.round(baseMs * (actorProfile?.durationScale || 1)));
}

function shouldRoll(random, chance) {
  return random() < chance;
}

function resolveSurface(contacts) {
  if (!contacts) {
    return "air";
  }

  if (contacts.onCeilingSurface) {
    return "ceiling";
  }

  if ((contacts.onWallSurface || contacts.onLeft || contacts.onRight) && !contacts.onFloorSurface) {
    return "wall";
  }

  if (contacts.onFloorSurface) {
    return "floor";
  }

  return "air";
}

function resolveDirectionFromBounds(bounds, leftX, rightX, fallback = "left") {
  const currentX = Number(bounds?.x) || 0;
  const midpoint = (Number(leftX) + Number(rightX)) / 2;
  return currentX >= midpoint ? "left" : "right";
}

function buildRestAction({
  cadence,
  actorProfile,
  behaviors,
  motionState,
  bounds,
  floorLeftX,
  floorRightX,
  onFloorEdge
}) {
  const cycle = onFloorEdge
    ? [behaviors.FLOOR_SIT, behaviors.FLOOR_DANGLE, behaviors.REST_LOAF, behaviors.FLOOR_GROOM]
    : [behaviors.FLOOR_SIT, behaviors.REST_LOAF, behaviors.FLOOR_GROOM];
  const behavior = cycle[cadence.restLoops % cycle.length];
  const facing = motionState?.facing || resolveDirectionFromBounds(bounds, floorLeftX, floorRightX, "left");
  const nextRestLoops = cadence.restLoops + 1;

  return {
    type: "enter",
    behavior,
    meta: {
      facing,
      durationMs: behavior === behaviors.FLOOR_GROOM
        ? scaleDuration(1500, actorProfile)
        : behavior === behaviors.FLOOR_DANGLE
          ? scaleDuration(2400, actorProfile)
          : behavior === behaviors.REST_LOAF
            ? scaleDuration(2200, actorProfile)
            : scaleDuration(1800, actorProfile)
    },
    cadence: withCadence(cadence, {
      lane: nextRestLoops >= actorProfile.restLoops ? "travel" : "rest",
      restLoops: nextRestLoops,
      roamLoops: 0,
      surfaceLoops: 0,
      lastSurface: "floor",
      lastAction: behavior
    })
  };
}

function buildEdgeClimbAction({
  cadence,
  contacts,
  bounds,
  behaviors,
  actorProfile,
  floorLeftX,
  floorRightX,
  random = Math.random
}) {
  const edgeOnLeft = Math.abs(bounds.x - floorLeftX) <= Math.abs(bounds.x - floorRightX);
  const targetY = contacts.windowSurface && contacts.onWindowTop
    ? contacts.windowSurface.sideTopY
    : Math.round(contacts.workArea.y + (contacts.workArea.height * (0.18 + (random() * 0.24))));
  const behavior = edgeOnLeft ? behaviors.EDGE_CLIMB_LEFT : behaviors.EDGE_CLIMB_RIGHT;

  return {
    type: "enter",
    behavior,
    meta: {
      targetX: edgeOnLeft ? floorLeftX : floorRightX,
      targetY,
      durationMs: scaleDuration(1700, actorProfile),
      facing: edgeOnLeft ? "left" : "right"
    },
    cadence: withCadence(cadence, {
      lane: "surface",
      restLoops: 0,
      roamLoops: 0,
      surfaceLoops: 1,
      settleBias: 0,
      travelDirection: edgeOnLeft ? "left" : "right",
      surfaceTrack: "wall-up",
      lastSurface: "wall",
      lastAction: behavior
    })
  };
}

function buildFloorTravelAction({
  cadence,
  actorProfile,
  behaviors,
  contacts,
  bounds,
  floorLeftX,
  floorRightX,
  floorSurfaceY,
  motionState,
  random = Math.random
}) {
  const midpoint = (floorLeftX + floorRightX) / 2;
  const defaultDirection = motionState?.facing === "right"
    ? "right"
    : motionState?.facing === "left"
      ? "left"
      : resolveDirectionFromBounds(bounds, floorLeftX, floorRightX, "left");
  const shouldReverse = cadence.travelDirection === "left"
    ? Math.abs(bounds.x - floorLeftX) <= 18
    : Math.abs(bounds.x - floorRightX) <= 18;
  const travelDirection = shouldReverse
    ? cadence.travelDirection === "left" ? "right" : "left"
    : cadence.travelDirection || defaultDirection;
  const targetX = travelDirection === "left" ? floorLeftX : floorRightX;
  const useRun = cadence.burstCooldown === 0 && shouldRoll(random, actorProfile.runChance);
  const useCrawl = !useRun && cadence.roamLoops === 0 && shouldRoll(random, actorProfile.crawlChance);
  const behavior = useRun
    ? behaviors.FLOOR_RUN
    : useCrawl
      ? behaviors.FLOOR_CRAWL
      : behaviors.FLOOR_WALK;
  const nextRoamLoops = cadence.roamLoops + 1;
  const nextLane = nextRoamLoops >= actorProfile.roamLoops ? "rest" : "travel";

  return {
    type: "enter",
    behavior,
    meta: {
      targetX,
      targetY: floorSurfaceY,
      durationMs: useRun
        ? scaleDuration(1700, actorProfile)
        : useCrawl
          ? scaleDuration(2800, actorProfile)
          : scaleDuration(2500, actorProfile),
      facing: travelDirection
    },
    cadence: withCadence(cadence, {
      lane: nextLane,
      restLoops: 0,
      roamLoops: nextRoamLoops,
      surfaceLoops: 0,
      settleBias: nextLane === "rest" ? actorProfile.defaultSettleBias : 0,
      travelDirection: targetX >= midpoint ? "right" : "left",
      burstCooldown: useRun ? 2 : cadence.burstCooldown,
      lastSurface: "floor",
      lastAction: behavior
    })
  };
}

function buildWindowPounceAction({
  cadence,
  actorProfile,
  behaviors,
  contacts,
  bounds
}) {
  const activeWindow = contacts.windowSurface;

  if (!activeWindow || contacts.onWindowTop) {
    return null;
  }

  const windowCenterX = activeWindow.bounds.x + (activeWindow.bounds.width / 2);
  const underWindow = bounds.x + bounds.width > activeWindow.bounds.x + 20
    && bounds.x < activeWindow.bounds.x + activeWindow.bounds.width - 20;
  const nearWindowBottom = Math.abs((bounds.y + bounds.height) - (activeWindow.bounds.y + activeWindow.bounds.height)) <= activeWindow.bounds.height * 0.45;
  const leftOfWindow = bounds.x < activeWindow.bounds.x - 36;
  const rightOfWindow = bounds.x > activeWindow.bounds.x + activeWindow.bounds.width - bounds.width + 36;

  if (underWindow) {
    const targetX = clampToRange(bounds.x, activeWindow.topLeftX, activeWindow.topRightX);
    return {
      type: "pounce",
      targetX,
      targetY: activeWindow.bottomY,
      meta: {
        landingBehavior: behaviors.CEILING_HANG,
        landingMode: "hang",
        facing: bounds.x >= windowCenterX ? "left" : "right",
        source: "window-under-pounce",
        durationMs: scaleDuration(820, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 1,
        settleBias: 0,
        surfaceTrack: "ceiling",
        lastSurface: "ceiling",
        lastAction: behaviors.CEILING_HANG
      })
    };
  }

  if (nearWindowBottom && leftOfWindow) {
    return {
      type: "pounce",
      targetX: activeWindow.leftX,
      targetY: clampToRange(bounds.y, activeWindow.sideTopY, activeWindow.sideBottomY),
      meta: {
        landingBehavior: behaviors.EDGE_CLIMB_LEFT,
        landingMode: "climb-left",
        facing: "left",
        source: "window-left-pounce",
        durationMs: scaleDuration(780, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 1,
        settleBias: 0,
        travelDirection: "left",
        surfaceTrack: "wall-up",
        lastSurface: "wall",
        lastAction: behaviors.EDGE_CLIMB_LEFT
      })
    };
  }

  if (nearWindowBottom && rightOfWindow) {
    return {
      type: "pounce",
      targetX: activeWindow.rightX,
      targetY: clampToRange(bounds.y, activeWindow.sideTopY, activeWindow.sideBottomY),
      meta: {
        landingBehavior: behaviors.EDGE_CLIMB_RIGHT,
        landingMode: "climb-right",
        facing: "right",
        source: "window-right-pounce",
        durationMs: scaleDuration(780, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 1,
        settleBias: 0,
        travelDirection: "right",
        surfaceTrack: "wall-up",
        lastSurface: "wall",
        lastAction: behaviors.EDGE_CLIMB_RIGHT
      })
    };
  }

  return null;
}

function buildSurfacePounceAction({
  cadence,
  actorProfile,
  behaviors,
  contacts,
  bounds,
  floorLeftX,
  floorRightX,
  random = Math.random
}) {
  const windowAction = buildWindowPounceAction({
    cadence,
    actorProfile,
    behaviors,
    contacts,
    bounds
  });

  if (windowAction) {
    return windowAction;
  }

  if (shouldRoll(random, actorProfile.wallPounceChance)) {
    const leapLeft = bounds.x > contacts.workArea.x + (contacts.workArea.width / 2);
    const leapTargetY = Math.round(contacts.workArea.y + (contacts.workArea.height * (0.56 + (random() * 0.18))));

    return {
      type: "pounce",
      targetX: leapLeft ? contacts.leftX : contacts.rightX,
      targetY: leapTargetY,
      meta: {
        landingBehavior: leapLeft ? behaviors.EDGE_CLIMB_LEFT : behaviors.EDGE_CLIMB_RIGHT,
        landingMode: leapLeft ? "climb-left" : "climb-right",
        facing: leapLeft ? "left" : "right",
        source: "eco-wall-pounce",
        durationMs: scaleDuration(760, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 1,
        settleBias: 0,
        travelDirection: leapLeft ? "left" : "right",
        surfaceTrack: "wall-up",
        lastSurface: "wall",
        lastAction: leapLeft ? behaviors.EDGE_CLIMB_LEFT : behaviors.EDGE_CLIMB_RIGHT
      })
    };
  }

  if (shouldRoll(random, actorProfile.ceilingPounceChance)) {
    const midpoint = (floorLeftX + floorRightX) / 2;
    const travelDirection = bounds.x > midpoint ? "left" : "right";
    const targetX = travelDirection === "left"
      ? Math.round(contacts.workArea.x + (contacts.workArea.width * (0.24 + (random() * 0.16))))
      : Math.round(contacts.workArea.x + (contacts.workArea.width * (0.56 + (random() * 0.16))));

    return {
      type: "pounce",
      targetX,
      targetY: contacts.topY,
      meta: {
        landingBehavior: behaviors.CEILING_HANG,
        landingMode: "hang",
        facing: travelDirection,
        source: "eco-ceiling-pounce",
        durationMs: scaleDuration(780, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 1,
        settleBias: 0,
        travelDirection,
        surfaceTrack: "ceiling",
        lastSurface: "ceiling",
        lastAction: behaviors.CEILING_HANG
      })
    };
  }

  return null;
}

function buildWallAction({
  cadence,
  actorProfile,
  behaviors,
  contacts,
  bounds,
  random = Math.random
}) {
  const side = contacts.onWindowLeft || contacts.onLeft ? "left" : "right";
  const climbBehavior = side === "left" ? behaviors.EDGE_CLIMB_LEFT : behaviors.EDGE_CLIMB_RIGHT;
  const nextSurfaceLoops = cadence.surfaceLoops + 1;
  const goUp = cadence.surfaceLoops < actorProfile.wallLoopsBeforeDescend;

  if (cadence.surfaceLoops === 0 || shouldRoll(random, 0.48)) {
    return {
      type: "enter",
      behavior: behaviors.WALL_IDLE,
      meta: {
        side,
        durationMs: scaleDuration(1500, actorProfile)
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        surfaceLoops: nextSurfaceLoops,
        restLoops: 0,
        roamLoops: 0,
        surfaceTrack: goUp ? "wall-up" : "wall-down",
        lastSurface: "wall",
        lastAction: behaviors.WALL_IDLE
      })
    };
  }

  const targetY = goUp
    ? contacts.wallSurfaceTopY
    : clampToRange(
        Math.round(contacts.wallSurfaceTopY + ((contacts.wallSurfaceBottomY - contacts.wallSurfaceTopY) * (0.62 + (random() * 0.16)))),
        contacts.wallSurfaceTopY,
        contacts.wallSurfaceBottomY
      );
  const reachedTop = Math.abs(bounds.y - contacts.wallSurfaceTopY) <= 24;

  if (reachedTop && goUp) {
    return {
      type: "enter",
      behavior: behaviors.CEILING_HANG,
      meta: {
        targetX: side === "left" ? contacts.ceilingSurfaceLeftX : contacts.ceilingSurfaceRightX,
        targetY: contacts.ceilingSurfaceY,
        durationMs: scaleDuration(2500, actorProfile),
        facing: side
      },
      cadence: withCadence(cadence, {
        lane: "surface",
        surfaceLoops: nextSurfaceLoops,
        restLoops: 0,
        roamLoops: 0,
        surfaceTrack: "ceiling",
        travelDirection: side,
        lastSurface: "ceiling",
        lastAction: behaviors.CEILING_HANG
      })
    };
  }

  return {
    type: "enter",
    behavior: climbBehavior,
    meta: {
      targetX: contacts.wallSurfaceX,
      targetY,
      durationMs: scaleDuration(goUp ? 1800 : 2100, actorProfile),
      facing: side
    },
    cadence: withCadence(cadence, {
      lane: "surface",
      surfaceLoops: nextSurfaceLoops,
      restLoops: 0,
      roamLoops: 0,
      surfaceTrack: goUp ? "wall-up" : "wall-down",
      travelDirection: side,
      lastSurface: "wall",
      lastAction: climbBehavior
    })
  };
}

function buildCeilingAction({
  cadence,
  actorProfile,
  behaviors,
  contacts,
  bounds,
  ceilingLeftX,
  ceilingRightX,
  random = Math.random
}) {
  const nextSurfaceLoops = cadence.surfaceLoops + 1;
  const currentDirection = cadence.travelDirection === "right" ? "right" : "left";
  const nearCurrentEdge = currentDirection === "left"
    ? Math.abs(bounds.x - ceilingLeftX) <= 22
    : Math.abs(bounds.x - ceilingRightX) <= 22;
  const nextDirection = nearCurrentEdge
    ? currentDirection === "left" ? "right" : "left"
    : currentDirection;

  if (
    nextSurfaceLoops > actorProfile.ceilingLoops &&
    shouldRoll(random, actorProfile.ceilingDropChance)
  ) {
    return {
      type: "enter",
      behavior: behaviors.THROW_FALL,
      meta: {
        velocityX: (nextDirection === "left" ? -1 : 1) * (1.6 + (random() * 1.1)),
        velocityY: 1.2
      },
      cadence: withCadence(cadence, {
        lane: "rest",
        restLoops: 0,
        roamLoops: 0,
        surfaceLoops: 0,
        settleBias: actorProfile.defaultSettleBias + 1,
        lastSurface: "air",
        lastAction: behaviors.THROW_FALL
      })
    };
  }

  return {
    type: "enter",
    behavior: behaviors.CEILING_HANG,
    meta: {
      targetX: nextDirection === "left" ? ceilingLeftX : ceilingRightX,
      targetY: contacts.ceilingSurfaceY,
      durationMs: scaleDuration(2700, actorProfile),
      facing: nextDirection
    },
    cadence: withCadence(cadence, {
      lane: "surface",
      restLoops: 0,
      roamLoops: 0,
      surfaceLoops: nextSurfaceLoops,
      settleBias: 0,
      travelDirection: nextDirection,
      surfaceTrack: "ceiling",
      lastSurface: "ceiling",
      lastAction: behaviors.CEILING_HANG
    })
  };
}

function maybeSpawnClone({
  cadence,
  actorProfile,
  hasDormantClone,
  random = Math.random
}) {
  if (!hasDormantClone || cadence.cloneSpawnCooldown > 0) {
    return null;
  }

  if (!shouldRoll(random, actorProfile.cloneSpawnChance)) {
    return null;
  }

  return {
    type: "spawn-clone",
    mode: shouldRoll(random, actorProfile.cloneSpawnPullChance) ? "pull" : "split",
    cadence: withCadence(cadence, {
      lane: "rest",
      restLoops: 0,
      roamLoops: 0,
      surfaceLoops: 0,
      settleBias: actorProfile.defaultSettleBias,
      cloneSpawnCooldown: 3,
      lastAction: "spawn-clone"
    })
  };
}

function maybeChaseCursor({
  cadence,
  actorProfile,
  behaviors,
  bounds,
  floorLeftX,
  floorRightX,
  floorSurfaceY,
  cursorPoint,
  random = Math.random
}) {
  if (!cursorPoint || !shouldRoll(random, actorProfile.cursorChaseChance)) {
    return null;
  }

  const cursorTargetX = clampToRange(
    cursorPoint.x - Math.round(bounds.width * 0.5),
    floorLeftX,
    floorRightX
  );
  const toCursor = cursorTargetX - bounds.x;

  if (Math.abs(toCursor) <= 32) {
    return null;
  }

  return {
    type: "enter",
    behavior: behaviors.FLOOR_RUN,
    meta: {
      targetX: cursorTargetX,
      targetY: floorSurfaceY,
      durationMs: scaleDuration(1700 + (Math.abs(toCursor) * 1.9), actorProfile),
      facing: toCursor >= 0 ? "right" : "left"
    },
    cadence: withCadence(cadence, {
      lane: "rest",
      restLoops: 0,
      roamLoops: cadence.roamLoops + 1,
      surfaceLoops: 0,
      settleBias: actorProfile.defaultSettleBias + 1,
      burstCooldown: 2,
      travelDirection: toCursor >= 0 ? "right" : "left",
      lastSurface: "floor",
      lastAction: behaviors.FLOOR_RUN
    })
  };
}

function maybePoopAction({
  cadence,
  actorProfile,
  behaviors,
  bounds,
  floorLeftX,
  floorRightX,
  motionState,
  onFloorEdge = false,
  random = Math.random
}) {
  if (
    !behaviors?.POOP ||
    onFloorEdge ||
    cadence.lastAction === behaviors.POOP ||
    !shouldRoll(random, actorProfile.poopChance || 0)
  ) {
    return null;
  }

  const facing = motionState?.facing || resolveDirectionFromBounds(bounds, floorLeftX, floorRightX, "left");

  return {
    type: "enter",
    behavior: behaviors.POOP,
    meta: {
      facing,
      durationMs: scaleDuration(1200, actorProfile)
    },
    cadence: withCadence(cadence, {
      lane: "rest",
      restLoops: 0,
      roamLoops: 0,
      surfaceLoops: 0,
      settleBias: actorProfile.defaultSettleBias + 1,
      lastSurface: "floor",
      lastAction: behaviors.POOP
    })
  };
}

function planNextBehaviorAction({
  actorKind = "main",
  activityLevel = DEFAULT_ACTIVITY_LEVEL,
  behaviors,
  bounds,
  contacts,
  motionState,
  cadence,
  hasDormantClone = false,
  cursorPoint = null,
  random = Math.random
} = {}) {
  if (!behaviors || !contacts || !bounds) {
    return null;
  }

  const profile = getActivityProfile(activityLevel)[actorKind === "clone" ? "clone" : "main"];
  const stableCadence = normalizeCadenceState(cadence, actorKind);
  const nextCadence = decayCadence(stableCadence);
  const floorLeftX = contacts.floorSurfaceLeftX ?? contacts.leftX;
  const floorRightX = contacts.floorSurfaceRightX ?? contacts.rightX;
  const floorSurfaceY = contacts.floorSurfaceY ?? contacts.floorY;
  const ceilingLeftX = contacts.ceilingSurfaceLeftX ?? contacts.leftX;
  const ceilingRightX = contacts.ceilingSurfaceRightX ?? contacts.rightX;
  const surface = resolveSurface(contacts);
  const onFloorEdge = Boolean(
    contacts.onFloorSurface &&
    (Math.abs(bounds.x - floorLeftX) <= 18 || Math.abs(bounds.x - floorRightX) <= 18)
  );
  const randomFloat = typeof random === "function" ? random : Math.random;

  if (surface === "ceiling") {
    return buildCeilingAction({
      cadence: withCadence(nextCadence, {
        lastSurface: "ceiling"
      }),
      actorProfile: profile,
      behaviors,
      contacts,
      bounds,
      ceilingLeftX,
      ceilingRightX,
      random: randomFloat
    });
  }

  if (surface === "wall") {
    return buildWallAction({
      cadence: withCadence(nextCadence, {
        lastSurface: "wall"
      }),
      actorProfile: profile,
      behaviors,
      contacts,
      bounds,
      random: randomFloat
    });
  }

  if (surface === "floor") {
    const spawnAction = maybeSpawnClone({
      cadence: nextCadence,
      actorProfile: profile,
      hasDormantClone,
      random: randomFloat
    });

    if (spawnAction) {
      return spawnAction;
    }

    const poopAction = maybePoopAction({
      cadence: nextCadence,
      actorProfile: profile,
      behaviors,
      bounds,
      floorLeftX,
      floorRightX,
      motionState,
      onFloorEdge,
      random: randomFloat
    });

    if (poopAction) {
      return poopAction;
    }

    const restAction = buildRestAction({
      cadence: nextCadence,
      actorProfile: profile,
      behaviors,
      motionState,
      bounds,
      floorLeftX,
      floorRightX,
      onFloorEdge
    });

    const shouldStayResting = nextCadence.lane !== "travel" || nextCadence.settleBias > 0 || nextCadence.restLoops < profile.restLoops;

    if (shouldStayResting) {
      return restAction;
    }

    if (onFloorEdge && shouldRoll(randomFloat, profile.edgeClimbChance)) {
      return buildEdgeClimbAction({
        cadence: nextCadence,
        contacts,
        bounds,
        behaviors,
        actorProfile: profile,
        floorLeftX,
        floorRightX,
        random: randomFloat
      });
    }

    const cursorAction = maybeChaseCursor({
      cadence: nextCadence,
      actorProfile: profile,
      behaviors,
      bounds,
      floorLeftX,
      floorRightX,
      floorSurfaceY,
      cursorPoint,
      random: randomFloat
    });

    if (cursorAction) {
      return cursorAction;
    }

    const pounceChance = profile.windowPounceChance + profile.wallPounceChance + profile.ceilingPounceChance;

    if (shouldRoll(randomFloat, Math.min(0.48, pounceChance))) {
      const pounceAction = buildSurfacePounceAction({
        cadence: nextCadence,
        actorProfile: profile,
        behaviors,
        contacts,
        bounds,
        floorLeftX,
        floorRightX,
        random: randomFloat
      });

      if (pounceAction) {
        return pounceAction;
      }
    }

    return buildFloorTravelAction({
      cadence: nextCadence,
      actorProfile: profile,
      behaviors,
      contacts,
      bounds,
      floorLeftX,
      floorRightX,
      floorSurfaceY,
      motionState,
      random: randomFloat
    });
  }

  return {
    type: "enter",
    behavior: behaviors.THROW_FALL,
    meta: {
      velocityX: (randomFloat() - 0.5) * 2.6,
      velocityY: 0.8
    },
    cadence: withCadence(nextCadence, {
      lane: "rest",
      restLoops: 0,
      roamLoops: 0,
      surfaceLoops: 0,
      settleBias: profile.defaultSettleBias + 1,
      lastSurface: "air",
      lastAction: behaviors.THROW_FALL
    })
  };
}

function dispatchBehaviorTransition({
  nextState,
  meta = {},
  currentFacing = "left",
  behaviors,
  applyPose,
  scheduleReturn,
  animateTraverse,
  startThrowMotion,
  triggerBreakAlert,
  triggerMouseSteal
} = {}) {
  if (!nextState || !behaviors) {
    return false;
  }

  const facing = meta.facing || currentFacing || "left";

  if (nextState === behaviors.FLOOR_IDLE) {
    applyPose(nextState, "idle", {
      facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    return true;
  }

  if (nextState === behaviors.FLOOR_SIT) {
    applyPose(nextState, "sit", {
      facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(meta.durationMs || 1700, behaviors.FLOOR_IDLE, "idle", {
      facing
    });
    return true;
  }

  if (nextState === behaviors.FLOOR_DANGLE) {
    applyPose(nextState, "dangle", {
      facing,
      angle: clampToRange(meta.angle || 0, -4, 4),
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(meta.durationMs || 2200, behaviors.FLOOR_SIT, "sit", {
      facing
    });
    return true;
  }

  if (nextState === behaviors.FLOOR_GROOM) {
    applyPose(nextState, "lick", {
      facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(meta.durationMs || 1300, behaviors.FLOOR_IDLE, "idle", {
      facing
    });
    return true;
  }

  if (nextState === behaviors.FLOOR_CRAWL) {
    animateTraverse(meta.targetX, meta.targetY, {
      durationMs: meta.durationMs || 2600,
      behavior: nextState,
      mode: "crawl",
      facing
    });
    return true;
  }

  if (nextState === behaviors.POOP) {
    applyPose(nextState, "poop", {
      facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(meta.durationMs || 1200, behaviors.REST_LOAF, "rest", {
      facing
    });
    return true;
  }

  if (nextState === behaviors.REST_LOAF) {
    applyPose(nextState, "rest", {
      facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(meta.durationMs || 1800, behaviors.FLOOR_IDLE, "idle", {
      facing
    });
    return true;
  }

  if (nextState === behaviors.BREAK_ALERT && typeof triggerBreakAlert === "function") {
    triggerBreakAlert(meta, facing);
    return true;
  }

  if (nextState === behaviors.MOUSE_STEAL && typeof triggerMouseSteal === "function") {
    triggerMouseSteal(meta, facing);
    return true;
  }

  if (nextState === behaviors.THROW_FALL) {
    startThrowMotion(
      meta.velocityX ?? ((Math.random() - 0.5) * 3.4),
      meta.velocityY ?? 1.2
    );
    return true;
  }

  if (nextState === behaviors.FLOOR_WALK || nextState === behaviors.FLOOR_RUN) {
    animateTraverse(meta.targetX, meta.targetY, {
      durationMs: meta.durationMs || (nextState === behaviors.FLOOR_RUN ? 1500 : 2200),
      behavior: nextState,
      mode: nextState === behaviors.FLOOR_RUN ? "run" : "walk",
      facing
    });
    return true;
  }

  if (nextState === behaviors.WALL_IDLE) {
    const side = meta.side === "right" ? "right" : "left";
    applyPose(nextState, side === "right" ? "climb-right" : "climb-left", {
      facing: side,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    scheduleReturn(
      meta.durationMs || 1400,
      side === "right" ? behaviors.EDGE_CLIMB_RIGHT : behaviors.EDGE_CLIMB_LEFT,
      side === "right" ? "climb-right" : "climb-left",
      {
        facing: side
      }
    );
    return true;
  }

  if (
    nextState === behaviors.EDGE_CLIMB_LEFT ||
    nextState === behaviors.EDGE_CLIMB_RIGHT ||
    nextState === behaviors.CEILING_HANG
  ) {
    animateTraverse(meta.targetX, meta.targetY, {
      durationMs: meta.durationMs || (
        nextState === behaviors.CEILING_HANG
          ? 2500
          : 1700
      ),
      behavior: nextState,
      mode: nextState === behaviors.CEILING_HANG
        ? "hang"
        : nextState === behaviors.EDGE_CLIMB_LEFT
          ? "climb-left"
          : "climb-right",
      facing
    });
    return true;
  }

  return false;
}

module.exports = {
  ACTIVITY_LEVEL_OPTIONS,
  DEFAULT_ACTIVITY_LEVEL,
  createCadenceState,
  dispatchBehaviorTransition,
  getActivityProfile,
  getActivityTimings,
  isValidActivityLevel,
  normalizeCadenceState,
  planNextBehaviorAction
};
