*This project has been created as part of the 42 curriculum by makhudon, tiyang, tkremnov and lperekhr.*

# # Codamium — ft_transcendence

**A Medium-style publishing platform built with React, Express, and PostgreSQL.**

---

## Description

**Codamium** is a full-stack social publishing platform where users can write and read articles, interact through comments and likes, connect with friends, and chat in real time. The platform includes a gamification system with badges and a leaderboard, a moderation dashboard for admins and moderators, and supports three languages.

**Key features:**

- Publish, edit, and browse Markdown articles with categories and search
- Comment on and like articles in real time
- Friend system with requests, online status, and real-time chat via WebSockets
- Follow authors and receive in-app notifications
- Earn badges, XP, and climb the global leaderboard
- Admin and moderator dashboard for content moderation and role management
- OAuth 2.0 login via GitHub, Google, and 42
- Internationalization in English, Dutch, and Ukrainian
- Installable as a Progressive Web App (PWA) with offline fallback

---

## Instructions

### Prerequisites

- Git
- Docker Engine (v24+) and Docker Compose (v2+)
- `make`
- `mkcert` (for local HTTPS certificate generation)
  - macOS: `brew install mkcert`
  - Ubuntu: install `libnss3-tools` and `mkcert` using the instructions for your distribution, or build `mkcert` from source

### 1. Clone the repository

```bash
git clone https://github.com/MariiaKhud/ft_transcendence.git
cd ft_transcendence
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values. Minimum required:

```env
# Database — use 'postgres' as host when running in Docker, not localhost
DATABASE_URL=postgresql://transcendence:transcendence@postgres:5432/transcendence
POSTGRES_DB=transcendence
POSTGRES_USER=transcendence
POSTGRES_PASSWORD=transcendence

# Auth
JWT_SECRET=change-this-to-a-long-random-secret

# Ports
BACKEND_PORT=3000
FRONTEND_PORT=5173
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443

# Environment
NODE_ENV=development
UPLOAD_PATH=./uploads

# OAuth — fill in or leave empty to disable a provider
# GitHub
OAUTH_GITHUB_CLIENT_ID=replace-with-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=replace-with-github-client-secret
OAUTH_GITHUB_CALLBACK_URL=https://localhost:8443/api/auth/oauth/github/callback

# Google
OAUTH_GOOGLE_CLIENT_ID=replace-with-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
OAUTH_GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/oauth/google/callback

# 42
OAUTH_42_CLIENT_ID=replace-with-42-client-id
OAUTH_42_CLIENT_SECRET=replace-with-42-client-secret
OAUTH_42_CALLBACK_URL=https://localhost:8443/api/auth/oauth/42/callback

OAUTH_SUCCESS_REDIRECT=https://localhost:8443/
OAUTH_ERROR_REDIRECT=https://localhost:8443/login
```

> Any provider with incomplete credentials (only ID, no secret) is automatically disabled at runtime. You can leave all OAuth variables as placeholders to skip OAuth entirely for local testing.

> The evaluation Docker Compose configuration uses the Docker PostgreSQL service internally at `postgres:5432`. The backend connection URL is defined by the Compose configuration, so `DATABASE_URL` in `.env` is informational unless the Compose file is changed to use it.

### 3. Start the project

```bash
make start
```

`make start` will:
1. Generate a local HTTPS certificate via `mkcert`
2. Build and start the four Docker Compose services (postgres, backend, frontend, nginx)
3. Wait for the backend to become healthy
4. Run Prisma migrations
5. Seed the database with test data

If your browser warns about the certificate, trust the CA certificate:

```bash
# The CA path is printed by mkcert during setup, typically:
~/.local/share/mkcert/rootCA.pem   # Linux
~/Library/Application Support/mkcert/rootCA.pem  # macOS
```

### 4. Open the app

```
https://localhost:8443
```

### Test accounts (seeded)

| Email | Password | Role |
|---|---|---|
| alice@example.com | password123 | User |
| bob@example.com | password123 | User |
| carol@example.com | password123 | Moderator |
| admin@example.com | password123 | Admin |

### Available make commands

```bash
make help                    # show all available commands

