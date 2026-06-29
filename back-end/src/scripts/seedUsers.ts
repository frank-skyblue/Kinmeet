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
 * CLI: optional `--reset` drops the whole DB before seeding. Env: `MONGODB_URI` or `MONGO_URL`.
 * =============================================================================
 */

import mongoose, { Types } from 'mongoose';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Message } from '../models/Message';
import { Block } from '../models/Block';
import { IUser, User } from '../models/User';
import { blockService } from '../services/blockService';

type LookingForType = 'Friendship' | 'Networking' | 'Support';
type SeedGender = 'female' | 'male' | 'other';

type SeedUserData = {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  about: string;
  jobTitle: string;
  company?: string;
  institution?: string;
  graduationYear?: number;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  currentCity: string;
  languages: string[];
  interests: string[];
  lookingFor: LookingForType[];
  dateOfBirth: string;
  gender: SeedGender;
  profileComplete: boolean;
};

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

/** Index in `seedUsers` of Lucia (hub): connected only to indices in `LUCIA_CONNECTED_TO_INDICES`. */
const HUB_USER_INDEX = 0;
/** Index in `seedUsers` of the user who will have exactly 4 connections (Tomas: Lucia + three partners). */
const FOUR_CONNECTIONS_USER_INDEX = 9;

/** Lucia (hub) is connected to these seed user indices only — must be length 9 for “9 connections”. */
const LUCIA_CONNECTED_TO_INDICES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Target pending *incoming* connection requests per seed user index (receiver).
 * Index 0 (Lucia): 9 — filled by senders 10–18 (not connected to her; Patricia 19 unused for that count).
 * Other indices: 0 for this graph. Pairs that already have a `Connection` or any `ConnectionRequest`
 * (either direction) are skipped.
 */
