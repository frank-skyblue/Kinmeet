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
- **bcrypt** for password hashing

### Front-end
- **React 19** with **TypeScript**
- **Vite** for build tooling
- **React Router** for navigation
- **TailwindCSS** for styling
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd /home/frank/Documents/project/Kinmeet
```

### 2. Set Up the Back-end

```bash
cd back-end

# Install dependencies
npm install

# Create a .env file
touch .env
```

Add the following to your `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/kinmeet
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kinmeet

# JWT Secret (use a strong, random string in production)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Port
PORT=8080

# Frontend URL (for CORS)
REACT_FRONTEND_URL=http://localhost:5173
```

### 3. Set Up the Front-end

```bash
cd ../front-end

# Install dependencies
npm install

# Create a .env file (optional)
touch .env
```

Add the following to your `.env` file (optional):

```env
VITE_API_URL=http://localhost:8080/api
```

### 4. Start MongoDB

If using local MongoDB:

```bash
# Start MongoDB service
sudo systemctl start mongodb
# or
mongod
```

If using MongoDB Atlas, ensure your connection string is correct in the back-end `.env` file.

### 5. Run the Application

**Terminal 1 - Back-end:**

```bash
cd back-end
npm run dev
```

The back-end will start on `http://localhost:8080`

**Terminal 2 - Front-end:**

```bash
cd front-end
npm run dev
```

The front-end will start on `http://localhost:5173`

### 6. Access the Application

Open your browser and navigate to `http://localhost:5173`

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
├── back-end/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth middleware
│   │   └── app.ts           # Express app setup
│   ├── package.json
│   └── tsconfig.json
│
├── front-end/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── auth/        # Login, Signup
│   │   │   ├── matching/    # Discover page
│   │   │   ├── connections/ # Requests, Connections list
│   │   │   ├── chat/        # Chat interface
│   │   │   ├── profile/     # Profile page
│   │   │   └── dashboard/   # Layout, Navigation
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── services/        # API service layer
│   │   ├── App.tsx          # Main app with routing
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
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

- Password hashing with bcrypt
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

- Real-time messaging with WebSockets
- Profile photo upload
- Advanced filtering and search
- Group conversations
- Events and meetups
- Email notifications
- Multi-language support
- In-app reporting dashboard

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👥 Support

For support, please open an issue in the repository.

---

**Built with ❤️ for connecting expatriate communities worldwide**
