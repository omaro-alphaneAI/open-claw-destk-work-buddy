const {
  shouldTrackFrontWindow: shouldTrackFrontWindowSurface
} = require("../src/main/front-window-surface");
const {
  computeChatBounds,
  computeCloneAnchorBounds,
  computePetWindowBounds
} = require("../src/main/window-routing");
const {
  createDefaultPreferenceState,
  normalizePreferencePatch
} = require("../src/main/pet-preferences");
const {
  buildWorkbuddyRequestBody,
  evaluateWorkbuddyApiUrl,
  extractAssistantText,
  resolveApiStyle,
  sanitizeExplicitSharedText
} = require("../src/main/workbuddy-provider");
const {
  buildSurfaceClingState,
  deriveActorSurfaceInsets,
  getAvatarSurfaceProfile
} = require("../src/main/avatar-surface-profile");
const {
  DEFAULT_ACTIVITY_LEVEL,
  createCadenceState,
  getActivityTimings,
  planNextBehaviorAction
} = require("../src/main/pet-activity");

const TEST_BEHAVIORS = Object.freeze({
  FLOOR_IDLE: "floor-idle",
  FLOOR_SIT: "floor-sit",
  FLOOR_DANGLE: "floor-dangle",
  FLOOR_GROOM: "floor-groom",
  FLOOR_CRAWL: "floor-crawl",
  FLOOR_WALK: "floor-walk",
  FLOOR_RUN: "floor-run",
  POOP: "poop",
  WALL_IDLE: "wall-idle",
  EDGE_CLIMB_LEFT: "edge-climb-left",
  EDGE_CLIMB_RIGHT: "edge-climb-right",
  CEILING_HANG: "ceiling-hang",
  THROW_FALL: "throw-fall",
  REST_LOAF: "rest-loaf"
});

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

function inferInterruptLevel(input, status = "idle") {
  if (["quiet", "suggest", "critical"].includes(input)) {
    return input;
  }

  return status === "alert" ? "critical" : "suggest";
}

function shouldSuppressBubble({
  drawerOpen = false,
  workbenchOpen = false,
  quietMode = false,
  quietHours = false,
  interruptLevel = "suggest",
  status = "idle"
} = {}) {
  if (drawerOpen || workbenchOpen) {
    return true;
  }

  const level = inferInterruptLevel(interruptLevel, status);

  if (level === "quiet") {
    return true;
  }

  if (quietMode || quietHours) {
    return level !== "critical";
  }

  return false;
}

function shouldPromoteArtifact(text, threshold) {
  return String(text || "").trim().length > threshold;
}

function normalizeAmbientLevel(level) {
  return ["quiet", "suggest", "critical"].includes(level) ? level : "suggest";
}

function normalizeApprovalRisk(risk) {
  return ["low", "medium", "high"].includes(risk) ? risk : "high";
}

function getAmbientCooldownMs({ source = "local", level = "suggest" } = {}) {
  const exactKey = `${source}:${level}`;
  const cooldownBySource = {
    "idle-companion": 90 * 60 * 1000,
    "local-system:critical": 12 * 60 * 1000,
    "local-system:suggest": 20 * 60 * 1000,
    "approval-gate:critical": 4 * 60 * 1000
  };

  if (Number.isFinite(cooldownBySource[exactKey])) {
    return cooldownBySource[exactKey];
  }

  if (Number.isFinite(cooldownBySource[source])) {
    return cooldownBySource[source];
  }

  if (level === "critical") {
    return 6 * 60 * 1000;
  }

  if (level === "quiet") {
    return 30 * 60 * 1000;
  }

  return 8 * 60 * 1000;
}

function shouldAcceptAmbientItem({
  source = "local",
  level = "suggest",
  lastSeenAt = 0,
  now = Date.now(),
  bypassCooldown = false
} = {}) {
  if (bypassCooldown) {
    return true;
  }

  return now - lastSeenAt >= getAmbientCooldownMs({ source, level });
}

function shouldEmitIdleCompanion({
  drawerOpen = false,
  workbenchOpen = false,
  quietMode = false,
  mode = "ambient",
  hasApproval = false,
  toolStatus = "done",
  lastIdleCompanionAt = 0,
  idleCompanionAfterMs = 45 * 60 * 1000,
  now = Date.now()
} = {}) {
  if (drawerOpen || workbenchOpen || quietMode) {
    return false;
  }

  if (mode !== "ambient" || hasApproval || toolStatus === "active") {
    return false;
  }

  return now - lastIdleCompanionAt >= idleCompanionAfterMs;
}

