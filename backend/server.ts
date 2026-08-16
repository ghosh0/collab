import "dotenv/config";
import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import * as Y from "yjs";
import type { RawData } from "ws";
import { prisma } from "./lib/prisma";

const port = Number(process.env.PORT ?? 5000);

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Backend server running");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

interface BoardClient {
    ws: WebSocket;
    userId: string;
    boardId: string;

    name: string;
    email: string;
    role: string;
}
const boards = new Map<
  string,
  {
    doc: Y.Doc;
    clients: Map<string, BoardClient>;
    saveTimer: NodeJS.Timeout | null;
  }
>();

const loadingBoards = new Map<
  string,
  Promise<{
    doc: Y.Doc;
    clients: Map<string, BoardClient>;
    saveTimer: NodeJS.Timeout | null;
  }>
>();

async function getOrCreateBoard(boardId: string) {
  const existing = boards.get(boardId);

  if (existing) {
    return existing;
  }

  const loading = loadingBoards.get(boardId);

  if (loading) {
    return await loading;
  }

  const promise = (async () => {
    const doc = await loadBoardState(boardId);

    const board = {
      doc,
      clients: new Map<string, BoardClient>(),
      saveTimer: null,
    };

    boards.set(boardId, board);
    loadingBoards.delete(boardId);

    return board;
  })();

  loadingBoards.set(boardId, promise);

  return await promise;
}

