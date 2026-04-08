# KinMeet - Connect with Your Homeland Community Abroad

KinMeet is a social networking application that connects people from the same home country who are living in another country. It helps expatriates find friendship, networking opportunities, and support from people who share their cultural background.

## 🌟 Features

### Core MVP Features

1. **Signup & Profile Setup**
   - Multi-step registration process
   - Profile includes: First name, last name (hidden until connected), home country, current location (province/state + country)
   - Languages spoken, personal interests, and what you're looking for (Friendship, Networking, Support)

2. **Matching & Discovery**
   - Discover people from your home country living in the same destination country
   - View profile cards with essential information
   - Meet or Pass on potential connections

3. **Connection Requests**
   - Silent Meet request system
   - Accept or ignore requests
   - Last names revealed only after connection acceptance

4. **Connections & Chat**
   - View full profiles of connected users
   - 1-to-1 text messaging
   - Real-time conversation updates

5. **Community Guidelines & Safety**
   - Privacy-first approach (no city-level details)
   - Block and report functionality
   - Respectful and inclusive community standards

## 🛠️ Tech Stack

### Back-end
- **Node.js** with **Express**
- **TypeScript**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Zod** for request validation
- **Socket.io** for real-time chat
- **Cloudinary** for profile images

### Front-end
- **React 19** with **TypeScript**
- **Vite** for build tooling
- **React Router** for navigation
- **Tailwind CSS** (v4 via PostCSS) for styling
- **Axios** for API calls
- **Socket.io** client for real-time updates

## 📋 Prerequisites

