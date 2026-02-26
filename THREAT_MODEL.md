# TPChat Threat Model

## Document Information

| Property | Value |
|----------|-------|
| Version | 1.1.0 |
| Date | 2024 |
| Classification | Public |
| Author | MrTelepathic |

---

## 1. Introduction

This document describes the threat model for TPChat, a zero-trust end-to-end encrypted messaging platform. It identifies potential adversaries, attack surfaces, and the mitigations implemented to protect user data and communications.

### Scope

This threat model covers:
- Client-side application security
- Cryptographic implementations
- Session management
- Message transport
- Infrastructure security

### Out of Scope

- Operating system security
- Browser security (assumed trusted)
- Physical device security
- Network infrastructure outside application control

---

## 2. Adversary Capabilities

### 2.1 Adversary Types

| Type | Capabilities | Motivation |
|------|--------------|------------|
| **Passive Eavesdropper** | Network monitoring, traffic analysis | Intelligence gathering |
| **Active MITM** | Intercept, modify, inject network traffic | Message tampering |
| **Malicious Host** | Control hosting infrastructure | Code injection |
| **Local Attacker** | Physical device access, malware | Data extraction |
| **State Actor** | All above + legal coercion, resource abundance | Mass surveillance |
| **Insider** | Access to development/deployment systems | Sabotage, data theft |

### 2.2 Adversary Capabilities Matrix

| Capability | Passive | Active | Malicious Host | Local | State | Insider |
|------------|:-------:|:------:|:--------------:|:-----:|:-----:|:-------:|
| Read network traffic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modify network traffic | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Inject network traffic | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Compromise servers | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Access device storage | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Extract memory | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Legal coercion | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Supply chain attacks | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 3. Attack Surface Analysis

### 3.1 Attack Surface Table

| Surface | Description | Risk Level | Mitigation |
|---------|-------------|------------|------------|
| **Network Transport** | Message transmission | High | E2E Encryption |
| **Browser Storage** | sessionStorage, localStorage | High | Encryption at Rest |
| **Memory (RAM)** | Runtime key storage | Critical | RAM-only keys, secure wipe |
| **JavaScript Bundle** | Application code | High | Integrity verification |
| **WebAssembly Module** | Crypto sandbox | Medium | Memory isolation |
| **Build Pipeline** | CI/CD, dependencies | Medium | Supply chain hardening |
| **User Interface** | Input handling, display | Low | XSS prevention |
| **Media Recording** | Camera, microphone access | Medium | Permission controls |

### 3.2 Attack Tree

```
Compromise TPChat Communication
├── Network Attacks
│   ├── Eavesdrop traffic
│   │   └── Mitigation: E2E encryption (AES-256-GCM)
│   ├── Replay messages
│   │   └── Mitigation: Anti-replay cache
│   ├── MITM attack
│   │   └── Mitigation: ECDH key exchange
│   └── Traffic analysis
│       └── Mitigation: No metadata collection
├── Client Attacks
│   ├── Extract keys from memory
│   │   └── Mitigation: RAM-only, secure wipe
│   ├── Steal encrypted session
│   │   └── Mitigation: PBKDF2 310k iterations
│   ├── XSS injection
│   │   └── Mitigation: Strict CSP, no inline scripts
│   └── Code tampering
│       └── Mitigation: Runtime integrity check
├── Infrastructure Attacks
│   ├── Serve malicious code
│   │   └── Mitigation: Bundle hash verification
│   ├── Dependency compromise
│   │   └── Mitigation: Lock files, npm audit
│   └── Build system compromise
│       └── Mitigation: Reproducible builds
└── Physical Attacks
    ├── Device seizure
    │   └── Mitigation: No persistent plaintext
    └── Cold boot attack
        └── Mitigation: Memory encryption (browser)
```

---

## 4. Threat Scenarios

### 4.1 Scenario 1: Network Eavesdropping

**Threat**: Adversary monitors network traffic to read messages.

**Attack Steps**:
1. Position on network path
2. Capture all packets
3. Attempt decryption

**Impact**: HIGH - Message content exposure

**Mitigation**:
- ECDH key exchange establishes shared secret
- AES-256-GCM encrypts all messages
- Forward secrecy via ephemeral keys

**Residual Risk**: LOW - Quantum computers could break ECDH

### 4.2 Scenario 2: Message Replay

**Threat**: Adversary resends captured messages to cause confusion.

**Attack Steps**:
1. Capture legitimate message
2. Wait or modify timestamp
3. Resend to recipient

**Impact**: MEDIUM - Duplicate messages, potential confusion

