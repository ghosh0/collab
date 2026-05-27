import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (notification.type !== "INVITATION" || notification.status !== "PENDING") {
      return NextResponse.json({ error: "Invalid notification type or status" }, { status: 400 });
    }

    // Verify board still exists
    const board = await prisma.board.findUnique({
      where: { id: notification.boardId },
    });

    if (!board) {
      // Mark invitation as rejected/expired since board is gone
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: "REJECTED", read: true },
      });
      return NextResponse.json({ error: "Board no longer exists" }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: session.user.id,
          boardId: notification.boardId,
        },
      },
    });

    if (!existingMember) {
      // Create board member
      await prisma.boardMember.create({
        data: {
          userId: session.user.id,
          boardId: notification.boardId,
          role: notification.role || "EDITOR",
        },
      });
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "ACCEPTED",
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