- **Node.js 22** (managed via `.nvmrc` — see below)
- **npm** (ships with Node)
- **MongoDB** (local installation or MongoDB Atlas account)
- **nvm** ([Node Version Manager](https://github.com/nvm-sh/nvm)) — recommended for managing Node versions

## 🚀 Getting Started

New contributors should read **[Contributor onboarding](onboard.md)** for team workflow, CI expectations, and **`npm ci` vs `npm install`**.

### 1. Clone the Repository

```bash
git clone <repo-url>
cd Kinmeet
```

### 2. Set the Correct Node Version

The repo includes an `.nvmrc` file pinned to Node 22. Run:

```bash
nvm install   # first time only — installs the version from .nvmrc
nvm use        # switches to the correct version
```

Verify with `node -v` — it should show `v22.x.x`.

### 3. Set Up the Back-end

```bash
cd back-end
npm ci
```

(Use `npm install` when you are adding or changing dependencies; see [onboard.md](onboard.md).)

Create a `back-end/.env` file:

```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/kinmeet
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
REACT_FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.

### 4. Set Up the Front-end

```bash
cd ../front-end
npm ci
```

(Use `npm install` when you are adding or changing dependencies; see [onboard.md](onboard.md).)

Create a `front-end/.env` file (optional):

```env
VITE_API_URL=http://localhost:8080/api
```

### 5. Start MongoDB

If using a local installation:

```bash
sudo systemctl start mongod
```

To run MongoDB in **Docker** instead, see [onboard.md](onboard.md) (Local MongoDB with Docker).

If using MongoDB Atlas, ensure your connection string is set in `back-end/.env`.

### 6. Run the Application

Open two terminals (both from the repo root):

**Terminal 1 — Back-end:**

```bash
cd back-end
npm run dev
```

Runs on `http://localhost:8080`

**Terminal 2 — Front-end:**

```bash
cd front-end
npm run dev
```

Runs on `http://localhost:5173`

### 7. Open the App

Navigate to `http://localhost:5173` in your browser.

## 🧪 Testing

### Back-end Tests (Vitest + Supertest)

```bash
cd back-end
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Uses an in-memory MongoDB instance — no running database required.

### Front-end Tests (Vitest + React Testing Library)

```bash
cd front-end
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

### E2E Tests (Playwright)

Requires a running MongoDB instance on `localhost:27017`.

```bash
cd front-end
npx playwright install --with-deps chromium   # first time only
npx playwright test                            # headless
npx playwright test --ui                       # interactive UI mode
```

Playwright starts both the back-end and front-end servers automatically via `playwright.config.ts`.

### CI/CD

Tests run automatically via GitHub Actions:

- **CI workflow** (`.github/workflows/ci.yml`) — on pushes to `main` and on pull requests targeting `main`: TypeScript check (`tsc --noEmit`), unit tests, and a production **front-end build**
- **E2E workflow** (`.github/workflows/e2e.yml`) — Playwright tests with a MongoDB service container: on **pull requests targeting `main`** (so you can require **E2E / e2e-tests** before merge), on **push to `main`** (post-merge), and on pushes to any extra branch listed in that file.

## 📱 Usage

### Creating an Account

1. Click "Sign up" on the login page
2. **Step 1:** Enter your email and password
3. **Step 2:** Enter your profile information (name, home country, current location)
4. **Step 3:** Add languages, interests, and what you're looking for
5. Complete signup and you'll be redirected to the Discover page

### Discovering People

1. Navigate to the **Discover** page
2. View profiles of people from your home country
3. Click **Meet** to send a connection request
4. Click **Pass** to skip to the next profile

### Managing Connection Requests

1. Navigate to the **Requests** page
2. View pending Meet requests from other users
3. **Accept** to form a connection (last names will be revealed)
4. **Ignore** to decline the request silently

### Chatting with Connections

1. Navigate to the **Connections** page
2. Click **Send Message** on a connection
3. Start chatting in the 1-to-1 conversation

### Viewing Your Profile

1. Click your avatar in the top navigation
2. Select **My Profile** from the dropdown
3. View your profile information and community guidelines

## 🗂️ Project Structure

```
Kinmeet/
├── .github/workflows/   # CI (ci.yml) and E2E (e2e.yml)
├── back-end/
│   ├── src/
│   │   ├── __tests__/        # Vitest tests (routes, services, socket)
│   │   ├── config/           # env, CORS
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/           # Socket.io server
│   │   └── app.ts            # Express + HTTP server entry
│   ├── package.json
│   └── tsconfig.json
│
├── front-end/
│   ├── e2e/                  # Playwright specs
│   ├── src/
│   │   ├── components/       # auth, chat, common, connections, matching, profile, dashboard
│   │   ├── contexts/         # Auth, Socket
│   │   ├── constants/
│   │   ├── services/         # API + socket client
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── postcss.config.js     # Tailwind v4 (@tailwindcss/postcss)
│   ├── playwright.config.ts
│   └── vite.config.ts
│
├── onboard.md           # Contributor onboarding
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Profile
- `GET /api/profile/me` - Get current user's profile
- `GET /api/profile/:userId` - Get user profile by ID
- `PUT /api/profile/me` - Update current user's profile
- `DELETE /api/profile/me` - Delete current user's account
- `POST /api/profile/photo` - Upload profile photo (multipart)
- `DELETE /api/profile/photo` - Remove profile photo

### Matching
- `GET /api/matching` - Get potential matches
- `POST /api/matching/meet` - Send a Meet request
- `POST /api/matching/pass` - Pass on a user

### Connections
- `GET /api/connections` - Get all connections
- `GET /api/connections/requests` - Get pending connection requests
- `POST /api/connections/requests/:requestId/accept` - Accept a connection request
- `POST /api/connections/requests/:requestId/ignore` - Ignore a connection request

### Chat
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversations/:userId` - Get conversation with a user
- `POST /api/chat/messages` - Send a message
- `POST /api/chat/messages/read` - Mark messages as read

### Block/Report
- `POST /api/block/block` - Block a user
- `DELETE /api/block/unblock/:userId` - Unblock a user
- `GET /api/block/blocked` - Get blocked users
- `POST /api/block/report` - Report a user

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Protected API routes
- CORS configuration
- Privacy-first design (no city-level location sharing)

## 🎨 Design Principles

- **Modern UI/UX**: Clean, intuitive interface with Tailwind CSS
- **Mobile-Responsive**: Works seamlessly on all devices
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Privacy-Focused**: Minimal data exposure, graduated information disclosure

## 🚧 Future Enhancements

- Group conversations
- Events and meetups
- Email notifications
- Multi-language support
- In-app reporting dashboard

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Start with **[onboard.md](onboard.md)** for branching, reviews, CI, and testing expectations.

## 👥 Support

For support, please open an issue in the repository.

---

**Built with ❤️ for connecting expatriate communities worldwide**