**Mitigation**:
- Unique message ID (UUID v4)
- Cryptographic nonce (96-bit)
- Timestamp validation (5-minute window)
- In-memory replay cache

**Residual Risk**: NEGLIGIBLE

### 4.3 Scenario 3: Session Hijacking

**Threat**: Adversary steals session to impersonate user.

**Attack Steps**:
1. Gain access to device
2. Extract session from storage
3. Decrypt session with stolen password

**Impact**: CRITICAL - Full account compromise

**Mitigation**:
- Session encrypted with PBKDF2 (310k iterations)
- Keys exist only in RAM
- Session destroyed on logout/timeout
- Inactivity monitoring

**Residual Risk**: MEDIUM - Depends on password strength

### 4.4 Scenario 4: Code Injection

**Threat**: Adversary modifies deployed code to steal keys.

**Attack Steps**:
1. Compromise hosting infrastructure
2. Modify JavaScript bundle
3. Wait for users to load malicious code

**Impact**: CRITICAL - Key exfiltration

**Mitigation**:
- SHA-256 bundle hash verification
- integrity.json with module hashes
- Runtime validation on load
- CSP prevents inline scripts

**Residual Risk**: LOW - Detection likely, but possible

### 4.5 Scenario 5: Supply Chain Attack

**Threat**: Adversary compromises build dependencies.

**Attack Steps**:
1. Identify vulnerable dependency
2. Inject malicious code
3. Propagate through builds

**Impact**: HIGH - Widespread compromise

**Mitigation**:
- package-lock.json enforcement
- npm audit in CI/CD
- Minimal dependencies
- No external CDNs

**Residual Risk**: MEDIUM - Zero-day in dependency possible

### 4.6 Scenario 6: DevTools Exploitation

**Threat**: Attacker uses DevTools to extract runtime data.

**Attack Steps**:
1. Open DevTools
2. Inspect memory/variables
3. Extract keys or plaintext

**Impact**: HIGH - Runtime data exposure

**Mitigation**:
- DevTools paranoid mode (optional)
- Detection via window size, debugger trap
- Session destruction on detection
- Memory hardening

**Residual Risk**: MEDIUM - Detection not guaranteed

### 4.7 Scenario 7: Post-Quantum Threat

**Threat**: Quantum computer breaks classical cryptography.

**Attack Steps**:
1. Collect encrypted traffic
2. Store for future decryption
3. Use quantum computer to break ECDH

**Impact**: HIGH - Retroactive decryption

**Mitigation**:
- Hybrid crypto engine ready
- CRYSTALS-Kyber integration planned
- Algorithm agility framework

**Residual Risk**: HIGH - Not yet implemented

---

## 5. Risk Assessment

### 5.1 Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Status |
|--------|------------|--------|------------|--------|
| Network eavesdropping | High | High | HIGH | Mitigated |
| Message replay | Medium | Medium | MEDIUM | Mitigated |
| Session hijacking | Medium | Critical | HIGH | Mitigated |
| Code injection | Low | Critical | HIGH | Mitigated |
| Supply chain | Low | High | MEDIUM | Mitigated |
| DevTools exploit | Medium | High | MEDIUM | Mitigated |
| Post-quantum | Low | High | MEDIUM | Planned |
| XSS | Low | Medium | LOW | Mitigated |
| CSRF | N/A | N/A | N/A | N/A (no server) |

### 5.2 Risk Calculation

```
Risk = Likelihood × Impact

Likelihood Scale:
- Low: 1 (Unlikely, requires significant resources)
- Medium: 2 (Possible, known techniques)
- High: 3 (Likely, common attack)

Impact Scale:
- Low: 1 (Minimal damage)
- Medium: 2 (Partial compromise)
- High: 3 (Significant damage)
- Critical: 4 (Total compromise)

Risk Levels:
- 1-3: LOW (Acceptable)
- 4-6: MEDIUM (Monitor)
- 7-9: HIGH (Mitigate)
- 10-12: CRITICAL (Immediate action)
```

---

## 6. Mitigation Mapping

### 6.1 Cryptographic Controls

| Control | Implementation | Verification |
|---------|----------------|------------|
| Key Exchange | ECDH P-256 | Unit tests |
| Encryption | AES-256-GCM | Unit tests |
| Key Derivation | HKDF-SHA256 | Unit tests |
| Password Hashing | PBKDF2 310k | Unit tests |
| Random Generation | crypto.getRandomValues | Statistical tests |

### 6.2 Architectural Controls

