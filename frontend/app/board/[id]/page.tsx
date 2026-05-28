"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import BoardClient from "./board-client";

interface BoardMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface BoardData {
  id: string;
  title: string;
  ownerId: string;
  members: BoardMember[];
}

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetch(`/api/boards/${id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch board");
        })
        .then((data) => setBoard(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id, session]);

  if (isPending || loading || !session?.user || !board) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const membership = board.members.find(
    (m) => m.userId === session.user.id
  );
  const role = membership?.role || "VIEWER";

  return (
    <BoardClient
      boardId={id}
      userId={session.user.id}
      role={role}
      token={session.session.token}
    />
  );
}