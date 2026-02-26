# TPChat Security Model

## Executive Summary

TPChat implements a **Zero-Trust Architecture** for end-to-end encrypted messaging. This document details the cryptographic design, threat model, and security guarantees provided by the platform.

**Version**: 1.0.0  
**Last Updated**: 2024  
**Classification**: Public

---

## 1. Cryptographic Architecture

### 1.1 Key Hierarchy

```
User Password
    ↓ (PBKDF2, 310k iterations)
Session Master Key
    ├─→ Encryption Key (AES-256-GCM)
    └─→ HMAC Key (SHA-256)

ECDH Key Pair (per session)
    ├─→ Public Key (shared)
    └─→ Private Key (encrypted with Session Master Key)

Per-Message Keys
    └─→ Derived via ECDH + HKDF
```

### 1.2 Algorithms & Parameters

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| Key Exchange | ECDH | P-256 curve |
| Message Encryption | AES-GCM | 256-bit key, 96-bit IV, 128-bit tag |
| Key Derivation | HKDF | SHA-256, empty salt |
| Password Hashing | PBKDF2 | SHA-256, 310,000 iterations |
| Integrity | SHA-256 | - |
| Random Generation | CSPRNG | Browser's crypto.getRandomValues |

### 1.3 Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sender    │────→│  ECDH +     │────→│  Encrypted  │
│   Device    │     │  AES-GCM    │     │  Message    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Recipient  │←────│  ECDH +     │←────│  Transport  │
│   Device    │     │  AES-GCM    │     │  (any)      │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 2. Session Security

### 2.1 Session Initialization

1. User provides username + password
2. Salt = SHA-256(username + random_entropy)
3. Session keys derived via PBKDF2(password, salt, 310000)
4. ECDH key pair generated
5. Private key encrypted with session encryption key
6. Encrypted session stored in sessionStorage

### 2.2 Session Lifecycle

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       ↓
┌─────────────┐
│  Key Derive │←── Password + Salt
└──────┬──────┘
       ↓
┌─────────────┐
│  Decrypt    │←── sessionStorage
│  Session    │
└──────┬──────┘
       ↓
┌─────────────┐     ┌─────────────┐
│   Active    │←──→│   Inactivity │
│   Session   │     │   Timeout   │
└──────┬──────┘     └─────────────┘
       ↓
┌─────────────┐     ┌─────────────┐
│   Logout    │←──→│  Tab Close  │
│  (destroy)  │     │  / Refresh  │
└─────────────┘     └─────────────┘
```

### 2.3 Session Destruction Triggers

| Trigger | Action | Data Cleared |
|---------|--------|--------------|
| Logout | Immediate | sessionStorage + RAM keys |
| Tab Close | Immediate | RAM keys (sessionStorage persists encrypted) |
| Refresh | Immediate | RAM keys (sessionStorage persists encrypted) |
| Inactivity (30min) | Automatic | Full session destruction |
| DevTools Detection | Optional | Full session destruction |

---

## 3. Message Security

### 3.1 Message Structure

```typescript
interface EncryptedMessage {
  ciphertext: ArrayBuffer;    // AES-GCM encrypted payload
  iv: ArrayBuffer;            // 96-bit unique IV
  tag: ArrayBuffer;           // 128-bit auth tag
  encryptedKey: ArrayBuffer;  // Encrypted session key
}

interface MessagePayload {
  messageId: string;          // UUID v4
  timestamp: number;          // Unix ms
  nonce: string;              // 128-bit hex
  content: string;            // Message content
  sender: string;             // Sender ID
  type: MessageType;          // text/voice/video/file
}
```

### 3.2 Encryption Process

1. Generate message payload with UUID, timestamp, nonce
2. Generate ephemeral ECDH key pair
3. Derive shared secret with recipient's public key
4. Derive AES key via HKDF
5. Encrypt payload with AES-256-GCM
6. Serialize and transmit

### 3.3 Decryption Process

1. Deserialize encrypted message
2. Decrypt ephemeral private key with session key
3. Derive shared secret with sender's public key
4. Derive AES key via HKDF
5. Decrypt and verify payload
6. Validate anti-replay parameters

---

## 4. Anti-Replay Protection

### 4.1 Mechanism

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| Message ID uniqueness | Prevent duplicate messages | Reject message |
| Nonce uniqueness | Ensure message freshness | Reject message |
| Timestamp validity | Prevent old message replay | Reject message |
| Future timestamp | Prevent clock manipulation | Reject message |

### 4.2 Cache Implementation

- **Storage**: In-memory Map (never persisted)
- **Max Size**: 10,000 entries
- **Expiration**: 24 hours
- **Eviction**: LRU when full

### 4.3 Timestamp Validation

```
Current Time: T
Message Time: M

Accept if:
  M > T - 24 hours (not too old)
  M < T + 5 minutes (not in future)
