import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const conversations = await db.chatConversation.findMany({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
      },
      include: {
        messages: {
          select: {
            id: true,
            content: true,
            senderId: true,
            type: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Enrich with other participant info
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId =
          conv.participantA === userId ? conv.participantB : conv.participantA;

        const otherUser = await db.user.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            name: true,
            photoUrl: true,
            role: true,
          },
        });

        // Count unread messages
        const unreadCount = await db.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: otherUserId,
            isRead: false,
          },
        });

        return {
          ...conv,
          otherUser,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantA, participantB, bookingId } = body;

    if (!participantA || !participantB) {
      return NextResponse.json(
        { error: 'Both participant IDs are required' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existing = await db.chatConversation.findFirst({
      where: {
        OR: [
          { participantA, participantB },
          { participantA: participantB, participantB: participantA },
        ],
      },
    });

    if (existing) {
      // Return existing conversation with other user info
      const otherUserId =
        existing.participantA === participantA
          ? existing.participantB
          : existing.participantA;

      const otherUser = await db.user.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          role: true,
        },
      });

      return NextResponse.json({ conversation: existing, otherUser });
    }

    // Create new conversation
    const conversation = await db.chatConversation.create({
      data: {
        participantA,
        participantB,
        bookingId: bookingId || null,
      },
    });

    const otherUser = await db.user.findUnique({
      where: { id: participantB },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        role: true,
      },
    });

    return NextResponse.json({ conversation, otherUser }, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
