import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { VotingRoomModel } from "@workspace/db";
import { computeTally, isReaction } from "./voting-tally";
import { logger } from "./logger";

interface JoinPayload {
  roomId: string;
}

interface CastVotePayload {
  roomId: string;
  voterId: string;
  reaction: string;
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

    socket.on("voting:cast", async ({ roomId, voterId, reaction }: CastVotePayload) => {
      if (!roomId || !voterId || !isReaction(reaction)) return;

      try {
        const existingRoom = await VotingRoomModel.findOne({ id: roomId }, { creatorVoterId: 1 }).lean();
        if (!existingRoom || existingRoom.creatorVoterId === voterId) return;

        const now = new Date().toISOString();
        let room = await VotingRoomModel.findOneAndUpdate(
          { id: roomId, "voters.voterId": voterId },
          { $set: { "voters.$.reaction": reaction, "voters.$.updatedAt": now } },
          { new: true },
        );

        if (!room) {
          room = await VotingRoomModel.findOneAndUpdate(
            { id: roomId },
            { $push: { voters: { voterId, reaction, updatedAt: now } } },
            { new: true },
          );
        }

        if (!room) return;

        io.to(roomId).emit("voting:tally", {
          tally: computeTally(room.voters),
          totalVoters: room.voters.length,
        });
      } catch (err) {
        logger.error({ err }, "Failed to record vote");
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