```

---

## 5. Integrity Protection

### 5.1 Build-Time Integrity

1. Build application bundle
2. Compute SHA-256 hash of all JS/CSS files
3. Inject hash into HTML meta tag
4. Deploy to hosting

### 5.2 Runtime Verification

1. On app load, fetch all script files
2. Recompute SHA-256 hash
3. Compare with expected hash
4. On mismatch: destroy session, lock app

### 5.3 CSP Implementation

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
media-src 'self' blob:;
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

---

## 6. Threat Model

### 6.1 Assets

| Asset | Value | Protection Level |
|-------|-------|------------------|
| Message Content | Critical | AES-256-GCM |
| Private Keys | Critical | RAM-only + encrypted backup |
| Session Keys | Critical | RAM-only |
| User Password | High | PBKDF2 310k iterations |
| Metadata | Medium | None (by design) |

### 6.2 Threat Actors

| Actor | Capability | Motivation |
|-------|------------|------------|
| Passive Eavesdropper | Network access | Read messages |
| Active Attacker | MITM capability | Modify/inject messages |
| Malicious Server | Hosting compromise | Serve malicious code |
| Local Attacker | Device access | Extract keys/data |
| State Actor | All capabilities | Mass surveillance |

### 6.3 Attack Scenarios

#### Scenario 1: Network Eavesdropping

**Attack**: Attacker monitors network traffic  
**Impact**: Messages are encrypted, content protected  
**Mitigation**: ECDH + AES-256-GCM ensures confidentiality

#### Scenario 2: Message Replay

**Attack**: Attacker resends captured message  
**Impact**: Duplicate message delivery  
**Mitigation**: Anti-replay cache rejects duplicates

#### Scenario 3: Code Injection

**Attack**: Attacker modifies deployed code  
**Impact**: Key exfiltration, message theft  
**Mitigation**: Runtime integrity check destroys session

#### Scenario 4: Session Hijacking

**Attack**: Attacker steals session from memory  
**Impact**: Access to decrypted messages  
**Mitigation**: Keys only in RAM, short session lifetime

#### Scenario 5: Password Cracking

**Attack**: Attacker obtains encrypted session  
**Impact**: Offline password cracking  
**Mitigation**: PBKDF2 310k iterations slows attacks

### 6.4 Limitations

| Limitation | Risk | Mitigation |
|------------|------|------------|
| No persistence | Data loss on logout | User education |
| Single device | No sync | By design (security) |
| Browser trust | Key exposure | Use trusted browsers |
| Metadata leakage | Traffic analysis | Tor/VPN recommended |

---

## 7. Security Guarantees

### 7.1 Confidentiality

✅ **Guaranteed**: Message content cannot be read by third parties  
✅ **Guaranteed**: Session keys never leave RAM  
✅ **Guaranteed**: Password-derived keys use sufficient iterations

### 7.2 Integrity

✅ **Guaranteed**: Messages cannot be modified in transit  
✅ **Guaranteed**: Code cannot be tampered without detection  
⚠️ **Best-effort**: Metadata (timestamps, sizes) may leak

### 7.3 Availability

⚠️ **Best-effort**: No DDoS protection (static hosting)  
✅ **Guaranteed**: No single point of failure  
✅ **Guaranteed**: No server to compromise

### 7.4 Forward Secrecy

✅ **Guaranteed**: Per-message ephemeral keys  
⚠️ **Limited**: Session compromise reveals current session only

---

## 8. Compliance & Standards

### 8.1 Cryptographic Standards

| Standard | Compliance |
|----------|------------|
| NIST SP 800-56A | ECDH key exchange |
| NIST SP 800-38D | AES-GCM mode |
| RFC 5869 | HKDF key derivation |
| PKCS#5 v2.1 | PBKDF2 implementation |
| FIPS 197 | AES algorithm |

### 8.2 Security Best Practices

- ✅ OWASP Cryptographic Storage Cheat Sheet
- ✅ OWASP Session Management Cheat Sheet
- ✅ Mozilla Web Security Guidelines
- ✅ W3C Web Crypto API Specification

---

## 9. Audit & Verification

### 9.1 Automated Testing

| Test | Frequency | Tool |
|------|-----------|------|
| Crypto unit tests | Every commit | Vitest |
| Type checking | Every commit | TypeScript |
| npm audit | Every commit | npm |
| Bundle integrity | Every build | Custom |

### 9.2 Manual Review

| Component | Reviewer | Frequency |
|-----------|----------|-----------|
| Crypto implementation | Security engineer | Quarterly |
| Dependency updates | Security engineer | Monthly |
| CSP configuration | Security engineer | Quarterly |

### 9.3 Penetration Testing

| Scope | Method | Frequency |
|-------|--------|-----------|
| Application | Automated scanner | Monthly |
| Cryptography | Manual review | Quarterly |
| Infrastructure | Third-party audit | Annually |

---

## 10. Incident Response

### 10.1 Security Incident Classification

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Key extraction, mass compromise | 1 hour |
| High | Individual account compromise | 4 hours |
| Medium | Potential vulnerability | 24 hours |
| Low | Documentation issue | 7 days |

### 10.2 Contact

- **Security Email**: security@tpchat.dev
- **PGP Key**: [Download](https://tpchat.dev/security.asc)
- **Response Time**: 48 hours for initial response

---

## 11. References

1. [NIST SP 800-57 - Recommendation for Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
2. [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
3. [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
4. [Signal Protocol Documentation](https://signal.org/docs/)
5. [RFC 7748 - Elliptic Curves for Security](https://tools.ietf.org/html/rfc7748)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024 | MrTelepathic | Initial release |

**Classification**: Public  
**Distribution**: Unlimited
