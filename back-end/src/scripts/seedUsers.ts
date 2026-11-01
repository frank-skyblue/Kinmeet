/**
 * =============================================================================
 * Kinmeet `seedUsers` — data reference (indices 0–19 match `seedUsers` array order)
 * =============================================================================
 *
 * ## Users (index, name, email, username — password for all: `Password123`)
 *
 * Each profile includes `dateOfBirth`, `gender`, and `currentCity` (required at signup).
 *
 * | Idx | First name | Last name   | Email                           |
 * |-----|------------|-------------|---------------------------------|
 * | 0   | Lucia      | Martinez    | lucia.martinez@example.com      |
 * | 1   | Mateo      | Gomez       | mateo.gomez@example.com         |
 * | 2   | Valentina  | Lopez       | valentina.lopez@example.com     |
 * | 3   | Santiago   | Fernandez   | santiago.fernandez@example.com  |
 * | 4   | Camila     | Ruiz        | camila.ruiz@example.com         |
 * | 5   | Nicolas    | Silva       | nicolas.silva@example.com       |
 * | 6   | Sofia      | Moreno      | sofia.moreno@example.com        |
 * | 7   | Joaquin    | Garcia      | joaquin.garcia@example.com      |
 * | 8   | Martina    | Aguirre     | martina.aguirre@example.com     |
 * | 9   | Tomas      | Perez       | tomas.perez@example.com         |
 * | 10  | Alejandro  | Vega        | alejandro.vega@example.com      |
 * | 11  | Florencia  | Diaz        | florencia.diaz@example.com      |
 * | 12  | Ricardo    | Soto        | ricardo.soto@example.com        |
 * | 13  | Julia      | Romero      | julia.romero@example.com        |
 * | 14  | Facundo    | Castro      | facundo.castro@example.com      |
 * | 15  | Carolina   | Navarro     | carolina.navarro@example.com    |
 * | 16  | Bruno      | Acosta      | bruno.acosta@example.com        |
 * | 17  | Elena      | Vargas      | elena.vargas@example.com        |
 * | 18  | Diego      | Morales     | diego.morales@example.com       |
 * | 19  | Patricia   | Flores      | patricia.flores@example.com     |
 *
 * ## Connections (`Connection` documents — undirected)
 *
 * Lucia (0) is connected **only** to users 1–9 (nine connections). Users 10–19 have **no**
 * connection to Lucia so they can appear as senders of incoming requests to her.
 * Extra: Tomas (9) is also connected to Mateo, Valentina, Santiago (1–3) — edges (1–9), (2–9), (3–9)
 * (0–9 already links Tomas to Lucia).
 *
 * Resulting degree (core 0–9): Lucia (0): 9 • Mateo–Santiago (1–3): 2 each • Camila–Martina (4–8): 1 each
 * (only to Lucia) • Tomas (9): 4 • Users 10–19: 0 from this seed graph (unless added later).
 *
 * Unique edge list among 0–9: 0–1 … 0–9, 1–9, 2–9, 3–9.
 *
 * ## Pending connection requests (`ConnectionRequest`, status `pending`)
 *
 * Targets for *incoming* count per receiver index (see `PENDING_INCOMING_REQUESTS_PER_USER_INDEX`).
 * Lucia (0) has target **9**; eligible senders are the lowest indices with no connection and no
 * existing request for that pair → senders **10–18** each have one pending request **to** Lucia.
 * Patricia (19) is not connected to Lucia but is left without a request to her so the incoming
 * count stays exactly 9. Other seed users have target 0 in this graph.
 *
 * Fill rule: receivers are processed in **descending target** (then ascending index) so users
 * who need many incoming requests are filled before others may use them as senders (one
 * undirected pair per user–user for requests). For each receiver `r`, add missing requests up to
 * the target by choosing the lowest sender indices `s` (ascending) where there is no
 * `Connection` with `r`, no `ConnectionRequest` in either direction for that pair yet, and
 * `s !== r`. Re-runs count existing pending toward the target.
 *
 * ## Mock messages (`Message` — see `SEED_MESSAGES`)
 *
 * Threads (must be connected *before* blocks run; script inserts messages before blocks):
 *   • Lucia ↔ Mateo  • Lucia ↔ Valentina  • Santiago ↔ Tomas  • Lucia ↔ Nicolas  • Lucia ↔ Martina
 * Each row: sender index → receiver index, text, `read` flag (see array in source).
 *
 * ## Blocks (`Block` — see `SEED_BLOCKS`, applied via `blockService.blockUser`)
 *
 *   • Mateo (1) blocks Tomas (9) — removes connection (1–9) and any requests between them.
 *   • Sofia (6) blocks Nicolas (5) — no prior connection in this graph.
 *   • Camila (4) blocks Santiago (3) — no prior connection in this graph.
 *
 * ## Script order (when ≥20 users exist)
 *
 * 1. Upsert users  2. Create connections  3. Seed pending incoming requests
 * 4. Insert mock messages  5. Apply blocks (may delete connections/requests per app rules)
 *
 * CLI: optional `--reset` drops the whole DB before seeding. Env: `MONGODB_URI`.
 * =============================================================================
 */


