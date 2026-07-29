import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { VotingRoomModel } from "@workspace/db";
import { computeTally, extractComments, isReaction } from "./voting-tally";
import { containsProfanity } from "./profanity-filter";
import { logger } from "./logger";

const MAX_COMMENT_LENGTH = 280;

interface JoinPayload {
  roomId: string;
}

interface CastVotePayload {
  roomId: string;
  voterId: string;
  voterName?: string;
  reaction: string;
  comment?: string;
}

interface CastVoteAck {
  ok: boolean;
  commentRejected?: boolean;
}

function presenceCount(io: SocketIOServer, roomId: string): number {
  return io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
}

export function attachSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("voting:join", ({ roomId }: JoinPayload) => {
      if (!roomId) return;
      socket.join(roomId);
      io.to(roomId).emit("voting:presence", { count: presenceCount(io, roomId) });
    });

    socket.on("voting:cast", async (
      { roomId, voterId, voterName, reaction, comment }: CastVotePayload,
      ack?: (response: CastVoteAck) => void,
    ) => {
      if (!roomId || !voterId || !isReaction(reaction)) {
        ack?.({ ok: false });
        return;
      }

      const rawComment = comment?.trim().slice(0, MAX_COMMENT_LENGTH) || undefined;
      const commentRejected = Boolean(rawComment && containsProfanity(rawComment));
      const trimmedComment = commentRejected ? undefined : rawComment;
      const trimmedName = voterName?.trim().slice(0, 40) || undefined;

      try {
        const existingRoom = await VotingRoomModel.findOne({ id: roomId }, { creatorVoterId: 1 }).lean();
        if (!existingRoom || existingRoom.creatorVoterId === voterId) {
          ack?.({ ok: false });
          return;
        }

        const now = new Date().toISOString();
        // Only touch the comment field when we have a clean one to write — leaves
        // a voter's previously-posted comment intact if a later rejected one comes in.
        const setFields: Record<string, unknown> = {
          "voters.$.reaction": reaction,
          "voters.$.updatedAt": now,
          "voters.$.voterName": trimmedName,
        };
        if (trimmedComment !== undefined) setFields["voters.$.comment"] = trimmedComment;

        let room = await VotingRoomModel.findOneAndUpdate(
          { id: roomId, "voters.voterId": voterId },
          { $set: setFields },
          { new: true },
        );

        if (!room) {
          room = await VotingRoomModel.findOneAndUpdate(
            { id: roomId },
            { $push: { voters: { voterId, voterName: trimmedName, reaction, comment: trimmedComment, updatedAt: now } } },
            { new: true },
          );
        }

        if (!room) {
          ack?.({ ok: false });
          return;
        }

        io.to(roomId).emit("voting:tally", {
          tally: computeTally(room.voters),
          totalVoters: room.voters.length,
          comments: extractComments(room.voters),
        });
        ack?.({ ok: true, commentRejected });
      } catch (err) {
        logger.error({ err }, "Failed to record vote");
        ack?.({ ok: false });
      }
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        // Size hasn't been decremented yet at this point, so subtract this socket.
        io.to(roomId).emit("voting:presence", { count: Math.max(0, presenceCount(io, roomId) - 1) });
      }
    });
  });

  return io;
}
