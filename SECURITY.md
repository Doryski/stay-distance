# Security Policy

## Supported Versions

Stay Distance is in early development. Only the latest `main` branch and the most recent release receive security updates.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Instead, report privately via GitHub's [private vulnerability reporting](https://github.com/doryski/stay-distance/security/advisories/new) for this repository.

When reporting, please include:

- A description of the issue and its impact
- Steps to reproduce (proof of concept if possible)
- Affected version / commit SHA
- Any suggested remediation

### What to expect

- Acknowledgement within 7 days
- A follow-up with next steps or a fix timeline
- Credit in release notes once the issue is resolved (unless you prefer to remain anonymous)

## Scope

In scope:

- The extension source in this repository (`src/`, `scripts/`, `public/`)
- The build output shipped as the extension

Out of scope:

- Vulnerabilities in upstream services (Nominatim, OSRM, booking.com) — please report to those projects directly
- Issues requiring a modified/untrusted build of the extension
- Social engineering of maintainers

## Privacy

Stay Distance is privacy-first. All user data lives locally in `chrome.storage.local`. If you discover a path that leaks user data off-device, that qualifies as a security issue and should be reported as above.
