# TPChat - Zero-Trust Encrypted Messaging Platform

[![Security Audit](https://github.com/MrTelepathic/tpchat/actions/workflows/deploy.yml/badge.svg)](https://github.com/MrTelepathic/tpchat/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TPChat is a **100% client-side, zero-trust encrypted messaging application** that mimics the Telegram Web interface while providing military-grade end-to-end encryption. No servers, no databases, no data collection—just pure privacy.

![TPChat Screenshot](https://via.placeholder.com/800x400/212121/8774e1?text=TPChat+Zero-Trust+Messaging)

## 🚀 Features

- **End-to-End Encryption**: ECDH key exchange + AES-256-GCM per-message encryption
- **Zero Server Architecture**: 100% client-side, deploys to GitHub Pages
- **No Data Collection**: No analytics, no telemetry, no cookies, no tracking
- **Telegram-like UI**: Familiar interface with dark/light themes
- **Voice & Video Messages**: Record and send encrypted media
- **Anti-Replay Protection**: Prevents message duplication attacks
- **Session Encryption**: PBKDF2 with 310,000+ iterations
- **Integrity Verification**: Runtime bundle hash validation
- **Cyber Lab**: Built-in security audit panel

## 🔐 Cryptographic Model

### Key Exchange
- **Algorithm**: ECDH (Elliptic Curve Diffie-Hellman)
- **Curve**: P-256 (NIST approved)
- **Purpose**: Secure key agreement between parties

### Message Encryption
- **Algorithm**: AES-256-GCM
- **IV Length**: 96 bits (unique per message)
- **Auth Tag**: 128 bits
- **Key Derivation**: HKDF-SHA256

### Session Security
- **Password Hashing**: PBKDF2-SHA256
- **Iterations**: 310,000+ (OWASP recommended)
- **Salt**: Username + cryptographically secure random
- **Storage**: Encrypted in sessionStorage, keys only in RAM

### Anti-Replay Protection
- **Message ID**: UUID v4
- **Nonce**: 128-bit cryptographically secure random
- **Timestamp**: Millisecond precision with validity window
- **Cache**: In-memory with 24-hour expiration

## 📁 Project Structure

```
tpchat/
├── src/
│   ├── components/          # React components
│   │   ├── chat/           # Chat UI components
│   │   ├── Login.tsx       # Authentication
│   │   └── About.tsx       # About page
│   ├── crypto/             # Cryptographic primitives
│   │   ├── ecdh.ts         # ECDH key exchange
│   │   ├── aes.ts          # AES-256-GCM encryption
│   │   └── pbkdf2.ts       # Password-based key derivation
│   ├── session/            # Session management
│   │   └── sessionManager.ts
│   ├── antiReplay/         # Replay attack protection
│   │   └── antiReplayCache.ts
│   ├── integrity/          # Bundle integrity verification
│   │   └── integrityChecker.ts
│   ├── securityAudit/      # Cyber Lab panel
│   │   └── CyberLab.tsx
│   ├── theme/              # Dark/light theme system
│   │   └── themeProvider.tsx
│   ├── hooks/              # React hooks
│   │   └── useChat.ts
│   ├── types/              # TypeScript types
│   │   ├── crypto.ts
│   │   └── chat.ts
│   ├── tests/              # Unit tests
│   │   ├── crypto.test.ts
│   │   └── setup.ts
│   ├── App.tsx             # Main application
│   └── main.tsx            # Entry point
├── .github/workflows/       # CI/CD pipeline
│   └── deploy.yml
├── public/                  # Static assets
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MrTelepathic/tpchat.git
   cd tpchat
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Fork & Deploy to GitHub Pages

1. **Fork this repository**
   - Click the "Fork" button on GitHub

2. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: GitHub Actions

3. **Push to main branch**
   - The CI/CD pipeline will automatically:
     - Run security audit
     - Type-check the code
     - Run crypto unit tests
     - Build the application
     - Generate bundle hash
     - Deploy to GitHub Pages

4. **Access your deployment**
   - Your site will be available at `https://yourusername.github.io/tpchat`

### Manual Deployment

```bash
# Build the application
npm run build

# The dist/ folder contains the deployable files
# Upload these to any static hosting service
```

## 🔒 Integrity Verification

TPChat includes runtime integrity verification to detect tampering:

1. **Build-time**: SHA-256 hash of the bundle is generated
2. **Runtime**: Hash is recomputed and compared
3. **On mismatch**: Session is destroyed and app is locked

### Verifying Your Deployment

1. Open the browser console
2. Navigate to Cyber Lab → Run Tests
3. Check "Integrity Verification" result

## 🧪 Security Audit (Cyber Lab)

TPChat includes a built-in security audit panel:

1. Click the menu (☰) in the top-left
2. Select "Cyber Lab"
3. Click "Run All Tests"

**Tests include:**
- Cryptographic primitive validation
- Replay attack simulation
- Session encryption verification
- Bundle integrity check
- CSP configuration audit

**Export Report**: Download JSON security report for documentation

## 📱 Usage

### Creating an Account

1. Enter a username (required)
2. Enter email (optional)
3. Create a strong password
4. Click "Create Account"

**⚠️ Important**: Your password is used to encrypt your session. If you forget it, your data cannot be recovered.

### Sending Messages

1. Select a chat from the sidebar
2. Type your message in the input field
3. Press Enter or click the send button

### Recording Voice/Video

1. Open a chat
2. Click the microphone (🎤) or video (🎥) button
3. Record your message
4. Click the stop button to send

### Switching Themes

1. Click the menu (☰)
2. Select Light, Dark, or Auto

## 🔐 Threat Model

### Assets Protected

| Asset | Protection |
|-------|------------|
| Messages | AES-256-GCM encryption |
| Session Keys | RAM-only, never persisted |
| Password | PBKDF2 310k iterations |
| Private Keys | Encrypted with session key |

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| Eavesdropping | End-to-end encryption |
| Replay attacks | Unique nonce + timestamp validation |
| Session hijacking | Keys only in RAM, encrypted storage |
| Code tampering | Runtime integrity verification |
| XSS | Strict CSP, no inline scripts |
| Data exfiltration | No network requests, no telemetry |

### Limitations

- **No message persistence**: Messages are lost on logout
- **Single device**: No cross-device synchronization
- **No backup**: Encrypted data cannot be recovered without password
- **Browser dependent**: Security relies on browser's Web Crypto API

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Security Contributions

For security-related issues, please:
1. **DO NOT** open a public issue
2. Email security concerns to: security@tpchat.dev
3. Allow 48 hours for response before public disclosure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Web Crypto API**: Modern browser cryptography
- **Telegram**: UI/UX inspiration
- **OWASP**: Security best practices
- **Signal Protocol**: Cryptographic design patterns

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and community support
- **Email**: support@tpchat.dev

## 🔗 Links

- [Live Demo](https://MrTelepathic.github.io/tpchat)
- [Documentation](https://github.com/MrTelepathic/tpchat/wiki)
- [Security Model](SECURITY_MODEL.md)
- [Future Updates](README_FUTURE_UPDATES.md)

---

**Made with 🔒 by MrTelepathic**

*Zero-Trust. Zero-Compromise. Zero-Data.*