make up                     # build and start development services
make dev-start              # start development services in the background
make start                  # start the evaluation stack, apply migrations, and seed the database
                            # (also generates the local HTTPS certificate when needed)
make eval-up                # start evaluation services without migrations or seeding
make eval-down              # stop evaluation services
make eval-migrate           # apply production migrations
make eval-seed              # seed the evaluation database
make down                   # stop development services
make clean                  # stop services and remove volumes
make logs                   # stream logs from all development services
make migrate                # run Prisma development migrations
make seed                   # seed the development database
make setup-local-cert       # generate the local HTTPS certificate

make test-backend           # run backend flow tests
make test-frontend          # run frontend smoke tests
make test-browser-compat    # run browser compatibility tests
make test-i18n              # run internationalization tests
make test-friends           # run friends integration tests
make test-follows           # run follows integration tests
make test-messages          # run messages integration tests
make test-gamification      # run gamification integration tests
make test-articles          # run article backend and frontend tests
make test-articles-backend  # run article backend tests
make test-articles-frontend # run article frontend tests
make test-realtime          # run Socket.IO real-time tests
make test-all               # run all test suites
```

### OAuth provider setup (if testing OAuth)

Register callback URLs in each provider's developer console:

| Provider | Console | Callback URL |
|---|---|---|
| GitHub | github.com/settings/developers | `https://localhost:8443/api/auth/oauth/github/callback` |
| Google | console.cloud.google.com | `https://localhost:8443/api/auth/oauth/google/callback` |
| 42 | profile.intra.42.fr/oauth/applications | `https://localhost:8443/api/auth/oauth/42/callback` |

---

## Resources

### Documentation used