import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Message } from '../models/Message';
import { Block } from '../models/Block';
import { IUser, User } from '../models/User';
import { blockService } from '../services/blockService';
import { MONGODB_URI } from '../config/env';
import {
  FOUR_CONNECTIONS_USER_INDEX,
  HUB_USER_INDEX,
  LUCIA_CONNECTED_TO_INDICES,
  PENDING_INCOMING_REQUESTS_PER_USER_INDEX,
  SEED_BLOCKS,
  SEED_MESSAGES,
  seedUsers,
} from './seedData';

const toSeedDob = (iso: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Invalid seed dateOfBirth: ${iso}`);
  }
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0),
  );
};

/** Match `connectionService.acceptConnectionRequest` ordering for the unique index. */
const orderedUserPair = (
  a: Types.ObjectId,
  b: Types.ObjectId
): { user1: Types.ObjectId; user2: Types.ObjectId } =>
  a.toString() < b.toString()
    ? { user1: a, user2: b }
    : { user1: b, user2: a };

const undirectedPairKey = (a: Types.ObjectId, b: Types.ObjectId): string => {
  const sa = a.toString();
  const sb = b.toString();
  return sa < sb ? `${sa}:${sb}` : `${sb}:${sa}`;
};

const connectionKey = (a: Types.ObjectId, b: Types.ObjectId): string => {
  const { user1, user2 } = orderedUserPair(a, b);
  return `${user1.toString()}:${user2.toString()}`;
};

/** When true (pass `--reset` on the CLI), drops the entire connected database before seeding. */
const RESET_DB = process.argv.includes('--reset');

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'kinmeet' });
    console.log('Connected to MongoDB');

    if (RESET_DB) {
      const name = mongoose.connection.db?.databaseName ?? 'kinmeet';
      await mongoose.connection.dropDatabase();
      console.log(`Reset: dropped database "${name}" (all collections).`);
    }

    let created = 0;
    let skipped = 0;
    const usersInOrder: IUser[] = [];

    for (let i = 0; i < seedUsers.length; i += 1) {
      const userData = seedUsers[i]!;
      let user = await User.findOne({ email: userData.email });
      if (user) {
        console.log(`Skipped (already exists): ${userData.email}`);
        skipped++;
      } else {
        user = await User.create({
          ...userData,
          dateOfBirth: toSeedDob(userData.dateOfBirth),
        });
        console.log(`Created: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        created++;
      }
      usersInOrder.push(user);
    }

    const n = usersInOrder.length;
    const minUsersForGraph = 20;
    if (n < minUsersForGraph) {
      console.log(
        `\nSkipping connections: need ${minUsersForGraph} seed users for the connection graph (have ${n}).`,
      );
    } else {
      const hub = usersInOrder[HUB_USER_INDEX]!;
      const fourConn = usersInOrder[FOUR_CONNECTIONS_USER_INDEX]!;
      const pairKeys = new Set<string>();
      const pairs: { user1: Types.ObjectId; user2: Types.ObjectId }[] = [];

      const registerPair = (a: Types.ObjectId, b: Types.ObjectId) => {
        const { user1, user2 } = orderedUserPair(a, b);
        const key = `${user1.toString()}:${user2.toString()}`;
        if (pairKeys.has(key)) return;
        pairKeys.add(key);
        pairs.push({ user1, user2 });
      };

      for (const idx of LUCIA_CONNECTED_TO_INDICES) {
        if (idx < 0 || idx >= n) continue;
        registerPair(hub._id, usersInOrder[idx]!._id);
      }

      const fourConnPartners = [
        usersInOrder[0]!,
        usersInOrder[1]!,
        usersInOrder[2]!,
        usersInOrder[3]!,
      ];
      for (const partner of fourConnPartners) {
        registerPair(fourConn._id, partner._id);
      }

      let connectionsCreated = 0;
      let connectionsSkipped = 0;
      for (const { user1, user2 } of pairs) {
        const exists = await Connection.findOne({ user1, user2 });
        if (exists) {
          connectionsSkipped++;
          continue;
        }
        await Connection.create({ user1, user2 });
        connectionsCreated++;
      }

      console.log(
        `\nConnections: created ${connectionsCreated}, already present ${connectionsSkipped}.`,
      );
      const luciaPartnerNames = LUCIA_CONNECTED_TO_INDICES.map(
        (idx) => `${usersInOrder[idx]!.firstName} ${usersInOrder[idx]!.lastName}`,
      ).join(', ');
      console.log(
        `  • ${hub.firstName} ${hub.lastName} (${hub.email}): ${LUCIA_CONNECTED_TO_INDICES.length} connections (${luciaPartnerNames}).`,
      );
      console.log(
        `  • ${fourConn.firstName} ${fourConn.lastName} (${fourConn.email}): 4 connections.`
      );

      const connectedKeys = new Set<string>();
      for (const { user1, user2 } of pairs) {
        connectedKeys.add(connectionKey(user1, user2));
      }

      const hasConnection = (a: Types.ObjectId, b: Types.ObjectId): boolean =>
        connectedKeys.has(connectionKey(a, b));

      const seedUserIds = usersInOrder.map((u) => u._id);
      const existingReqDocs = await ConnectionRequest.find({
        sender: { $in: seedUserIds },
        receiver: { $in: seedUserIds },
      }).select('sender receiver status');

      const requestBlocksUndirected = new Set<string>();
      const pendingIncomingByReceiverId = new Map<string, number>();
      for (const doc of existingReqDocs) {
        requestBlocksUndirected.add(undirectedPairKey(doc.sender, doc.receiver));
        if (doc.status === 'pending') {
          const rid = doc.receiver.toString();
          pendingIncomingByReceiverId.set(rid, (pendingIncomingByReceiverId.get(rid) ?? 0) + 1);
        }
      }

      let requestsCreated = 0;
      let requestsSkippedCap = 0;

      const receiverIndices = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
        const ta = PENDING_INCOMING_REQUESTS_PER_USER_INDEX[a] ?? 0;
        const tb = PENDING_INCOMING_REQUESTS_PER_USER_INDEX[b] ?? 0;
        if (tb !== ta) return tb - ta;
        return a - b;
      });

      for (const r of receiverIndices) {
        const targetTotal = PENDING_INCOMING_REQUESTS_PER_USER_INDEX[r] ?? 0;
        const receiver = usersInOrder[r]!;
        const rid = receiver._id.toString();
        const alreadyPending = pendingIncomingByReceiverId.get(rid) ?? 0;
        let need = Math.max(0, targetTotal - alreadyPending);
        if (need === 0) continue;

        const eligibleSenderIds: Types.ObjectId[] = [];
        for (let s = 0; s < n; s += 1) {
          if (s === r) continue;
          const senderId = usersInOrder[s]!._id;
          if (hasConnection(senderId, receiver._id)) continue;
          const und = undirectedPairKey(senderId, receiver._id);
          if (requestBlocksUndirected.has(und)) continue;
          eligibleSenderIds.push(senderId);
        }

        const take = Math.min(need, eligibleSenderIds.length);
        if (take < need) {
          requestsSkippedCap += need - take;
        }

        for (let k = 0; k < take; k += 1) {
          const sender = eligibleSenderIds[k]!;
          await ConnectionRequest.create({
            sender,
            receiver: receiver._id,
            status: 'pending',
          });
          requestBlocksUndirected.add(undirectedPairKey(sender, receiver._id));
          pendingIncomingByReceiverId.set(
            rid,
            (pendingIncomingByReceiverId.get(rid) ?? 0) + 1,
          );
          requestsCreated += 1;
        }
      }

      console.log(
        `\nConnection requests (pending incoming): created ${requestsCreated}.` +
        (requestsSkippedCap > 0
          ? ` (${requestsSkippedCap} fewer than targets — not enough eligible sender pairs.)`
          : ''),
      );
      for (let r = 0; r < n; r += 1) {
        const u = usersInOrder[r]!;
        const count = pendingIncomingByReceiverId.get(u._id.toString()) ?? 0;
        const target = PENDING_INCOMING_REQUESTS_PER_USER_INDEX[r] ?? 0;
        console.log(
          `  • ${u.firstName} ${u.lastName}: ${count} pending incoming (target ${target})`,
        );
      }

      const messageBaseMs = Date.now() - 8 * 24 * 60 * 60 * 1000;
      let messagesCreated = 0;
      let messagesSkipped = 0;
      for (let i = 0; i < SEED_MESSAGES.length; i += 1) {
        const row = SEED_MESSAGES[i]!;
        const sender = usersInOrder[row.senderIdx]!._id;
        const receiver = usersInOrder[row.receiverIdx]!._id;
        if (!hasConnection(sender, receiver)) {
          messagesSkipped += 1;
          continue;
        }
        const dup = await Message.findOne({
          sender,
          receiver,
          content: row.content,
        });
        if (dup) {
          messagesSkipped += 1;
          continue;
        }
        const at = new Date(messageBaseMs + i * 90_000);
        await Message.create({
          sender,
          receiver,
          content: row.content,
          read: row.read,
          createdAt: at,
        });
        messagesCreated += 1;
      }
      console.log(
        `\nMessages: created ${messagesCreated}, skipped ${messagesSkipped} (no connection or duplicate).`,
      );

      let blocksCreated = 0;
      let blocksSkipped = 0;
      for (const spec of SEED_BLOCKS) {
        const blocker = usersInOrder[spec.blockerIdx]!._id;
        const blocked = usersInOrder[spec.blockedIdx]!._id;
        const exists = await Block.findOne({ blocker, blocked });
        if (exists) {
          blocksSkipped += 1;
          continue;
        }
        await blockService.blockUser(
          blocker.toString(),
          blocked.toString(),
          spec.reason,
        );
        blocksCreated += 1;
      }
      console.log(
        `\nBlocks: created ${blocksCreated}, skipped ${blocksSkipped} (already present).`,
      );
    }

    console.log(`\nDone! Created ${created} users, skipped ${skipped}.`);
    console.log('All users share password: Password123');
    if (!RESET_DB) {
      console.log('Tip: pass --reset to drop the kinmeet DB first, then seed from scratch.');
    }
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