function toUint8Array(data: RawData): Uint8Array | null {
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);

  }
  if (Array.isArray(data)) {
    const merged = Buffer.concat(data);
    return new Uint8Array(merged.buffer, merged.byteOffset, merged.byteLength);

  }
  return null;
}
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

}
// Load board state from database
async function loadBoardState(boardId: string): Promise<Y.Doc> {
  const doc = new Y.Doc();

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });
    if (board && board.yjsState) {
      const bytes = board.yjsState instanceof Buffer 
  ? board.yjsState 
  : Buffer.from(board.yjsState);
Y.applyUpdate(doc, new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      console.log(`✅ Loaded board ${boardId} from database`);
    } else {
      console.log(`📝 New board ${boardId} created`);
    }
  } catch (err) {
    console.error(`❌ Error loading board ${boardId}:`, err);
  }
  return doc;
}
// Save board state to database with debounce
async function saveBoardState(boardId: string, doc: Y.Doc) {
  try {
    const state = Y.encodeStateAsUpdate(doc);

    await prisma.board.update({
      where: {
        id: boardId,
      },
      data: {
        yjsState: Buffer.from(state),
      },
    });

    console.log(`💾 Saved board ${boardId} (${state.length} bytes)`);
  } catch (err) {
    console.error(`❌ Error saving board ${boardId}:`, err);
  }
}
// Debounced save function
function scheduleSave(boardId: string, doc: Y.Doc) {
  const boardData = boards.get(boardId);
  if (!boardData) return;
  // Clear existing timer
  if (boardData.saveTimer) {
    clearTimeout(boardData.saveTimer);

  }
  //   Schedule new save (5 seconds after last change)
  boardData.saveTimer = setTimeout(() => {
    saveBoardState(boardId, doc);
    boardData.saveTimer = null;

  }, 5000);
}
wss.on("connection", async (ws, req) => {
  function getCookie(
    cookieString: string,
    name: string
  ) {
    const cookies = cookieString.split(";");

    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");

      if (key === name) {
        return value;
      }
    }

    return undefined;
  }

  const url = new URL(req.url ?? "", "http://localhost:5000");
  const boardId = url.searchParams.get("boardId");
  const queryToken = url.searchParams.get("token");

  const token = queryToken || getCookie(
    req.headers.cookie ?? "",
    "better-auth.session_token"
  );

  if (!token) {
    ws.close(1008, "Unauthorized: No token provided");
    return;
  }

  const session = await prisma.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    ws.close(1008, "Unauthorized: Invalid token");
    return;
  }

  const user = session.user;
  const userId = user.id;

  if (!boardId) {
    ws.close(1008, "Missing boardId");
    return;
  }
  const membership =
  await prisma.boardMember.findFirst({
    where: {
      boardId,
      userId: user.id,
    },
  });
  if (!membership) {
  ws.close(1008, "Forbidden");
  return;
}
const role = membership.role;
  //   // Load or create board
  const board = await getOrCreateBoard(boardId);
  const client: BoardClient = { ws, userId, boardId, name: user.name, email: user.email, role };
  board.clients.set(userId, client);
  console.log(`[${boardId}] ${userId} connected. Total: ${board.clients.size}`);
  //   // Send full current doc state to new client
  const initialState = Y.encodeStateAsUpdate(board.doc);
  ws.send(JSON.stringify({ type: "sync", data: Array.from(initialState) }));
  ws.on("message", (data: RawData) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === "cursor") {
        //         // Broadcast cursor to all other clients
        board.clients.forEach((otherClient) => {
          if (otherClient.userId !== userId && otherClient.ws.readyState === WebSocket.OPEN) {
            console.log(
  "Broadcasting cursor from",
  userId,
  "to",
  otherClient.userId
);
            otherClient.ws.send(JSON.stringify({ type: "cursor", userId, ...message }));
          }
        });
      } else if (message.type === "sync") {
        if(client.role==="VIEWER")
        {
          return
        }
        //         // Yjs update
        const update = new Uint8Array(message.data);
        Y.applyUpdate(board.doc, update);
        //         // Schedule save to database
        scheduleSave(boardId, board.doc);
        //         // Broadcast to other clients
        board.clients.forEach((otherClient) => {
          if (otherClient.userId !== userId && otherClient.ws.readyState === WebSocket.OPEN) {
            console.log(
  "Broadcasting sync from",
  userId,
  "to",
  otherClient.userId
);
            otherClient.ws.send(JSON.stringify({ type: "sync", data: message.data }));
          }
        });
      }
    } catch (err) {
      console.error("Error processing message:", err);

    }
  });
  ws.on("close", async () => {
    board.clients.delete(userId);
    console.log(`[${boardId}] ${userId} disconnected. Total: ${board.clients.size}`);
    //     // If no more clients, save and clean up
    if (board.clients.size === 0) {
      console.log(`[${boardId}] No more clients, saving state...`);

      //       // Clear pending save timer and save immediately
      if (board.saveTimer) {
        clearTimeout(board.saveTimer);
        board.saveTimer = null;

      }
      //       
      await saveBoardState(boardId, board.doc);
      boards.delete(boardId);
      console.log(`[${boardId}] Cleaned up`);
    }
    //     // Notify others that this user left
    board.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: "user-left", userId }));
      }
    });
  });
  ws.on("error", (err) => {
    console.error("WebSocket error:", err);

  });
});
// // REST API endpoints for board management
app.post("/api/boards", async (req, res) => {
  const { title, ownerId } = req.body;
  try {
    const board = await prisma.board.create({
      data: {
        title,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: "OWNER",

          },
        },
      },
      include: { members: true },
    });
    res.json({ success: true, board });
  } catch (err) {
    console.error("Error creating board:", err);
    res.status(500).json({ error: "Failed to create board" });
  }
});
app.get("/api/boards/:boardId", async (req, res) => {
  const { boardId } = req.params;
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { owner: true, members: { include: { user: true } } },
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json(board);
  } catch (err) {
    console.error("Error fetching board:", err);
    res.status(500).json({ error: "Failed to fetch board" });
  }
});
app.post("/api/boards/:boardId/members", async (req, res) => {
  const { boardId } = req.params;
  const { userId, role } = req.body;
  try {
    const member = await prisma.boardMember.create({
      data: {
        userId,
        boardId,
        role: role || "EDITOR",

      },
      include: { user: true },
    });
    res.json({ success: true, member });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});
app.get("/api/users/:userId/boards", async (req, res) => {
  const { userId } = req.params;
  try {
    const boards = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          include: { owner: true, members: { include: { user: true } } },
        },
      },
    });
    res.json(boards);
  } catch (err) {
    console.error("Error fetching user boards:", err);
    res.status(500).json({ error: "Failed to fetch boards" });
  }
});

// Periodic save interval — saves all active boards every 30 seconds as a safety net
const PERIODIC_SAVE_INTERVAL_MS = 30_000;
const periodicSaveInterval = setInterval(async () => {
  for (const [boardId, board] of boards) {
    try {
      await saveBoardState(boardId, board.doc);
    } catch (err) {
      console.error(`❌ Periodic save failed for ${boardId}:`, err);
    }
  }
}, PERIODIC_SAVE_INTERVAL_MS);

process.on("SIGINT", async () => {
  console.log("Saving all boards before shutdown...");
  clearInterval(periodicSaveInterval);

  for (const [boardId, board] of boards) {
    try {
      await saveBoardState(boardId, board.doc);
      console.log(`Saved ${boardId}`);
    } catch (err) {
      console.error(`Failed to save ${boardId}`, err);
    }
  }

  process.exit(0);
});

server.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});