| Control | Implementation | Verification |
|---------|----------------|------------|
| Zero server | GitHub Pages static | Deployment check |
| No database | In-memory only | Code review |
| WASM isolation | crypto.wasm | Integration tests |
| Memory hardening | Secure wipe | Memory profiling |

### 6.3 Operational Controls

| Control | Implementation | Verification |
|---------|----------------|------------|
| Dependency audit | npm audit in CI | Automated |
| Integrity verification | integrity.json | Runtime check |
| Source map stripping | Build config | Build inspection |
| CSP headers | index.html meta | Header check |

---

## 7. Residual Risks

### 7.1 Accepted Risks

| Risk | Reason | Acceptance Criteria |
|------|--------|---------------------|
| Browser trust | Must trust browser's Web Crypto | Use modern, updated browsers |
| Metadata leakage | No padding, timing varies | Acceptable for use case |
| Quantum threat | PQC not yet standardized | Hybrid mode planned for v4.0 |
| Social engineering | Outside technical scope | User education |

### 7.2 Risks Requiring Monitoring

| Risk | Monitoring Method | Threshold |
|------|-------------------|-----------|
| Dependency vulnerabilities | npm audit | High severity |
| Browser API changes | Automated tests | Breaking changes |
| Cryptographic advances | Security bulletins | Practical attacks |

### 7.3 Risks Planned for Mitigation

| Risk | Planned Mitigation | Timeline |
|------|-------------------|----------|
| Quantum computers | CRYSTALS-Kyber integration | v4.0 (2026) |
| Side-channel attacks | Constant-time implementations | v1.2 |
| Memory forensics | WASM memory encryption | v2.0 |

---

## 8. Security Testing

### 8.1 Automated Testing

| Test Type | Frequency | Tool |
|-----------|-----------|------|
| Unit tests | Every commit | Vitest |
| Crypto tests | Every commit | Custom |
| Dependency audit | Every commit | npm audit |
| Type checking | Every commit | TypeScript |
| Bundle integrity | Every build | Custom |

### 8.2 Manual Testing

| Test Type | Frequency | Responsible |
|-----------|-----------|-------------|
| Penetration testing | Quarterly | Security team |
| Code review | Every PR | Core maintainers |
| Architecture review | Annually | Security architect |

### 8.3 Third-Party Audits

| Audit Type | Frequency | Provider |
|------------|-----------|----------|
| Cryptographic review | Before major releases | External firm |
| Penetration test | Annually | External firm |

---

## 9. Incident Response

### 9.1 Security Incident Classification

| Level | Description | Response Time | Action |
|-------|-------------|---------------|--------|
| P0 - Critical | Active exploitation, key extraction | 1 hour | Emergency response |
| P1 - High | Vulnerability with exploit potential | 4 hours | Urgent patch |
| P2 - Medium | Vulnerability, no known exploit | 24 hours | Scheduled fix |
| P3 - Low | Defense in depth improvement | 7 days | Backlog |

### 9.2 Response Procedures

1. **Detection**: Automated monitoring, user reports, security research
2. **Assessment**: Classify severity, determine impact
3. **Containment**: Disable affected features if necessary
4. **Remediation**: Develop and test fix
5. **Deployment**: Deploy through normal CI/CD
6. **Communication**: Notify users if data at risk
7. **Post-mortem**: Document lessons learned

### 9.3 Contact Information

- Security Email: security@tpchat.dev
- PGP Key: Available on website
- Response SLA: 48 hours for initial response

---

## 10. Compliance and Standards

### 10.1 Standards Mapping

| Standard | Requirements | Compliance |
|----------|--------------|------------|
| NIST SP 800-57 | Key management | ✅ Compliant |
| OWASP ASVS | Application security | ✅ Level 2 |
| W3C Web Crypto | API usage | ✅ Compliant |
| FIPS 197 | AES implementation | ✅ Via browser |

### 10.2 Privacy Regulations

| Regulation | Applicability | Compliance |
|------------|---------------|------------|
| GDPR | No data collection | ✅ Not applicable |
| CCPA | No data collection | ✅ Not applicable |
| HIPAA | Not a covered entity | ✅ Not applicable |

---

## 11. References

1. [OWASP Threat Modeling](https://owasp.org/www-community/Application_Threat_Modeling)
2. [NIST SP 800-30 - Risk Assessment](https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final)
3. [STRIDE Threat Model](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
4. [W3C Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)
5. [Signal Protocol Security](https://signal.org/docs/)

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024 | MrTelepathic | Initial release |
| 1.1.0 | 2024 | MrTelepathic | Added WASM, PQC, paranoid mode |

---

**Next Review Date**: Quarterly  
**Distribution**: Public
