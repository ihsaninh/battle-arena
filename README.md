# 🎮 Battle Arena

Real-time multiplayer quiz battle arena where players can challenge each other in knowledge competitions.

## ✨ Features

- **Real-time Multiplayer**: WebSocket-based battle system with live updates
- **Game Modes**: Multiple choice and open-ended questions
- **AI-Powered**: Dynamic question generation using Google AI
- **Progressive Web App**: Installable with offline support
- **Responsive Design**: Mobile-first with stunning animations
- **Session Management**: Secure player authentication & sessions
- **Live Leaderboards**: Real-time scoring and rankings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Supabase account (for database & real-time)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd battle-arena
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Set up database**

   ```bash
   # Run migration scripts in order
   bunx supabase db push scripts/0001_battle.sql
   bunx supabase db push scripts/0002_battle_rls.sql
   # ... continue with all scripts
   ```

5. **Start development server**

   ```bash
   bun run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 🛠️ Development

### Available Scripts

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `bun run dev`          | Start development server with Turbopack |
| `bun run build`        | Build for production with Turbopack     |
| `bun run start`        | Start production server                 |
| `bun run lint`         | Run ESLint code linting                 |
| `bun run format`       | Format code with Prettier               |
| `bun run format:check` | Check code formatting                   |
| `bun run test`         | Run test suite                          |
| `bun run audit`        | Run security vulnerability scan         |

### Code Quality

The project enforces code quality through:

- **Pre-commit hooks**: Automatic linting and formatting checks
- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Consistent code formatting
- **Commitlint**: Conventional commit message validation
- **TypeScript**: Type safety throughout the application

### Project Structure

```
battle-arena/
├── app/                     # Next.js app directory
│   ├── api/                # API routes (/api/battle/*)
│   ├── (pages)/            # Page components
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── src/                    # Source code
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities & business logic
│   └── types/              # TypeScript definitions
├── public/                 # Static assets
│   ├── manifest.json       # PWA manifest
│   └── sw.js              # Service worker
├── scripts/                # Database migration scripts
└── docs/                   # Additional documentation
```

## 🔧 Configuration

### Environment Variables

```env
# Google AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
GOOGLE_AI_API_KEY=your_google_ai_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Battle Configuration
BATTLE_AUTO_REVEAL_NEXT=1
BATTLE_USE_AI=1
BATTLE_AUTO_ADVANCE=true
```

### Battle Features

- **Question Types**: Multiple choice, open-ended
- **Difficulty Levels**: Easy, Medium, Hard
- **Languages**: Multi-language support (template)
- **Time Limits**: Configurable round times
- **Room Capacity**: 2-100 players per room

## 🔒 Security

- **Input Validation**: Zod schemas for all API endpoints
- **Rate Limiting**: Multiple rate limiters for different endpoints
- **Session Management**: Secure HTTP-only cookies
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- **Dependency Scanning**: Automated vulnerability checks
- **Environment Protection**: Secure handling of sensitive data

## 🌐 PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Service worker for offline functionality
- **Responsive Design**: Optimized for all screen sizes
- **App-like Experience**: Standalone mode with custom icons

## 📦 Technology Stack

- **Framework**: Next.js 15.5.6 with App Router
- **Runtime**: Bun for blazing fast development
- **Database**: Supabase (PostgreSQL + Real-time)
- **Styling**: Tailwind CSS with Outfit font
- **Animations**: Framer Motion
- **State Management**: Zustand + React Query
- **Type Safety**: TypeScript throughout
- **Forms**: React Hook Form with Zod validation
- **AI Integration**: Google Generative AI

## 🚀 Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

### Docker

```bash
docker build -t battle-arena .
docker run -p 3000:3000 battle-arena
```

### Manual Deployment

```bash
bun run build
bun run start
```

## 📚 API Documentation

### Core Endpoints

- `POST /api/battle/sessions` - Create player session
- `POST /api/battle/rooms` - Create new battle room
- `POST /api/battle/rooms/[id]/join` - Join existing room
- `GET /api/battle/rooms/[id]/state` - Get room state
- `POST /api/battle/rooms/[id]/start` - Start battle
- `POST /api/battle/rooms/[id]/rounds/[round]/answer` - Submit answer
- `GET /api/battle/rooms/[id]/scoreboard` - Get leaderboard

### Real-time Events

WebSocket events for:

- Player presence
- Battle state updates
- Score updates
- Round transitions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m "feat: add amazing feature"`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Commit Convention

Follow conventional commits:

- `feat:` - new features
- `fix:` - bug fixes
- `docs:` - documentation
- `style:` - code style
- `refactor:` - code refactoring
- `test:` - tests
- `chore:` - maintenance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Google AI](https://ai.google.dev/) - AI capabilities

---

**Built with ❤️ by Ihsan Nurul Habib**