function inferTaskCloneId(text, requestedCloneId = "main-cat") {
  const normalized = String(text || "").trim();

  if (!normalized || requestedCloneId !== "main-cat") {
    return requestedCloneId;
  }

  if (/报错|bug|修|patch|fix|构建|编译|崩|代码|review|diff/i.test(normalized)) {
    return "builder-cat";
  }

  if (/调研|资料|文档|来源|research|seo|搜索|搜索词|站点|页面|网页|官网/i.test(normalized)) {
    return "scout-cat";
  }

  if (/终端|进程|端口|环境|脚本|日志|服务|health|状态|重启|本机|runtime|守护/i.test(normalized)) {
    return "ops-cat";
  }

  return requestedCloneId;
}

function shouldSpeakState({
  platform = "darwin",
  voiceEnabled = false,
  suppressBubble = false,
  interruptLevel = "suggest"
} = {}) {
  return platform === "darwin" && voiceEnabled && !suppressBubble && interruptLevel === "critical";
}

function shouldEmitReminder({
  dueAt = Date.now(),
  now = Date.now()
} = {}) {
  return dueAt <= now;
}

function shouldReplayReminderOnBoot({
  dueAt = Date.now(),
  now = Date.now(),
  graceMs = 10 * 60 * 1000
} = {}) {
  return dueAt >= (now - graceMs);
}

function shouldRestoreInboxMessage({
  transcriptIds = [],
  messageId = ""
} = {}) {
  return !new Set(transcriptIds).has(messageId);
}

function shouldHandleReplyRecovery({
  handledReplyIds = [],
  messageId = ""
} = {}) {
  return !new Set(handledReplyIds).has(messageId);
}

function createPlannerBounds(overrides = {}) {
  return {
    x: 620,
    y: 708,
    width: 180,
    height: 192,
    ...overrides
  };
}

function createPlannerContacts(overrides = {}) {
  return {
    leftX: 0,
    rightX: 1260,
    topY: 0,
    floorY: 708,
    onFloorSurface: true,
    onCeilingSurface: false,
    onWallSurface: false,
    onLeft: false,
    onRight: false,
    onWindowTop: false,
    onWindowLeft: false,
    workArea: {
      x: 0,
      y: 0,
      width: 1440,
      height: 900
    },
    floorSurfaceLeftX: 32,
    floorSurfaceRightX: 1228,
    floorSurfaceY: 708,
    wallSurfaceTopY: 60,
    wallSurfaceBottomY: 708,
    wallSurfaceX: 32,
    ceilingSurfaceLeftX: 32,
    ceilingSurfaceRightX: 1228,
    ceilingSurfaceY: 60,
    ...overrides
  };
}

