# TPChat Future Updates Roadmap

This document outlines planned updates, migration paths, and enhancement strategies for TPChat.

## Version Roadmap

### v1.0 (Current) - Stable Release
**Status**: ✅ Released  
**Focus**: Core encryption, basic messaging

- ✅ ECDH + AES-256-GCM encryption
- ✅ PBKDF2 session keys
- ✅ Anti-replay protection
- ✅ Integrity verification
- ✅ Telegram-like UI
- ✅ Voice/video recording

### v1.1 - Enhanced Security
**ETA**: Q1 2025  
**Focus**: Security hardening

- [ ] Argon2id password hashing (replace PBKDF2)
- [ ] Hardware security key support (WebAuthn)
- [ ] Biometric authentication
- [ ] Secure message deletion (burn after reading)
- [ ] Screenshot detection

### v1.2 - Multi-Device Support
**ETA**: Q2 2025  
**Focus**: Cross-device synchronization

- [ ] QR code device pairing
- [ ] Encrypted backup/restore
- [ ] Session synchronization
- [ ] Device management
- [ ] Remote logout

### v2.0 - P2P Networking
**ETA**: Q3 2025  
**Focus**: Decentralized communication

- [ ] WebRTC data channels
- [ ] STUN/TURN server configuration
- [ ] Direct peer-to-peer messaging
- [ ] Group chat (mesh topology)
- [ ] File transfer (end-to-end encrypted)

### v3.0 - Advanced Features
**ETA**: Q4 2025  
**Focus**: Feature parity with mainstream apps

- [ ] End-to-end encrypted group calls
- [ ] Screen sharing
- [ ] Message reactions
- [ ] Reply threads
- [ ] Message search (encrypted index)
- [ ] Custom themes

### v4.0 - Post-Quantum Cryptography
**ETA**: 2026  
**Focus**: Quantum-resistant algorithms

- [ ] ML-KEM (Kyber) key encapsulation
- [ ] ML-DSA (Dilithium) signatures
- [ ] Hybrid classical/PQC mode
- [ ] Algorithm agility framework
- [ ] NIST compliance

### v5.0 - Federated Architecture
**ETA**: 2027  
**Focus**: Decentralized identity

- [ ] Decentralized identifiers (DID)
- [ ] Verifiable credentials
- [ ] Cross-platform messaging
- [ ] Blockchain-anchored identity (optional)
- [ ] Open protocol specification

---

## Cryptographic Parameter Rotation

### When to Rotate

| Parameter | Rotation Trigger | Procedure |
|-----------|------------------|-----------|
| PBKDF2 iterations | OWASP update | Re-derive on next login |
| ECDH curve | NIST guidance | Generate new key pair |
| AES key size | Quantum threat | Migrate to 256-bit (already default) |
| HKDF info string | Protocol version | Update with v2.0 |

### Rotation Procedure

1. ** announce deprecation** (30 days advance notice)
2. **Dual support** (accept old and new parameters)
3. **Automatic migration** (on user login)
4. **Remove old support** (after 90 days)

### Example: PBKDF2 Iterations Update

```typescript
// Current (v1.0)
const PBKDF2_ITERATIONS = 310000;

// Update to (v1.1)
const PBKDF2_ITERATIONS = 600000; // OWASP 2025 recommendation

// Migration code
async function migrateSession(oldSession: EncryptedSession): Promise<void> {
  if (oldSession.iterations < PBKDF2_ITERATIONS) {
    // Re-derive with new iterations
    const newKey = await deriveKeyFromPassword(
      password,
      salt,
      PBKDF2_ITERATIONS
    );
    // Re-encrypt session
    await encryptAndStoreSession(sessionData, newKey, salt);
  }
}
```

---

## Dependency Upgrade Strategy

### Security-Critical Dependencies

