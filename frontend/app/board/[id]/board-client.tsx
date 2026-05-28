"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import * as Y from "yjs";

const ExcalidrawWrapper = dynamic(
  async () => (await import("@/components/excalidraw-wrapper")).default,
  { ssr: false }
);

type RemoteCursor = {
  userId: string;
  x: number;
  y: number;
  color: string;
};

export default function BoardClient({ boardId, userId, role, token }: { boardId: string, userId: string, role: string, token: string }) {
  const isRemote = useRef(false);
  const lastElementsRef = useRef<any[] | null>(null);

  const isSynced = useRef(false); // ADD THIS

  const docref = useRef<Y.Doc | null>(null);
  const sceneref = useRef<Y.Map<any> | null>(null);

  const socket = useRef<WebSocket | null>(null);
  const excaliref = useRef<any>(null);
  const handleUpdateRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remoteCursorsRef = useRef<Map<string, RemoteCursor>>(new Map());

  const colorPalette = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FF6600",
  ];

  const getUserColor = (uId: string): string => {
    const hash = uId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colorPalette[hash % colorPalette.length];
  };

  // Normalize elements to ensure consistency across clients
  const normalizeElements = (elements: any[]) => {
    return elements.map((el) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      angle: el.angle,
      strokeColor: el.strokeColor,
      backgroundColor: el.backgroundColor,
      fillStyle: el.fillStyle,
      strokeWidth: el.strokeWidth,
      strokeStyle: el.strokeStyle,
      roughness: el.roughness,
      opacity: el.opacity,
      groupIds: el.groupIds,
      frameId: el.frameId,
      index: el.index,
      roundness: el.roundness,
      seed: el.seed,
      versionNonce: el.versionNonce,
      isDeleted: el.isDeleted,
      boundElements: el.boundElements,
      updated: el.updated,
      link: el.link,
      locked: el.locked,
      // Text-specific
      ...(el.type === "text" && {
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        textAlign: el.textAlign,
        verticalAlign: el.verticalAlign,
        containerId: el.containerId,
        originalText: el.originalText,
        lineHeight: el.lineHeight,
      }),
      // Arrow-specific
      ...(el.type === "arrow" && {
        startBinding: el.startBinding,
        endBinding: el.endBinding,
        startArrowType: el.startArrowType,
        endArrowType: el.endArrowType,
        points: el.points,
      }),
      // Diamond-specific
      ...(el.type === "diamond" && {}),
      // Ellipse-specific
      ...(el.type === "ellipse" && {}),
    }));
  };

  // Initialize Yjs docs once
  if (!docref.current) {
    docref.current = new Y.Doc();
    sceneref.current = docref.current.getMap<any>("scene");
  }

  const receiveChanges = (elements: any[]) => {
    if (!isSynced.current) return;
    if (isRemote.current) return;
    if (!docref.current || !sceneref.current) return;

    const filtered = elements.filter((el) => !(el.width === 0 && el.height === 0));

    if (filtered.length === 0) return;

    // Normalize before comparing
    const normalized = normalizeElements(filtered);
    if (JSON.stringify(lastElementsRef.current) === JSON.stringify(normalized)) {
      return;
    }

    lastElementsRef.current = JSON.parse(JSON.stringify(normalized));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      docref.current!.transact(() => {
        sceneref.current!.set("elements", normalized);
      }, "local");
    }, 30);
  };

  // Render remote cursors
  useEffect(() => {
    const renderCursors = () => {
      const container = document.getElementById("remote-cursors");
      if (!container) return;

      container.innerHTML = "";

      remoteCursorsRef.current.forEach((cursor, uId) => {
        const div = document.createElement("div");
        div.style.cssText = `
          position: fixed;
          left: ${cursor.x}px;
          top: ${cursor.y}px;
          pointer-events: none;
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: auto;
          height: auto;
        `;

        div.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="${cursor.color}" stroke="#000" stroke-width="2" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"></path></svg>
          <div style="
            background: ${cursor.color};
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            flex-shrink: 0;
          ">${uId}</div>
        `;

        container.appendChild(div);
      });
    };

    const interval = setInterval(renderCursors, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!boardId || !userId || !docref.current || !sceneref.current) return;

    console.log(`[CLIENT ${userId}] Connecting to boardId: ${boardId}`);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "ws://localhost:5000";
    const ws = new WebSocket(
      `${backendUrl}?boardId=${encodeURIComponent(
        boardId
      )}&token=${encodeURIComponent(token)}`
    );
    socket.current = ws;

    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin === "remote") return;
      if (!isSynced.current) return;
      if (socket.current?.readyState !== WebSocket.OPEN) return;

      const data = new Uint8Array(update);
      socket.current.send(JSON.stringify({ type: "sync", data: Array.from(data) }));
    };

    handleUpdateRef.current = handleUpdate;
    docref.current.on("update", handleUpdate);

    ws.onopen = () => {
      console.log(`✅ [CLIENT ${userId}] Connected to server`);
    };

    ws.onmessage = async (e: MessageEvent<string>) => {
      if (!docref.current || !sceneref.current) return;

      try {
        const message = JSON.parse(e.data);

        if (message.type === "cursor") {
          remoteCursorsRef.current.set(message.userId, {
            userId: message.userId,
            x: message.x,
            y: message.y,
            color: message.color,
          });
        } else if (message.type === "sync") {
          isRemote.current = true;
          const update = new Uint8Array(message.data);
          Y.applyUpdate(docref.current, update, "remote");
          isSynced.current = true;
          const elements = sceneref.current.get("elements") || [];
          if (Array.isArray(elements) && elements.length > 0) {
            // Poll until excalidraw API is ready
            const tryUpdate = () => {
              if (excaliref.current?.updateScene) {
                excaliref.current.updateScene({ elements });
                isRemote.current = false;
              } else {
                setTimeout(tryUpdate, 50); // retry every 50ms
              }
            };
            tryUpdate();
          } else {
            isRemote.current = false;
          }
        } else if (message.type === "user-left") {
          remoteCursorsRef.current.delete(message.userId);
        }
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ WS error", err);
    };

    ws.onclose = () => {
      console.log(`👋 [CLIENT ${userId}] Disconnected`);
    };

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (handleUpdateRef.current && docref.current) {
        docref.current.off("update", handleUpdateRef.current);
      }
      ws.close();
    };
  }, [boardId, userId]);

  // CURSOR MOVEMENT
  useEffect(() => {
    if (!userId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!socket.current) return;
      if (socket.current.readyState !== WebSocket.OPEN) return;

      const msg = {
        type: "cursor",
        x: e.clientX,
        y: e.clientY,
        color: getUserColor(userId),
      };

      socket.current.send(JSON.stringify(msg));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [userId]);

  return (
    <>
      <div
        id="remote-cursors"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 2147483647,
          width: "100vw",
          height: "100vh",
        }}
      />
      <ExcalidrawWrapper
        getChanges={receiveChanges}
        setAPI={(api) => (excaliref.current = api)}
        viewModeEnabled={role === "VIEWER"}
      />
    </>
  );
}
