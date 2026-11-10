# Changelog

All notable changes to Medical are documented in this file. Releases follow
[Semantic Versioning](https://semver.org/) and are prepared and published
manually from GitHub Actions.

## 1.1.2

- Replace RUT-based initial credentials for staff-created patients with expiring, single-use account invitations.
- Allow staff to resend activation invitations from the patient list.
- Reject MFA challenge tokens as sessions in the HTTP API and Socket.IO.

## 1.1.1

- Fix patient registration on Node runtimes without `RegExp.escape`, while preserving duplicate RUT detection.
- Place the verification code field below its label and increase spacing around it.
- Bundle phone country flags so they render under the production content security policy.

## 1.1.0

- Add a public appointment agenda with specialty, professional and available-slot selection.
- Allow new patients to register with a six-digit email verification code and resume their booking.
- Restrict self-service reservations to the authenticated patient's record and revalidate availability.
- Refresh the public website, portal dashboards, management screens and mobile navigation.
- Unify transactional emails with the Medical logo and shared visual design.
- Redesign payment receipts and prescriptions with payment status, improved readability and numbered pages.
- Configure local and test MongoDB replica sets for atomic patient registration.
- Add regression coverage for registration, booking, portal navigation and printable documents.

## 1.0.0

- Initial versioned release baseline.
