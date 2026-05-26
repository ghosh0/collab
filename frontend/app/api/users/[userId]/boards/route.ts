import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users/[userId]/boards — get all boards for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, image: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        board: {
          updatedAt: "desc",
        },
      },
    });

    return NextResponse.json(memberships);
  } catch (error) {
    console.error("Error fetching user boards:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}
