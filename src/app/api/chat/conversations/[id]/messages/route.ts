import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Check if conversation exists
    const conversation = await db.chatConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const [messages, total] = await Promise.all([
      db.chatMessage.findMany({
        where: { conversationId: id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      db.chatMessage.count({ where: { conversationId: id } }),
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { senderId, content, type } = body;

    if (!senderId || !content) {
      return NextResponse.json(
        { error: 'Sender ID and content are required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await db.chatConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = await db.chatMessage.create({
      data: {
        conversationId: id,
        senderId,
        content,
        type: type || 'text',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    // Update conversation's last message
    await db.chatConversation.update({
      where: { id },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
      },
    });

    // Create notification for the other participant
    const otherUserId =
      conversation.participantA === senderId
        ? conversation.participantB
        : conversation.participantA;

    await notify({
      data: {
        userId: otherUserId,
        title: 'New Message',
        message: content.length > 50 ? content.substring(0, 50) + '...' : content,
        type: 'chat',
        relatedId: id,
      },
    });

    // Send email notification to the other participant (async, non-blocking)
    setImmediate(async () => {
      try {
        const { sendEmail } = await import('@/lib/email')
        const { newChatMessageHtml } = await import('@/lib/email-templates')

        // Fetch the other user's email and the sender's name
        const [otherUser, senderUser] = await Promise.all([
          db.user.findUnique({
            where: { id: otherUserId },
            select: { email: true, name: true },
          }),
          db.user.findUnique({
            where: { id: senderId },
            select: { name: true },
          }),
        ])

        if (!otherUser?.email || !senderUser?.name) return
        // Skip phone-auth users with fake emails
        if (otherUser.email.endsWith('@phone.sintha.app')) return
        if (otherUser.email === 'undefined') return

        const messagePreview = content.length > 100 ? content.substring(0, 100) : content
        const html = newChatMessageHtml({
          senderName: senderUser.name,
          messagePreview,
          conversationId: id,
        })

        await sendEmail({
          to: otherUser.email,
          subject: `💬 ${senderUser.name} sent you a message on SINTHA`,
          html,
        })
      } catch (emailErr) {
        console.error('[Email] Chat message email failed:', emailErr)
      }
    })

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