function main() {
  const checks = [
    {
      label: "default preferences expose productized activity level",
      run: () => assert(
        createDefaultPreferenceState().activityLevel === DEFAULT_ACTIVITY_LEVEL,
        "default preferences should include default activity level"
      )
    },
    {
      label: "invalid activity level falls back to default",
      run: () => assert(
        normalizePreferencePatch({ activityLevel: "turbo" }).activityLevel === DEFAULT_ACTIVITY_LEVEL,
        "invalid activity level should fall back to default"
      )
    },
    {
      label: "workbuddy defaults to auto API style",
      run: () => assert(
        createDefaultPreferenceState().workbuddyApiStyle === "auto",
        "workbuddy default API style should be auto"
      )
    },
    {
      label: "workbuddy preserves explicit responses API style",
      run: () => assert(
        normalizePreferencePatch({ workbuddyApiStyle: "openai-responses" }).workbuddyApiStyle === "openai-responses",
        "responses API style should be preserved"
      )
    },
    {
      label: "provider auto-detects responses endpoint",
      run: () => assert(
        resolveApiStyle("auto", "https://example.com/v1/responses") === "openai-responses",
        "responses endpoint should auto-detect responses style"
      )
    },
    {
      label: "provider blocks non-local http endpoints",
      run: () => assert(
        evaluateWorkbuddyApiUrl("http://example.com/v1/chat/completions").safe === false,
        "remote http endpoints should be blocked"
      )
    },
    {
      label: "provider allows localhost http endpoints",
      run: () => assert(
        evaluateWorkbuddyApiUrl("http://127.0.0.1:11434/v1/chat/completions").safe === true,
        "localhost http endpoints should be allowed"
      )
    },
    {
      label: "provider blocks url-embedded credentials",
      run: () => assert(
        evaluateWorkbuddyApiUrl("https://demo:secret@example.com/v1/chat/completions").safe === false,
        "URL embedded credentials should be blocked"
      )
    },
    {
      label: "preferences strip secret query params from api url",
      run: () => {
        const preferences = normalizePreferencePatch({
          workbuddyApiUrl: "https://example.com/v1/chat/completions?token=secret&api-version=2024-01-01"
        });

        assert(
          preferences.workbuddyApiUrl === "https://example.com/v1/chat/completions?api-version=2024-01-01",
          "sensitive query params should be stripped from stored API URLs"
        );
      }
    },
    {
      label: "provider builds responses payload with instructions",
      run: () => {
        const body = buildWorkbuddyRequestBody({
          apiStyle: "openai-responses",
          model: "lobster-1",
          systemPrompt: "system rules",
          userMessage: "hello"
        });

        assert(body.instructions === "system rules", "responses payload should use instructions");
        assert(body.input === "hello", "responses payload should use raw input");
      }
    },
    {
      label: "provider extracts assistant text from responses payload",
      run: () => assert(
        extractAssistantText({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: "workbuddy reply"
                }
              ]
            }
          ]
        }) === "workbuddy reply",
        "responses payload text should be extracted"
      )
    },
    {
      label: "shared context redacts obvious secrets and local paths",
      run: () => {
        const sanitized = sanitizeExplicitSharedText("OPENAI_API_KEY=abc123 /Users/mac/private/project Bearer token-123");

        assert(!sanitized.includes("abc123"), "api keys should be redacted");
        assert(!sanitized.includes("/Users/mac/private/project"), "local paths should be redacted");
        assert(sanitized.includes("<redacted>") || sanitized.includes("<redacted-token>"), "redaction marker should be present");
      }
    },
    {
      label: "activity timings stay monotonic across low and high",
      run: () => {
        const low = getActivityTimings("low");
        const high = getActivityTimings("high");

        assert(low.roamIntervalMs > high.roamIntervalMs, "low roam interval should be slower than high");
        assert(low.cloneRoamIntervalMs > high.cloneRoamIntervalMs, "low clone roam interval should be slower than high");
        assert(low.mouseStealMs > high.mouseStealMs, "low mouse steal should be slower than high");
        assert(low.cloneTickSkipChance > high.cloneTickSkipChance, "low clone tick skip should be calmer than high");
      }
    },
    {
      label: "cat wall profile stays more aggressive than kuribou",
      run: () => {
        const cat = getAvatarSurfaceProfile("cat");
        const kuribou = getAvatarSurfaceProfile("kuribou");

        assert(cat.attach.wallBleedBias > kuribou.attach.wallBleedBias, "cat wall bleed bias should be larger");
        assert(cat.attach.wallLiftDisplay < kuribou.attach.wallLiftDisplay, "cat wall lift should be tighter");
      }
    },
    {
      label: "wall cling state keeps avatar-specific wall posture",
      run: () => {
        const catLeft = buildSurfaceClingState("climb-left", "cat");
        const catRight = buildSurfaceClingState("climb-right", "cat");
        const kuribouLeft = buildSurfaceClingState("climb-left", "kuribou");

        assert(catLeft.rootRotation === -88, "cat left wall rotation should lean into the wall");
        assert(catRight.rootRotation === 88, "cat right wall rotation should lean into the wall");
        assert(kuribouLeft.rootRotation === 0, "kuribou wall rotation should stay neutral");
      }
    },
    {
      label: "avatar surface insets stay distinct by avatar",
      run: () => {
        const bounds = { width: 220, height: 236 };
        const catInsets = deriveActorSurfaceInsets(bounds, "cat");
        const kuribouInsets = deriveActorSurfaceInsets(bounds, "kuribou");

        assert(catInsets.wallBleed > kuribouInsets.wallBleed, "cat should project farther into wall contact");
        assert(catInsets.floorBleed <= kuribouInsets.floorBleed, "cat floor bleed should stay tighter");
      }
    },
    {
      label: "low activity planner starts by resting on the floor",
      run: () => {
        const action = planNextBehaviorAction({
          actorKind: "main",
          activityLevel: "low",
          behaviors: TEST_BEHAVIORS,
          bounds: createPlannerBounds(),
          contacts: createPlannerContacts(),
          motionState: {
            facing: "left"
          },
          cadence: createCadenceState("main"),
          hasDormantClone: false,
          random: () => 0.99
        });

        assert(
          [TEST_BEHAVIORS.FLOOR_SIT, TEST_BEHAVIORS.REST_LOAF, TEST_BEHAVIORS.FLOOR_GROOM].includes(action?.behavior),
          "low activity planner should start with a floor rest action"
        );
        assert(action?.cadence?.lane === "rest", "first low activity action should stay in rest lane");
      }
    },
    {
      label: "planner can trigger poop behavior while resting on the floor",
      run: () => {
        const action = planNextBehaviorAction({
          actorKind: "main",
          activityLevel: "low",
          behaviors: TEST_BEHAVIORS,
          bounds: createPlannerBounds(),
          contacts: createPlannerContacts(),
          motionState: {
            facing: "left"
          },
          cadence: createCadenceState("main"),
          hasDormantClone: false,
          random: () => 0
        });

        assert(action?.behavior === TEST_BEHAVIORS.POOP, "planner should be able to schedule poop behavior");
        assert(action?.cadence?.lastAction === TEST_BEHAVIORS.POOP, "poop behavior should update cadence");
      }
    },
    {
      label: "surface planner keeps ceiling continuity instead of snapping back to floor",
      run: () => {
        const action = planNextBehaviorAction({
          actorKind: "main",
          activityLevel: "medium",
          behaviors: TEST_BEHAVIORS,
          bounds: createPlannerBounds({
            x: 40,
            y: 60
          }),
          contacts: createPlannerContacts({
            onFloorSurface: false,
            onCeilingSurface: true
          }),
          motionState: {
            facing: "left"
          },
          cadence: {
            ...createCadenceState("main"),
            lane: "surface",
            surfaceLoops: 1,
            travelDirection: "left",
            lastSurface: "ceiling"
          },
          hasDormantClone: false,
          random: () => 0.99
        });

        assert(action?.behavior === TEST_BEHAVIORS.CEILING_HANG, "ceiling continuity should stay on ceiling");
        assert(action?.cadence?.lastSurface === "ceiling", "ceiling continuity should preserve ceiling surface");
      }
    },
    {
      label: "quiet mode suppresses suggest bubbles",
      run: () => assert(
        shouldSuppressBubble({ quietMode: true, interruptLevel: "suggest" }) === true,
        "quiet mode should suppress suggest"
      )
    },
    {
      label: "quiet mode keeps critical bubbles",
      run: () => assert(
        shouldSuppressBubble({ quietMode: true, interruptLevel: "critical" }) === false,
        "quiet mode should keep critical"
      )
    },
    {
      label: "quiet hours suppress suggest bubbles",
      run: () => assert(
        shouldSuppressBubble({ quietHours: true, interruptLevel: "suggest" }) === true,
        "quiet hours should suppress suggest"
      )
    },
    {
      label: "drawer open suppresses all bubbles",
      run: () => assert(
        shouldSuppressBubble({ drawerOpen: true, interruptLevel: "critical" }) === true,
        "drawer open should suppress all"
      )
    },
    {
      label: "long reply threshold promotes to workbench",
      run: () => assert(
        shouldPromoteArtifact("x".repeat(141), 140) === true,
        "141 chars should promote when threshold is 140"
      )
    },
    {
      label: "ambient level validation falls back to suggest",
      run: () => assert(
        normalizeAmbientLevel("noise") === "suggest",
        "ambient level fallback failed"
      )
    },
    {
      label: "approval risk validation falls back to high",
      run: () => assert(
        normalizeApprovalRisk("dangerous") === "high",
        "approval risk fallback failed"
      )
    },
    {
      label: "ambient duplicate is cooled down by source",
      run: () => assert(
        shouldAcceptAmbientItem({
          source: "local-system",
          level: "suggest",
          lastSeenAt: 5 * 60 * 1000,
          now: 15 * 60 * 1000
        }) === false,
        "local-system suggest should stay in cooldown"
      )
    },
    {
      label: "idle companion stays quiet while work is active",
      run: () => assert(
        shouldEmitIdleCompanion({
          mode: "acting",
          toolStatus: "active",
          lastIdleCompanionAt: 0,
          now: 60 * 60 * 1000
        }) === false,
        "idle companion should not fire during active work"
      )
    },
    {
      label: "main cat auto routes code asks to builder cat",
      run: () => assert(
        inferTaskCloneId("帮我看一下这个 bug 和 patch", "main-cat") === "builder-cat",
        "code asks should route to builder-cat"
      )
    },
    {
      label: "manual clone selection is preserved",
      run: () => assert(
        inferTaskCloneId("帮我看一下这个 bug 和 patch", "scout-cat") === "scout-cat",
        "manual clone selection should win"
      )
    },
    {
      label: "voice broadcast only speaks critical unsuppressed events",
      run: () => assert(
        shouldSpeakState({
          platform: "darwin",
          voiceEnabled: true,
          suppressBubble: false,
          interruptLevel: "critical"
        }) === true,
        "critical voice events should be spoken"
      )
    },
    {
      label: "scheduled reminder waits until due",
      run: () => assert(
        shouldEmitReminder({
          dueAt: 20 * 60 * 1000,
          now: 10 * 60 * 1000
        }) === false,
        "future reminder should stay queued"
      )
    },
    {
      label: "stale reminder is not replayed on boot",
      run: () => assert(
        shouldReplayReminderOnBoot({
          dueAt: 0,
          now: 20 * 60 * 1000
        }) === false,
        "old reminders should not replay after restart"
      )
    },
    {
      label: "startup restores inbox messages missing from transcript",
      run: () => assert(
        shouldRestoreInboxMessage({
          transcriptIds: ["msg-1", "msg-2"],
          messageId: "msg-3"
        }) === true,
        "missing inbox messages should be restored"
      )
    },
    {
      label: "startup backfills reply state when transcript exists but memory is missing",
      run: () => assert(
        shouldHandleReplyRecovery({
          handledReplyIds: ["msg-1", "msg-2"],
          messageId: "msg-3"
        }) === true,
        "reply recovery should use handled reply ids, not transcript alone"
      )
    },
    {
      label: "explicit reminders bypass ambient cooldown",
      run: () => assert(
        shouldAcceptAmbientItem({
          source: "reminder:cli",
          level: "suggest",
          lastSeenAt: 5 * 60 * 1000,
          now: 6 * 60 * 1000,
          bypassCooldown: true
        }) === true,
        "reminders should not be suppressed by semantic cooldown"
      )
    },
    {
      label: "main pet visibility enables front window tracking",
      run: () => assert(
        shouldTrackFrontWindowSurface({
          petVisible: true,
          chatVisible: false,
          spawnedCloneCount: 0
        }) === true,
        "visible main pet should keep app-surface tracking on"
      )
    },
    {
      label: "hidden shell disables front window tracking",
      run: () => assert(
        shouldTrackFrontWindowSurface({
          petVisible: false,
          chatVisible: false,
          spawnedCloneCount: 0
        }) === false,
        "fully hidden shell should stop app-surface tracking"
      )
    },
    {
      label: "pet bounds stay on the current work area",
      run: () => {
        const bounds = computePetWindowBounds({
          currentBounds: {
            x: 2300,
            y: 1180,
            width: 220,
            height: 236
          },
          workArea: {
            x: 1920,
            y: 0,
            width: 1728,
            height: 1117
          },
          size: {
            width: 220,
            height: 236
          },
          resetAnchor: false,
          manuallyPlaced: true
        });

        assert(bounds.x >= 1928 && bounds.x <= 3420, "pet x should stay on current display");
        assert(bounds.y >= 8 && bounds.y <= 881, "pet y should stay on current display");
      }
    },
    {
      label: "chat drawer stays centered above pet",
      run: () => {
        const bounds = computeChatBounds({
          petBounds: {
            x: 2480,
            y: 820,
            width: 220,
            height: 236
          },
          workArea: {
            x: 1920,
            y: 0,
            width: 1728,
            height: 1117
          },
          size: {
            width: 304,
            height: 408
          },
          expanded: false
        });

        assert(bounds.y < 820, "chat drawer should sit above the pet");
        assert(bounds.x >= 1932, "chat drawer should stay inside work area");
      }
    },
    {
      label: "clone anchors stay clipped inside work area",
      run: () => {
        const bounds = computeCloneAnchorBounds({
          petBounds: {
            x: 1940,
            y: 48,
            width: 220,
            height: 236
          },
          workArea: {
            x: 1920,
            y: 0,
            width: 1728,
            height: 1117
          },
          cloneSize: {
            width: 146,
            height: 154
          },
          index: 0,
          scale: 0.88
        });

        assert(bounds.x >= 1928, "clone x should stay visible");
        assert(bounds.y >= 8, "clone y should stay visible");
      }
    }
  ];

  for (const check of checks) {
    check.run();
    process.stdout.write(`PASS ${check.label}\n`);
  }
}

main();
