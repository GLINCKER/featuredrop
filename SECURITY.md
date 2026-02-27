# Security Policy

## Supported Versions

We actively patch security issues on the latest major release branch.

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| < 1.0 | No |

## Reporting a Vulnerability

Please do **not** open a public issue for suspected vulnerabilities.

- Email: `security@glincker.com`
- Include:
  - affected version (`featuredrop` version)
  - impact summary
  - reproduction steps or proof of concept
  - any suggested mitigation

We will acknowledge reports within 3 business days and provide status updates as triage progresses.

## Security Guarantees

- No dynamic code execution (`eval`, `new Function`) in library runtime.
- URL guardrails in manifest validation (`url`, `image`, `cta.url` only allow `http`, `https`, or relative links).
- Unsafe metadata keys are rejected (`__proto__`, `constructor`, `prototype`).
- Remote and browser adapters degrade safely on network/storage failures.

## Disclosure Process

After a fix is validated:

1. A patched release is published.
2. Changelog notes describe impact and upgrade guidance.
3. Public disclosure follows once users have a reasonable patch window.
