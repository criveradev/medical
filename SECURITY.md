# Security policy

## Supported versions

Only the latest published release receives security fixes.

## Reporting a vulnerability

Do not open a public issue containing credentials, patient data, tokens, or
technical details that would enable exploitation. Use GitHub's private
vulnerability reporting feature in the repository Security tab.

Include the affected version, impact, reproduction steps, and any suggested
mitigation. Never use real patient information when preparing a report.

Secrets exposed accidentally must be revoked and rotated immediately; removing
them from a later commit is not sufficient.

## Production controls

- Keep MongoDB, Redis, Cloudinary, email, Sentry, and deployment credentials in
  each provider's secret store. Use a different value for every JWT, audit, and
  MFA encryption key.
- Enable MFA for privileged staff accounts. An administrator can revoke all
  sessions or reset MFA when a verified recovery procedure requires it.
- Treat audit events, logs, exports, backups, and uploaded clinical files as
  sensitive data. Restrict access by least privilege and never copy production
  patient data into development or test environments.
- Configure encrypted managed backups for MongoDB, document their retention,
  and test restoration periodically. A backup is not considered operational
  until a restore has been verified.
- Define the legally required retention and deletion policy for clinical and
  audit data before accepting real patients. The application default for audit
  events is 365 days and can be changed with `AUDIT_RETENTION_DAYS`.
- Review the data-processing terms and region of every external provider before
  using the system with regulated health data. Technical controls in this
  repository do not by themselves establish regulatory compliance.