- [React documentation](https://react.dev)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
- [Express.js documentation](https://expressjs.com)
- [Prisma documentation](https://www.prisma.io/docs)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Socket.IO documentation](https://socket.io/docs/)
- [Vite documentation](https://vitejs.dev/guide/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [i18next documentation](https://www.i18next.com)
- [JWT specification (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [WCAG 2.1 guidelines](https://www.w3.org/TR/WCAG21/)
- [MDN Web Docs — Web APIs, HTML, CSS](https://developer.mozilla.org)
- [OAuth 2.0 specification (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [PWA documentation (web.dev)](https://web.dev/progressive-web-apps/)
- [i18n architecture](I18N.md)

### AI usage

AI tools were used as a support tool during the development of the project, mainly to reduce repetitive tasks and help with research and problem solving.

AI was used for:

- understanding technical concepts and documentation
- discussing architecture and possible implementation approaches
- debugging and investigating errors
- reviewing and improving code and documentation
- generating test ideas and edge cases
- helping with project planning and README documentation

AI was not used as a replacement for understanding or peer review. Generated suggestions and code were reviewed, tested, adapted to the project, and discussed with teammates when needed. The team only kept solutions that we understood and could explain.

---

## Team Information

| Login | Name | Role |
|-------|------|------|
| makhudon | Mariia Khudonohova | Product Owner (PO), Developer |
| tiyang   | Tingting Yang      | Technical Lead / Architect, Developer |
| tkremnov | Tanya Kremnova     | Technical Lead / Architect, Developer |
| lperekhr | Lidiia Perekhrest  | Project Manager (PM) / Scrum Master, Developer |

### Mariia Khudonohova — Product Owner, Developer
**Feature slice: Auth + User foundation**

As Product Owner, Mariia defined the project scope, prioritized the feature backlog, and made final decisions on product direction. As a developer, she built the authentication foundation that the entire project depends on.

Responsibilities:
- Product vision, feature prioritization, and backlog ownership
- Authentication system (register, login, logout, JWT in HttpOnly cookies, CSRF protection)
- OAuth 2.0 integration (GitHub, Google, 42) with account linking
- User profiles, avatar upload and management
- Privacy Policy and Terms of Service pages
- Docker Compose setup and nginx HTTPS configuration
- Project setup and shared type system (/shared/types/)

### Tingting Yang — Technical Lead / Architect, Developer
**Feature slice: Articles + Feed**

As one of two Technical Leads, Tingting co-owned the overall system architecture, reviewed cross-team technical decisions, and set standards for API design and code quality. As a developer, she built the core content system.

Responsibilities:
- Co-ownership of system architecture and technical standards
- API design patterns and code review
- Article CRUD (create, edit, delete, publish)
- Global feed with pagination
- Category filtering and advanced search
- Comments (create, edit, delete, soft-remove)
- Article likes with optimistic UI
- Real-time comment and like updates via Socket.IO
- Internationalization (i18n) — English, Dutch, Ukrainian

### Tanya Kremnova — Technical Lead / Architect, Developer
**Feature slice: Social Layer**

As one of two Technical Leads, Tanya co-owned the system architecture with a focus on real-time infrastructure and the WebSocket layer. As a developer, she built all social and communication features.

Responsibilities:
- Co-ownership of system architecture, real-time infrastructure design
- WebSocket architecture (Socket.IO setup, room strategy, grace period logic)
- Friends system (send, accept, decline, cancel, remove requests)
- Follow/unfollow system
- Real-time chat with WebSockets (Socket.IO)
- In-app notification system (bell, dropdown, notifications page)
- Online/offline status with 30-second grace period

### Lidiia Perekhrest — Project Manager (PM) / Scrum Master, Developer
**Feature slice: Gamification + Admin**

As Project Manager and Scrum Master, Lidiia organized the team's workflow, facilitated weekly syncs, tracked progress in Jira, and ensured the project stayed on schedule. As a developer, she built the gamification system and admin tooling.

Responsibilities:
- Sprint planning, Jira board management, and progress tracking
- Facilitating weekly team syncs and removing blockers
- Badge system (earn, display, award on triggers)
- XP and level system with level-up toast
- Global leaderboard
- Admin and moderator dashboard
- Content moderation (soft-remove articles and comments with reason)
- Role management
- Progressive Web App (PWA) setup and service worker
- Browser compatibility testing

---

## Project Management

### Work organization

The team used **vertical slice architecture**: each developer owned one complete feature area end-to-end, from database schema through API routes to React components. This allowed parallel development with minimal blocking between team members.

Build order was agreed at the start:
1. Auth + project setup (unblocks everything)
2. Articles + feed (core content)
3. Social layer (friends, chat, notifications)
4. Gamification + admin dashboard

### Tools

| Purpose | Tool |
|---------|------|
| Task tracking | Jira (tickets, story points) |
| Version control | Git + GitHub |
| Communication | Slack (daily text, voice calls) |

---

## Technical Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React      | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite       | 7 | Build tool and dev server |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui  | — | Accessible UI primitives |
| React Router | 7 | Client-side routing |
| Socket.IO client | 4 | Real-time communication |
| i18next    | — | Internationalization |
| React Markdown | — | Markdown rendering |
| Zustand    | — | Global state management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js    | 20 | Runtime |
| Express    | 4 | HTTP framework |
| TypeScript | 5 | Type safety |
| Socket.IO  | 4 | WebSocket server |
| Prisma     | 7 | ORM and migrations |
| bcryptjs   | — | Password hashing |
| jsonwebtoken | — | JWT signing and verification |
| Passport.js | — | OAuth 2.0 strategy handling |
| Multer     | — | File upload middleware |
| cookie-parser | — | Cookie handling |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL 16 | Primary database |
| Prisma ORM | Schema, migrations, typed queries |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker + Docker Compose | Container orchestration |
| nginx | Reverse proxy, HTTPS termination, static file serving |
| mkcert | Local HTTPS certificate generation |
| GitHub Actions | CI pipeline |

### Justification for major choices

**TypeScript full-stack (React + Node.js)**
The team had no prior web experience (background in C/C++). Using TypeScript on both sides meant learning one language instead of two. A shared `/shared/types/` folder lets both sides import the same interfaces, so API contract mismatches are caught at compile time rather than at runtime.

**Prisma over raw SQL or SQLAlchemy**
Prisma's `schema.prisma` file is the single source of truth for the database structure. Migrations are one command. The generated client is fully typed — Prisma prevents SQL injection by design and makes complex queries readable. For a team new to web development, this was significantly safer and faster than writing raw SQL.

**PostgreSQL over SQLite or MongoDB**
PostgreSQL handles relational data (users → articles → comments → likes, friendship pairs, notification foreign keys) better than a document store. It's the industry standard for production web applications and integrates natively with Prisma.

**Socket.IO over raw WebSockets**
Socket.IO adds automatic reconnection, room-based broadcasting, and a fallback to HTTP long-polling. The room abstraction (`io.to(userId).emit(...)`) made per-user message delivery and article-room broadcasting simple to implement correctly without custom infrastructure.

**Docker Compose**
Single `make start` command builds and starts the four Docker Compose services (postgres, backend, frontend, nginx) and generates the local HTTPS certificate. Health checks and service dependencies ensure the stack starts in the correct order. This provides reproducible behavior between developer machines and during evaluation.

---

## Database Schema

### Tables and relationships

```
users
├── id (UUID, PK)
├── email (unique)
├── username (unique)
├── passwordHash
├── displayName
├── avatarUrl
├── cvUrl, cvFilename
├── bio
├── role (USER | MODERATOR | ADMIN)
├── preferredLanguage
├── xp, level
├── isOnline, lastSeenAt
└── createdAt, updatedAt

oauth_accounts  [for OAuth provider linking]
├── id (UUID, PK)
├── provider
├── providerId
├── userId → users.id
├── emailAtLinkTime
└── UNIQUE(provider, providerId)

articles
├── id (UUID, PK)
├── authorId → users.id
├── title, content (Markdown)
├── category (enum)
├── likeCount (cached counter)
├── isRemoved, removedReason, removedAt
└── createdAt, updatedAt

comments
├── id (UUID, PK)
├── articleId → articles.id
├── authorId → users.id
├── content
├── isRemoved, removedReason, removedAt
└── createdAt, updatedAt

article_likes
├── id (UUID, PK)
├── userId → users.id
├── articleId → articles.id
└── UNIQUE(userId, articleId)

follows  [one-directional]
├── id (UUID, PK)
├── followerId → users.id
├── followingId → users.id
└── UNIQUE(followerId, followingId)

friendships  [mutual, with status]
├── id (UUID, PK)
├── requesterId → users.id
├── addresseeId → users.id
├── status (PENDING | ACCEPTED | DECLINED)
└── UNIQUE(requesterId, addresseeId)

messages
├── id (UUID, PK)
├── senderId → users.id
├── receiverId → users.id
├── content
├── isRead
└── createdAt

notifications
├── id (UUID, PK)
├── userId → users.id  [recipient]
├── type (enum: FOLLOWED, FRIEND_REQUEST, FRIEND_ACCEPTED, COMMENT, LIKE, CONTENT_REMOVED, MESSAGE, BADGE, LEVEL_UP, ARTICLE_CREATED)
├── message
├── refId  [optional: articleId or userId for navigation]
├── actorId  [optional: user ID of the actor who caused the event]
├── isRead
└── createdAt

badges
├── id (UUID, PK)
├── name (unique)
├── description
├── icon
└── xpReward

user_badges
├── id (UUID, PK)
├── userId → users.id
├── badgeId → badges.id
├── earnedAt
└── UNIQUE(userId, badgeId)

```

### Key relationships

- One user → many articles, comments, likes, notifications, badges, and OAuth accounts
- Users and badges have a many-to-many relationship through `user_badges`
- A notification belongs to a recipient through `userId`; `actorId` is an optional user ID and is not a database foreign-key relation
- Articles and comments use soft-delete (`isRemoved`) for moderation audit trail
- Deleting a user cascades to their articles, comments, likes, follows, friendships, messages, notifications, badges, OAuth accounts, and related records
- Friendships are one row per pair, direction-aware (requester ≠ addressee), with explicit status
- Follows are one-directional (Twitter model); friendships are mutual (Facebook model)
- `article_likes.likeCount` is a cached counter on the article row — updated in a DB transaction alongside the like row insert/delete for fast feed queries
- `oauth_accounts` allows a user to link multiple OAuth providers to one local account; each provider account can be linked only once

---

## Features List

### Auth and user management
*(Mariia Khudonohova)*

| Feature | Description |
|---|---|
| Register | Email + username + password, bcrypt hashed, full validation |
| Login | Email + password, JWT in HttpOnly cookie, CSRF protection |
| Logout | Clears cookies, disconnects WebSocket immediately (no grace period) |
| Session restore | `GET /api/auth/me` on app load restores session without re-login |
| OAuth login | GitHub, Google, 42 — with account linking for existing email users |
| Profile page | Avatar, bio, stats (articles, followers, following), badges, level |
| Avatar upload | JPG/PNG/WebP, max 2MB, UUID filename, old file deleted on replace |
| Edit profile | Display name, bio, preferred language |
| Account deletion | Cascade deletes all user content, removes avatar file, clears session |
| Privacy Policy | Static page with real content |
| Terms of Service | Static page with real content |

### Articles and feed
*(Tingting Yang)*

| Feature | Description |
|---|---|
| Create article | Title (max 120), Markdown content (min 100 non-whitespace chars), category |
| Edit article | Author-only, same validation as create |
| Delete article | Author hard-deletes, moderator/admin soft-removes with reason |
| Global feed | Paginated article list, newest by default |
| Article page | Full Markdown render with heading level shift, author info, like button |
| Comments | Create, edit, delete own — real-time via Socket.IO |
| Likes | Toggle like/unlike, optimistic UI, real-time count update |
| Advanced search | Filter by title, author, content, category, date range; sort by newest/oldest/most liked |
| Internationalization | English, Dutch, Ukrainian with account-level persistence |

### Social layer
*(Tanya Kremnova)*

| Feature | Description |
|---|---|
| Friend requests | Send, accept, decline, cancel — full state machine |
| Friends list | Accepted friends with online indicator (real-time via WebSocket) |
| Follow system | One-directional follow/unfollow, follower/following counts on profile |
| Real-time chat | 1-to-1 messages via Socket.IO, history persisted in DB |
| Notifications | Bell with unread count, dropdown, full notifications page with pagination |
| Notification types | Friend request, friend accepted, follow, comment, like, content removed, message, badge, level up, article published |
| Online status | WebSocket connect/disconnect with 30-second grace period, instant on logout |

### Gamification and admin
*(Lidiia Perekhrest)*

| Feature | Description |
|---|---|
| Badges | First Post, Consistent Writer, Prolific Author, First Like, Rising Voice, Popular Writer |
| XP system | Earned on article publish, like received, badge earned, etc. |
| Level system | Calculated from XP, shown on profile and leaderboard |
| Level-up toast | Real-time visual feedback when user levels up |
| Leaderboard | Global ranking by total likes received |
| Admin dashboard | Removed content audit, user list, role management |
| Moderator dashboard | Soft-remove articles and comments with reason |
| PWA | Installable, service worker, offline fallback page |
| Browser compatibility | Tested on Chrome, Edge, Safari |

---

# Modules

## Web

### Major — Frontend and backend frameworks (2pt) ⭐⭐

**Owner: All team members**

We use frameworks on both sides of the application:
- **Frontend:** React + TypeScript
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma

### Major — WebSockets (2pt) ⭐⭐

**Owner: tkremnov**

The application uses Socket.IO for real-time communication.
Implemented real-time functionality includes:
- real-time chat messages
- online/offline presence
- connection and disconnection handling
- broadcasting events to relevant users
- multiple simultaneous connections
- graceful handling of temporary disconnections
The backend maintains user socket connections and uses a 30-second grace period before marking a disconnected user as offline. This prevents short network interruptions or browser reconnects from immediately changing the user's status.

### Major — Allow users to interact with other users (2pt) ⭐⭐

**Owner: tkremnov, makhudon and lperekhr**

The application provides all three required interaction systems.

**Chat**
- open conversations with other users
- send messages
- receive messages in real time
- view conversation history

**Profiles**
- view their own profile
- view other users' profiles
- see profile information
- see avatar, bio, statistics and badges
- see online/offline status

**Friends**
- send friend requests
- accept friend requests
- decline friend requests
- cancel outgoing requests
- remove friends
- view their friends
- see friends' online status

### Minor — ORM (1pt) ⭐

**Owner: makhudon**

The application uses Prisma ORM (Object Relational Mapper) with PostgreSQL.  
Prisma provides:
- database schema
- migrations
- generated client
- typed database queries
- relations between entities

### Minor — Complete notification system (1pt) ⭐

**Owner: tkremnov**

The platform provides notification system covering the main social, content, messaging, moderation, and gamification events.  
Notifications use a combination of database persistence, Socket.IO real-time delivery, polling, and browser events. Critical high-frequency events such as messages, comments, likes, and new articles are delivered through Socket.IO, while other persisted notification types are synchronized through polling. This provides both real-time feedback and reliable persistence across page reloads and reconnections.

**Coverage**
| Notification event              | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Friend request created          | ✅        | friends.service.ts |
| Friend request accepted         | ✅        | friends.service.ts |
| Follow                          | ✅        | follows.service.ts |
| Unfollow                        | —         | No notification needed |
| Friend removed                  | —         | No notification needed |
| Article published               | ✅        | Followers receive ARTICLE_CREATED |
| Article liked                   | ✅        | Article author receives LIKE |
| Article commented               | ✅        | Article author receives COMMENT |
| Article removed by moderator    | ✅        | Author receives CONTENT_REMOVED |
| Comment removed by moderator    | ✅        | Comment author receives CONTENT_REMOVED |
| Private message                 | ✅        | Socket handler creates MESSAGE |
| Badge earned                    | ✅        | BADGE notification type |
| Level up                        | ✅        | Real-time visual event + notification message |

### Minor —  Progressive Web App (1pt) ⭐

**Owner: lperekhr**

The application is implemented as a Progressive Web App (PWA) with installability and offline fallback support.

The PWA provides:
- web app manifest with application metadata and icons
- standalone display mode
- service worker registration
- installability as a standalone application
- cached offline fallback page
- offline navigation fallback when the network is unavailable

### Demonstration

**Installability**

The application can be installed from Chrome using the browser's PWA install control. After installation, the application can be opened as a standalone app without the normal browser navigation interface.

**Offline support**

The service worker caches the offline fallback page. When the network connection is disabled, navigation requests are handled by the service worker and the application displays the cached offline page:

> You are offline  
> Please reconnect to the internet and try again.

Server-dependent functionality, including API requests and real-time communication, requires an active network connection.

### Minor — Custom-made design system (1pt) ⭐

**Owner: All team members**

We developed a reusable React-based design system with shared components, typography, colors, interactive states and iconography.  
Project has a custom visual identity including:
- custom color palette
- typography
- icons
- reusable React components
- reusable user/profile components
- buttons and UI controls
- notification UI
- navigation components
- dropdowns
- cards
- badges
- level/XP UI

### Minor — Advanced search with filters, sorting and pagination (1pt) ⭐

**Owner: tiyang**

The platform provides a dedicated advanced article search with server-side filtering, sorting, and pagination.  

#### Search and filters

- Title
- Author
- Content
- Category
- Publication date range

#### Sorting

- Newest
- Oldest
- Most liked

### Minor — File upload and management (1pt) ⭐

**Owner: makhudon**

| Requirement                     | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Multiple file types             | ✅        | Avatar: JPG/PNG/WebP; CV: TXT/PDF/DOC/DOCX |
| Client-side validation          | ✅        | `EditProfile.tsx` checks MIME type and file size before upload |
| Server-side validation          | ✅        | Multer size limits + `validateAvatarMimetype()` / `validateCvMimetype()` |
| Authentication / upload/delete authorization          | ✅        | Upload/delete routes use `authMiddleware` and operate on `req.user.userId` |
| Secure filenames/storage        | ✅        | UUID filenames, controlled upload directory, allowed extensions derived from MIME |
| Preview                         | ✅        | Avatar uses `URL.createObjectURL()` and displays the selected image |
| Delete                          | ✅        | Both avatar and CV have DELETE endpoints and remove the physical file |
| Upload progress                 | ✅        | Implemented loading state `isUploadingAvatar` / `isUploadingCv` |
| Protected file access           | ✅        | Profile and auth responses return protected URLs |

## Accessibility and Internationalization

### Minor — Multiple languages (1pt) ⭐

**Owner: tiyang**

The application supports three languages:
- English
- Nederlands
- Українська
The language switcher allows the user to change the application language.

### Minor — Support for additional browsers (1pt) ⭐

**Owner: makhudon and lperekhr**

The application was tested for browser compatibility across multiple browsers:

| Browser | Platform | Result |
|---|---|---|
| Chrome | Ubuntu | ✅ Passed |
| Microsoft Edge | Ubuntu | ✅ Passed |
| Safari | macOS | ✅ Passed |

## User Management

### Major — User management and authentication (2pt) ⭐⭐

**Owner: makhudon**

The application provides:
- user registration
- user login
- authentication
- logout
- profile editing
- avatar upload
- default avatar handling
- friend management
- online/offline status
- public user profiles

### Major — Advanced permissions system (2pt) ⭐⭐

**Owner: lperekhr**

The application implements three hierarchical roles: USER, MODERATOR and ADMIN. Authentication and role-based authorization are enforced server-side through dedicated middleware. Permissions are applied to protected API routes according to role level. Moderators and administrators can moderate articles and comments, while only administrators can manage users and assign roles. The frontend also adapts the available administration interface to the authenticated user's role.  

| Requirement                     | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Multiple roles                  | ✅        | USER, MODERATOR, ADMIN |
| Authentication before protected actions | ✅        | authMiddleware |
| Role-based authorization        | ✅        | `requireRole(...)` |
| Different permissions per role  | ✅        | Admin and moderator routes differ |
| Admin user/role management      | ✅        | Admin can manage users and roles |
| Moderator content moderation    | ✅        | Moderator can remove/restore articles/comments |
| Backend enforcement             | ✅        | Permissions are checked server-side, not only in React |
| Frontend role-aware UI          | ✅        | Dashboard and Users tab depend on role |
| Protection against normal users calling admin APIs | ✅        | `requireRole` should reject them |
| Protection against moderator accessing admin-only APIs | ✅        | Admin user-management routes require `ADMIN` |
| An administrator cannot demote and delete another administrator | ✅        | `if (targetUser.role === 'ADMIN' && role !== 'ADMIN')` |
| An admin cannot delete their own account | ✅        | `if (req.user?.userId === id)` |

### Minor — Remote authentication (1pt) ⭐

**Owner: makhudon**

The application implements remote authentication using OAuth 2.0 with the following providers:

- Google
- GitHub
- 42

### Minor — Gamification system (1pt) ⭐

**Owner: lperekhr**

The application includes three gamification mechanisms:  

**1. Badges** — Users can earn and display badges.  
**2. Leaderboard** — Users can compare their progress and ranking.  
**3. XP / Level system** — Users earn XP and progress through levels, with a `LevelUpToast` providing immediate feedback on level-up.

---

## Individual Contributions

### Mariia Khudonohova (makhudon)

**Features built:** Auth system, OAuth 2.0, user profiles, avatar upload, account deletion, Docker setup, nginx HTTPS, CI pipeline, shared type system, Privacy Policy and Terms of Service.

**Specific contributions:**
- Designed and implemented the JWT + CSRF cookie auth pattern used across the entire project
- Built the OAuth 2.0 flow with state validation, account linking, and all three providers
- Set up the Docker Compose orchestration including nginx with HTTPS and mkcert integration
- Created the GitHub Actions CI workflow covering typecheck, lint, and integration tests
- Established the `/shared/types/` contract between frontend and backend
- Built the avatar upload pipeline with MIME validation, UUID naming, and old-file cleanup

**Challenges faced:** OAuth account linking edge cases — when a user registers with email X, then tries to OAuth with a provider that has email X, we needed to detect and link rather than create a duplicate. Solved by checking verified provider email against existing accounts in `resolveOAuthUser()`.

---

### Tingting Yang (tiyang)

**Features built:** Articles (create, edit, delete), global feed, advanced search, comments, likes.

**Specific contributions:**
- Implemented the full article lifecycle including Markdown rendering with heading level shift
- Built the global feed with pagination, category filters, and sort options
- Implemented real-time comment and like updates using Socket.IO article rooms
- Built the advanced search with multiple concurrent filters, all validated server-side
- Implemented the optimistic UI for likes with revert-on-error
- Added i18n for three languages with account-level persistence and backend error code translation

**Challenges faced:** [FILL IN — e.g. "Real-time comment deduplication — when the socket event and HTTP response both arrive, the comment appeared twice. Fixed with a commentIdsRef set that tracks which comment IDs are already in state."]

---

### Tanya Kremnova (tkremnov)

**Features built:** Friends system, follow system, real-time chat, notifications, online status, internationalization.

**Specific contributions:**
- Implemented the full friends state machine (PENDING → ACCEPTED/DECLINED) with race condition handling
- Built the WebSocket-based chat with message history, read receipts, and auto-scroll
- Designed and built the notification system covering all event types with real-time delivery
- Implemented online status with 30-second grace period and instant logout via `forceOffline()`
- Wrote the shell-based integration test scripts for friends and notifications APIs

**Challenges faced:** The FriendButton race condition — User A cancels a request at the same moment User B accepts it. The 404 from the cancel endpoint was being displayed as an error instead of transitioning to "friends" state. Fixed by calling `getFriendshipStatus()` on any 404 from cancel to determine the actual state rather than guessing.

---

### Lidiia Perekhrest (lperekhr)

**Features built:** Badge system, XP/level system, leaderboard, admin and moderator dashboard, PWA, browser compatibility.

**Specific contributions:**
- Implemented the gamification engine including XP award triggers, level calculation, and badge condition checks
- Built the admin dashboard with removed content audit, user management, and role assignment
- Implemented moderator soft-remove with reason, visible to staff in the comment/article view
- Set up the PWA manifest, service worker, and offline fallback
- Tested and fixed browser compatibility across Chrome, Edge, and Safari

**Challenges faced:** [FILL IN — e.g. "The badge award system needed to be idempotent — awarding the same badge twice should silently skip rather than error. Used Prisma's `skipDuplicates: true` on the `userBadge.createMany()` call combined with the `@@unique([userId, badgeId])` constraint on the table."]

---

## Known Limitations

- Local HTTPS uses a self-signed certificate. Browsers will show a security warning until you trust the mkcert CA certificate in your OS or browser certificate store.
- OAuth depends on exact callback URL matching in each provider's developer console. Wrong URLs produce `oauth_redirect_uri_mismatch` errors.
- Chat currently supports 1-to-1 messages only. Group chat is not implemented.
- The notifications polling interval is 30 seconds as a fallback for missed socket events. Most notifications arrive instantly via WebSocket push.
- Dutch translations were produced by the development team without a native-speaker review pass. Content is complete and consistent across all three languages.
- Firefox was not available in the test environment and was not part of the verified browser matrix.

---

## Service Map (Docker)

| Service     | Internal Port | Host Port (default) |
|-------------|--------------:|--------------------:|
| postgres    | 5432          | not exposed         |
| backend     | 3000          | not exposed         |
| frontend    | 5173          | 5173                |
| nginx http  | 80            | 8080                |
| nginx https | 443           | 8443                |
