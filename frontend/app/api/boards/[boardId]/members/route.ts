import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST /api/boards/[boardId]/members — invite a member by email (creates notification)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const { email, role } = await request.json();

    // Check that the requesting user is an owner or editor
    const requestingMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ["OWNER", "EDITOR"] },
      },
    });

    if (!requestingMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the user to invite by email
    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToInvite) {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: userToInvite.id,
          boardId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this board" },
        { status: 409 }
      );
    }

    // Check if there is an outstanding pending invitation
    const existingInvitation = await prisma.notification.findFirst({
      where: {
        userId: userToInvite.id,
        boardId,
        type: "INVITATION",
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this user" },
        { status: 409 }
      );
    }

    // Fetch board title
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Create INVITATION notification
    await prisma.notification.create({
      data: {
        userId: userToInvite.id,
        type: "INVITATION",
        boardId,
        boardTitle: board.title,
        senderName: session.user.name || "A collaborator",
        role: role === "VIEWER" ? "VIEWER" : "EDITOR",
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]/members — change a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const { userId, role } = await request.json();

    // Only OWNER can change member roles
    const requestingMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: "OWNER",
      },
    });

    if (!requestingMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check target membership exists
    const targetMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot change role of the owner" }, { status: 400 });
    }

    // Update role
    const updated = await prisma.boardMember.update({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
      data: {
        role: role === "VIEWER" ? "VIEWER" : "EDITOR",
      },
    });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    // Create ROLE_CHANGE notification
    await prisma.notification.create({
      data: {
        userId,
        type: "ROLE_CHANGE",
        boardId,
        boardTitle: board?.title || "Untitled Board",
        senderName: session.user.name || "The owner",
        role: role === "VIEWER" ? "VIEWER" : "EDITOR",
      },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/members — remove a member (owner only) or leave board (member self)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Check if user is leaving themselves or if they are the owner removing someone else
    const isSelf = userId === session.user.id;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const targetMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove the owner of the board" }, { status: 400 });
    }

    if (!isSelf) {
      // Check requesting user is the owner
      const requestingMember = await prisma.boardMember.findFirst({
        where: {
          boardId,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      if (!requestingMember) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Remove from board
    await prisma.boardMember.delete({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    // Create REMOVAL notification only if someone else was removed (not when leaving themselves)
    if (!isSelf) {
      await prisma.notification.create({
        data: {
          userId,
          type: "REMOVAL",
          boardId,
          boardTitle: board.title,
          senderName: session.user.name || "The owner",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
