import { describe, it, expect, afterAll, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('../../services/notificationService', () => ({
    notificationService: {
        notifyChatMessage: vi.fn().mockResolvedValue(undefined),
    },
}));

import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { CHAT_SOCKET_EVENTS, type ChatSocketEventName } from '../../socket/chatSocketEvents';
import type {
  ChatMarkReadPayload,
  ChatMessageFromSend,
  ChatMessagesReadPayload,
  ChatSendMessageAck,
  ChatSendMessagePayload,
  ChatTypingPayload,
  ChatUserTypingPayload,
} from '../../socket/chatSocketTypes';
import { initializeSocket } from '../../socket/socketServer';
import { createTestUser, getAuthToken } from '../helpers';
import { Connection } from '../../models/Connection';
import { Message } from '../../models/Message';
import { notificationService } from '../../services/notificationService';

let httpServer: HTTPServer;
let port: number;

const connectClient = (token: string): Promise<ClientSocket> => {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });
};

const waitForEvent = <T>(socket: ClientSocket, event: ChatSocketEventName, timeoutMs = 5000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

beforeAll(async () => {
  httpServer = createServer();
  initializeSocket(httpServer);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

beforeEach(() => {
  vi.mocked(notificationService.notifyChatMessage).mockClear();
});

describe('Socket.IO Handlers', () => {
  it('rejects connection without token', async () => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: {},
      transports: ['websocket'],
    });

    const error = await new Promise<Error>((resolve) => {
      socket.on('connect_error', resolve);
    });

    expect(error.message).toContain('Authentication error');
    socket.disconnect();
  });

  it('rejects connection with invalid token', async () => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token: 'invalid-token' },
      transports: ['websocket'],
    });

    const error = await new Promise<Error>((resolve) => {
      socket.on('connect_error', resolve);
    });

    expect(error.message).toContain('Authentication error');
    socket.disconnect();
  });

  it('delivers messages in real-time', async () => {
    const userA = await createTestUser({ email: 'socketa@test.com', firstName: 'Alice' });
    const userB = await createTestUser({ email: 'socketb@test.com', firstName: 'Bob' });
    await Connection.create({ user1: userA._id, user2: userB._id });

    const clientA = await connectClient(getAuthToken(userA));
    const clientB = await connectClient(getAuthToken(userB));

    try {
      const messagePromise = waitForEvent<ChatMessageFromSend>(clientB, CHAT_SOCKET_EVENTS.NEW_MESSAGE);

      const sendPayload: ChatSendMessagePayload = {
        receiverId: userB._id.toString(),
        content: 'Hello via socket!',
      };

      const ack = await new Promise<ChatSendMessageAck>((resolve) => {
        clientA.emit(CHAT_SOCKET_EVENTS.SEND_MESSAGE, sendPayload, resolve);
      });

      expect(ack.success).toBe(true);

      const received = await messagePromise;
      expect(received.content).toBe('Hello via socket!');

      const saved = await Message.findOne({ content: 'Hello via socket!' });
      expect(saved).not.toBeNull();

      expect(notificationService.notifyChatMessage).not.toHaveBeenCalled();
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });

  it('schedules push notification when receiver has no active socket', async () => {
    const userA = await createTestUser({ email: 'pusha@test.com', firstName: 'PushA' });
    const userB = await createTestUser({ email: 'pushb@test.com', firstName: 'PushB' });
    await Connection.create({ user1: userA._id, user2: userB._id });

    const clientA = await connectClient(getAuthToken(userA));

    try {
      const offlinePayload: ChatSendMessagePayload = {
        receiverId: userB._id.toString(),
        content: 'Offline push test',
      };

      const ack = await new Promise<ChatSendMessageAck>((resolve) => {
        clientA.emit(CHAT_SOCKET_EVENTS.SEND_MESSAGE, offlinePayload, resolve);
      });

      expect(ack.success).toBe(true);
      expect(notificationService.notifyChatMessage).toHaveBeenCalledTimes(1);
      expect(notificationService.notifyChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          receiverUserId: userB._id.toString(),
          senderUserId: userA._id.toString(),
          senderDisplayName: 'PushA User',
        }),
      );
    } finally {
      clientA.disconnect();
    }
  });

  it('broadcasts typing_start and typing_stop', async () => {
    const userA = await createTestUser({ email: 'typea@test.com' });
    const userB = await createTestUser({ email: 'typeb@test.com' });

    const clientA = await connectClient(getAuthToken(userA));
    const clientB = await connectClient(getAuthToken(userB));

    try {
      const typingPromise = waitForEvent<ChatUserTypingPayload>(clientB, CHAT_SOCKET_EVENTS.USER_TYPING);
      const typingStartPayload: ChatTypingPayload = { receiverId: userB._id.toString() };
      clientA.emit(CHAT_SOCKET_EVENTS.TYPING_START, typingStartPayload);

      const typing = await typingPromise;
      expect(typing.isTyping).toBe(true);
      expect(typing.userId).toBe(userA._id.toString());

      const stopPromise = waitForEvent<ChatUserTypingPayload>(clientB, CHAT_SOCKET_EVENTS.USER_TYPING);
      const typingStopPayload: ChatTypingPayload = { receiverId: userB._id.toString() };
      clientA.emit(CHAT_SOCKET_EVENTS.TYPING_STOP, typingStopPayload);

      const stopped = await stopPromise;
      expect(stopped.isTyping).toBe(false);
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });

  it('broadcasts read receipts', async () => {
    const userA = await createTestUser({ email: 'reada@test.com' });
    const userB = await createTestUser({ email: 'readb@test.com' });
    await Connection.create({ user1: userA._id, user2: userB._id });
    await Message.create({
      sender: userA._id,
      receiver: userB._id,
      content: 'Unread message',
      read: false,
    });

    const clientA = await connectClient(getAuthToken(userA));
    const clientB = await connectClient(getAuthToken(userB));

    try {
      const readPromise = waitForEvent<ChatMessagesReadPayload>(clientA, CHAT_SOCKET_EVENTS.MESSAGES_READ);
      const markReadPayload: ChatMarkReadPayload = { senderId: userA._id.toString() };
      clientB.emit(CHAT_SOCKET_EVENTS.MARK_READ, markReadPayload);

      const readEvent = await readPromise;
      expect(readEvent.readBy).toBe(userB._id.toString());
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });
});