const PENDING_INCOMING_REQUESTS_PER_USER_INDEX: readonly number[] = [
  9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/** `blockerIdx` / `blockedIdx` refer to positions in `seedUsers` (same as connection graph indices). */
const SEED_BLOCKS: readonly { blockerIdx: number; blockedIdx: number; reason: string }[] = [
  { blockerIdx: 1, blockedIdx: 9, reason: 'Seed: agreed to meet then went silent — prefer a clean break.' },
  { blockerIdx: 6, blockedIdx: 5, reason: 'Seed: crossed boundaries in chat.' },
  { blockerIdx: 4, blockedIdx: 3, reason: 'Seed: uncomfortable interaction at a meetup.' },
];

/**
 * Mock DMs between seed users. Pairs must be connected in the seeded graph **before** any blocks run.
 * Indices: 0 Lucia … 9 Tomas (core graph); 10–19 are extra profiles (no edges to Lucia in seed graph).
 */
const SEED_MESSAGES: readonly { senderIdx: number; receiverIdx: number; content: string; read: boolean }[] = [
  { senderIdx: 0, receiverIdx: 1, content: 'Hey Mateo — still good for coffee Saturday?', read: true },
  { senderIdx: 1, receiverIdx: 0, content: 'Sí! 10am at Boxcar Social works for me.', read: true },
  { senderIdx: 0, receiverIdx: 1, content: 'Perfect, I will grab us a table.', read: false },
  { senderIdx: 1, receiverIdx: 0, content: 'Gracias Lucia, see you then.', read: false },
  { senderIdx: 2, receiverIdx: 0, content: 'Lucia, do you know a good GP in the west end?', read: true },
  { senderIdx: 0, receiverIdx: 2, content: 'Yes — I will DM you the clinic name.', read: true },
  { senderIdx: 2, receiverIdx: 0, content: 'That would mean a lot, thank you.', read: false },
  { senderIdx: 3, receiverIdx: 9, content: 'Tomas, quick question about EllisDon referrals?', read: true },
  { senderIdx: 9, receiverIdx: 3, content: 'Shoot — what do you need?', read: true },
  { senderIdx: 3, receiverIdx: 9, content: 'Mostly whether they hire bilingual PMs.', read: true },
  { senderIdx: 9, receiverIdx: 3, content: 'They do. I can intro you to someone on my team.', read: false },
  { senderIdx: 3, receiverIdx: 9, content: 'Legend — thank you.', read: false },
  { senderIdx: 5, receiverIdx: 0, content: 'Lucia, any board game nights coming up?', read: true },
  { senderIdx: 0, receiverIdx: 5, content: 'Snakes and Lattes on Thursday if you are free.', read: false },
  { senderIdx: 8, receiverIdx: 0, content: 'Hola Lucia — saw your post about the asado. Count me in!', read: true },
  { senderIdx: 0, receiverIdx: 8, content: 'Amazing — I will send details this weekend.', read: false },
];

const undirectedPairKey = (a: Types.ObjectId, b: Types.ObjectId): string => {
  const sa = a.toString();
  const sb = b.toString();
  return sa < sb ? `${sa}:${sb}` : `${sb}:${sa}`;
};

const connectionKey = (a: Types.ObjectId, b: Types.ObjectId): string => {
  const { user1, user2 } = orderedUserPair(a, b);
  return `${user1.toString()}:${user2.toString()}`;
};

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/kinmeet';

/** When true (pass `--reset` on the CLI), drops the entire connected database before seeding. */
const RESET_DB = process.argv.includes('--reset');

const seedUsers: SeedUserData[] = [
  {
    email: 'lucia.martinez@example.com',
    username: 'lucia_m',
    password: 'Password123',
    firstName: 'Lucia',
    lastName: 'Martinez',
    dateOfBirth: '1997-05-14',
    gender: 'female',
    about: 'Moved to Canada two years ago for work. Love exploring new cities and meeting people from back home.',
    jobTitle: 'UX Designer',
    company: 'Shopify',
    institution: 'Universidad de Buenos Aires',
    graduationYear: 2019,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Photography', 'Hiking', 'Cooking', 'Travel'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'mateo.gomez@example.com',
    username: 'mateo_g',
    password: 'Password123',
    firstName: 'Mateo',
    lastName: 'Gomez',
    dateOfBirth: '1995-11-02',
    gender: 'male',
    about: 'Software developer from Córdoba. Always up for asado and fútbol on weekends.',
    jobTitle: 'Software Engineer',
    company: 'RBC',
    institution: 'Universidad Nacional de Córdoba',
    graduationYear: 2017,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'Portuguese'],
    interests: ['Sports', 'Gaming', 'Cooking', 'Technology'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'valentina.lopez@example.com',
    username: 'valentina_l',
    password: 'Password123',
    firstName: 'Valentina',
    lastName: 'Lopez',
    dateOfBirth: '1994-07-22',
    gender: 'female',
    about: 'Nurse practitioner passionate about healthcare and community. Miss my family in Mendoza but love my life here.',
    jobTitle: 'Nurse Practitioner',
    company: 'SickKids Hospital',
    institution: 'Universidad de Mendoza',
    graduationYear: 2016,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Yoga', 'Reading', 'Volunteering', 'Gardening'],
    lookingFor: ['Friendship', 'Support'],
    profileComplete: true,
  },
  {
    email: 'santiago.fernandez@example.com',
    username: 'santiago_f',
    password: 'Password123',
    firstName: 'Santiago',
    lastName: 'Fernandez',
    dateOfBirth: '1993-01-30',
    gender: 'male',
    about: 'Entrepreneur building a fintech startup. Relocated from Rosario. Always looking to connect with fellow Argentines.',
    jobTitle: 'Co-Founder & CEO',
    company: 'PayLatam',
    institution: 'Universidad Austral',
    graduationYear: 2015,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'Italian'],
    interests: ['Technology', 'Running', 'Reading', 'Wine Tasting'],
    lookingFor: ['Networking', 'Friendship'],
    profileComplete: true,
  },
  {
    email: 'camila.ruiz@example.com',
    username: 'camila_r',
    password: 'Password123',
    firstName: 'Camila',
    lastName: 'Ruiz',
    dateOfBirth: '2001-09-08',
    gender: 'female',
    about: 'Graduate student researching climate science. From Buenos Aires, adjusting to Canadian winters!',
    jobTitle: 'Research Assistant',
    company: 'University of Toronto',
    institution: 'University of Toronto',
    graduationYear: 2026,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'French'],
    interests: ['Science', 'Hiking', 'Photography', 'Cycling'],
    lookingFor: ['Friendship', 'Support'],
    profileComplete: true,
  },
  {
    email: 'nicolas.silva@example.com',
    username: 'nicolas_s',
    password: 'Password123',
    firstName: 'Nicolas',
    lastName: 'Silva',
    dateOfBirth: '1991-12-03',
    gender: 'male',
    about: 'Data analyst who loves board games and craft beer. Proud porteño living in the GTA.',
    jobTitle: 'Senior Data Analyst',
    company: 'TD Bank',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Board Games', 'Technology', 'Cooking', 'Sports'],
    lookingFor: ['Friendship'],
    profileComplete: true,
  },
  {
    email: 'sofia.moreno@example.com',
    username: 'sofia_m',
    password: 'Password123',
    firstName: 'Sofia',
    lastName: 'Moreno',
    dateOfBirth: '1996-04-17',
    gender: 'female',
    about: 'Architect turned project manager. Love exploring art galleries and discovering hidden gems around Toronto.',
    jobTitle: 'Project Manager',
    company: 'AECOM',
    institution: 'Universidad de La Plata',
    graduationYear: 2018,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Arts & Culture', 'Photography', 'Travel', 'Theatre'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'joaquin.garcia@example.com',
    username: 'joaquin_g',
    password: 'Password123',
    firstName: 'Joaquin',
    lastName: 'Garcia',
    dateOfBirth: '1990-08-25',
    gender: 'male',
    about: 'Personal trainer and fitness enthusiast from Mar del Plata. Helping people get strong, one rep at a time.',
    jobTitle: 'Personal Trainer',
    company: 'GoodLife Fitness',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Fitness', 'Running', 'Cooking', 'Music'],
    lookingFor: ['Friendship', 'Networking', 'Support'],
    profileComplete: true,
  },
  {
    email: 'martina.aguirre@example.com',
    username: 'martina_a',
    password: 'Password123',
    firstName: 'Martina',
    lastName: 'Aguirre',
    dateOfBirth: '1999-02-11',
    gender: 'female',
    about: 'Marketing professional and tango dancer. Bringing a little bit of Buenos Aires everywhere I go.',
    jobTitle: 'Marketing Manager',
    company: 'Scotiabank',
    institution: 'ITBA',
    graduationYear: 2020,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'French'],
    interests: ['Dancing', 'Music', 'Fashion', 'Travel'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'tomas.perez@example.com',
    username: 'tomas_p',
    password: 'Password123',
    firstName: 'Tomas',
    lastName: 'Perez',
    dateOfBirth: '1989-06-19',
    gender: 'male',
    about: 'Recently arrived in Canada. Working in construction management and looking to meet people from home.',
    jobTitle: 'Construction Manager',
    company: 'EllisDon',
    institution: 'Universidad Tecnológica Nacional',
    graduationYear: 2014,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Sports', 'Camping', 'DIY Projects', 'Fishing'],
    lookingFor: ['Friendship', 'Support'],
    profileComplete: true,
  },
  {
    email: 'alejandro.vega@example.com',
    username: 'alejandro_v',
    password: 'Password123',
    firstName: 'Alejandro',
    lastName: 'Vega',
    dateOfBirth: '1994-10-05',
    gender: 'male',
    about: 'Civil engineer who moved to Mississauga last year. Still looking for a good yerba mate supplier.',
    jobTitle: 'Structural Engineer',
    company: 'WSP',
    institution: 'Universidad Nacional del Litoral',
    graduationYear: 2016,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Mississauga',
    languages: ['Spanish', 'English'],
    interests: ['Cycling', 'Cooking', 'Sports', 'Podcasts'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'florencia.diaz@example.com',
    username: 'florencia_d',
    password: 'Password123',
    firstName: 'Florencia',
    lastName: 'Diaz',
    dateOfBirth: '1997-03-28',
    gender: 'female',
    about: "Elementary school teacher from La Plata. Love kids' books and weekend trips to Niagara.",
    jobTitle: 'Teacher',
    company: 'Peel District School Board',
    institution: 'UNLP',
    graduationYear: 2019,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'French'],
    interests: ['Reading', 'Hiking', 'Theatre', 'Volunteering'],
    lookingFor: ['Friendship', 'Support'],
    profileComplete: true,
  },
  {
    email: 'ricardo.soto@example.com',
    username: 'ricardo_s',
    password: 'Password123',
    firstName: 'Ricardo',
    lastName: 'Soto',
    dateOfBirth: '1988-07-14',
    gender: 'male',
    about: 'Electrician and weekend DJ. Trying to build a small studio in my basement.',
    jobTitle: 'Licensed Electrician',
    company: 'IESO Contractor',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Hamilton',
    languages: ['Spanish', 'English'],
    interests: ['Music', 'DIY Projects', 'Sports', 'Podcasts'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'julia.romero@example.com',
    username: 'julia_r',
    password: 'Password123',
    firstName: 'Julia',
    lastName: 'Romero',
    dateOfBirth: '1998-11-09',
    gender: 'female',
    about: 'PhD student in neuroscience. Missing asados but not the humidity of BA summers.',
    jobTitle: 'Graduate Researcher',
    company: 'McMaster University',
    institution: 'McMaster University',
    graduationYear: 2027,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Hamilton',
    languages: ['Spanish', 'English'],
    interests: ['Science', 'Running', 'Chess', 'Movies'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'facundo.castro@example.com',
    username: 'facundo_c',
    password: 'Password123',
    firstName: 'Facundo',
    lastName: 'Castro',
    dateOfBirth: '1992-05-20',
    gender: 'male',
    about: 'Barista and aspiring roaster. Always happy to trade café tips with fellow porteños.',
    jobTitle: 'Head Barista',
    company: 'Pilot Coffee Roasters',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English', 'Italian'],
    interests: ['Cooking', 'Cycling', 'Photography', 'Music'],
    lookingFor: ['Friendship'],
    profileComplete: true,
  },
  {
    email: 'carolina.navarro@example.com',
    username: 'carolina_n',
    password: 'Password123',
    firstName: 'Carolina',
    lastName: 'Navarro',
    dateOfBirth: '1995-08-01',
    gender: 'female',
    about: 'HR generalist at a tech startup. Organizing a Latinx professionals meetup in the GTA.',
    jobTitle: 'HR Business Partner',
    company: 'Wave Financial',
    institution: 'Universidad de Palermo',
    graduationYear: 2017,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Language Learning', 'Yoga', 'Travel', 'Cooking'],
    lookingFor: ['Networking', 'Friendship'],
    profileComplete: true,
  },
  {
    email: 'bruno.acosta@example.com',
    username: 'bruno_a',
    password: 'Password123',
    firstName: 'Bruno',
    lastName: 'Acosta',
    dateOfBirth: '1993-12-12',
    gender: 'male',
    about: 'Mechanic and rally fan. New to Ottawa, learning to skate like a true Canadian.',
    jobTitle: 'Automotive Technician',
    company: 'Canadian Tire',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Ottawa',
    languages: ['Spanish', 'English'],
    interests: ['Sports', 'Outdoor Activities', 'Cooking', 'Gaming'],
    lookingFor: ['Friendship', 'Support'],
    profileComplete: true,
  },
  {
    email: 'elena.vargas@example.com',
    username: 'elena_v',
    password: 'Password123',
    firstName: 'Elena',
    lastName: 'Vargas',
    dateOfBirth: '1994-06-06',
    gender: 'female',
    about: 'Graphic designer freelancing for nonprofits. Collecting vintage posters from Latin America.',
    jobTitle: 'Freelance Designer',
    company: 'Self-employed',
    institution: 'UBA FADU',
    graduationYear: 2015,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Drawing', 'Museum Visits', 'Swimming', 'Travel'],
    lookingFor: ['Friendship', 'Networking'],
    profileComplete: true,
  },
  {
    email: 'diego.morales@example.com',
    username: 'diego_m',
    password: 'Password123',
    firstName: 'Diego',
    lastName: 'Morales',
    dateOfBirth: '1987-04-03',
    gender: 'male',
    about: 'Warehouse lead by day, guitar by night. Tango classes on Tuesdays in the west end.',
    jobTitle: 'Warehouse Supervisor',
    company: 'Amazon',
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Music', 'Dancing', 'Sports', 'Cooking'],
    lookingFor: ['Friendship'],
    profileComplete: true,
  },
  {
    email: 'patricia.flores@example.com',
    username: 'patricia_f',
    password: 'Password123',
    firstName: 'Patricia',
    lastName: 'Flores',
    dateOfBirth: '1960-01-15',
    gender: 'female',
    about: 'Retired accountant, now volunteering with newcomers. Grandkids keep me on FaceTime daily.',
    jobTitle: 'Volunteer Tax Preparer',
    company: 'Community Centre',
    institution: 'Universidad de Buenos Aires',
    graduationYear: 1988,
    homeCountry: 'Argentina',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    currentCity: 'Toronto',
    languages: ['Spanish', 'English'],
    interests: ['Volunteering', 'Gardening', 'Outdoor Activities', 'Reading'],
    lookingFor: ['Support', 'Friendship'],
    profileComplete: true,
  },
];

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

    for (const userData of seedUsers) {
      const { dateOfBirth: dobIso, ...rest } = userData;
      const payload = { ...rest, dateOfBirth: toSeedDob(dobIso) };

      let user = await User.findOne({ email: userData.email });
      if (user) {
        console.log(`Skipped (already exists): ${userData.email}`);
        skipped++;
      } else {
        user = await User.create(payload);
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