| Package | Purpose | Update Frequency |
|---------|---------|------------------|
| react | UI framework | Monthly (security patches) |
| typescript | Type safety | Monthly |
| vite | Build tool | Monthly |
| tailwindcss | Styling | Quarterly |
| @radix-ui/* | UI components | Monthly |

### Upgrade Procedure

1. **Review changelog** for security fixes
2. **Test in staging** environment
3. **Run full test suite**
4. **Deploy with monitoring**
5. **Rollback plan** ready

### Automated Updates

```yaml
# .github/workflows/dependency-update.yml
name: Dependency Update
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm update
      - run: npm audit
      - run: npm test
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
```

---

## WebRTC P2P Implementation Guide

### Architecture

```
┌─────────────┐         ┌─────────────┐
│   Peer A    │←───────→│   Peer B    │
│  (Initiator)│  WebRTC │  (Responder)│
└──────┬──────┘         └──────┬──────┘
       │                       │
       ↓                       ↓
┌─────────────┐         ┌─────────────┐
│   Signaling │         │   Signaling │
│   Server    │         │   Server    │
│  (optional) │         │  (optional) │
└─────────────┘         └─────────────┘
```

### Implementation Steps

1. **Add WebRTC adapter**
   ```bash
   npm install webrtc-adapter
   ```

2. **Create peer connection**
   ```typescript
   const pc = new RTCPeerConnection({
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       // Add TURN server for NAT traversal
     ],
   });
   ```

3. **Establish data channel**
   ```typescript
   const channel = pc.createDataChannel('messages', {
     ordered: true,
     maxRetransmits: 3,
   });
   ```

4. **Exchange signaling data** (via QR code or manual)
   ```typescript
   // Offer/answer exchange
   const offer = await pc.createOffer();
   await pc.setLocalDescription(offer);
   // Share offer with peer...
   ```

5. **Encrypt WebRTC traffic**
   ```typescript
   // Encrypt before sending
   channel.onopen = () => {
     const encrypted = await encryptMessage(aesKey, payload);
     channel.send(JSON.stringify(encrypted));
   };
   ```

### Security Considerations

- ✅ Encrypt all data channel messages
- ✅ Verify peer identity via fingerprint
- ✅ Use TURN servers for relay (if direct fails)
- ⚠️ Signaling server can see metadata (use ephemeral)

---

## Post-Quantum Cryptography Migration

### Timeline

| Phase | Date | Action |
|-------|------|--------|
| Research | 2024-2025 | Monitor NIST standards |
| Preparation | 2025 | Implement algorithm agility |
| Hybrid mode | 2026 | Classical + PQC combined |
| Full PQC | 2027+ | PQC-only mode |

### Algorithm Selection

| Use Case | Current | PQC Replacement | Standard |
|----------|---------|-----------------|----------|
| Key Exchange | ECDH P-256 | ML-KEM-768 | FIPS 203 |
| Signatures | ECDSA P-256 | ML-DSA-65 | FIPS 204 |
| Hashing | SHA-256 | SHA-3-256 | FIPS 202 |

### Hybrid Implementation

```typescript
// Combine classical and PQC
async function hybridKeyExchange(
  classicalPublicKey: CryptoKey,
  pqcPublicKey: Uint8Array
): Promise<CryptoKey> {
  // Classical ECDH
  const classicalShared = await deriveSharedSecret(
    ephemeralPrivateKey,
    classicalPublicKey
  );

  // PQC ML-KEM
  const pqcShared = await mlKemDecapsulate(
    pqcCiphertext,
    pqcPrivateKey
  );

  // Combine both secrets
  const combined = new Uint8Array(
    classicalShared.byteLength + pqcShared.byteLength
  );
  combined.set(new Uint8Array(classicalShared), 0);
  combined.set(pqcShared, classicalShared.byteLength);

  // Derive final key
  return await deriveAESKey(combined.buffer);
}
```

### Browser Support

| Browser | Web Crypto | WebAssembly | PQC Timeline |
|---------|------------|-------------|--------------|
| Chrome | ✅ | ✅ | 2026+ |
| Firefox | ✅ | ✅ | 2026+ |
| Safari | ✅ | ✅ | 2027+ |
| Edge | ✅ | ✅ | 2026+ |

---

## Breaking Changes Policy

### Version Compatibility

| Version | Compatibility | Migration |
|---------|---------------|-----------|
| v1.0 → v1.1 | ✅ Backward compatible | Automatic |
| v1.x → v2.0 | ⚠️ Breaking changes | Manual export/import |
| v2.x → v3.0 | ✅ Backward compatible | Automatic |
| v3.x → v4.0 | ⚠️ Breaking (crypto) | Dual-mode support |

### Migration Tools

```typescript
// v1.x to v2.0 migration
export async function migrateV1ToV2(
  v1Session: V1Session
): Promise<V2Session> {
  // Export v1 data
  const exported = await exportV1Data(v1Session);

  // Create v2 session
  const v2Session = await createV2Session();

  // Import messages (re-encrypt with v2 keys)
  for (const message of exported.messages) {
    await v2Session.importMessage(message);
  }

  return v2Session;
}
```

---

## Community Contributions

### How to Propose Features

1. Open a GitHub Discussion
2. Describe use case and security implications
3. Community feedback (30 days)
4. Core team review
5. Implementation or rejection

### Priority Factors

| Factor | Weight |
|--------|--------|
| Security improvement | 40% |
| User demand | 25% |
| Technical feasibility | 20% |
| Maintenance burden | 15% |

---

## Resources

- [NIST PQC Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [WebRTC Security](https://webrtc-security.github.io/)
- [OWASP Mobile Security](https://mas.owasp.org/)
- [W3C Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)

---

**Last Updated**: 2024  
**Next Review**: Quarterly
