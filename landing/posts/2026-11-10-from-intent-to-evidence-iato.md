---
title: "From Intent to Evidence: Building IĀTŌ, Identity Controls That Leave Proof"
date: 2026-11-10
summary: The motivation, objectives, assumptions and design of the IĀTŌ series, which turns access intent into evidence through Entra ID sign in for Debian hosts and SailPoint IdentityIQ governance for legacy Linux file shares.
---

## Motivation

Most access reviews reach the same point. A reviewer asks whether a leaver can still log in to a server, or who can write to the finance share, and the accurate answer is that they should not be able to. A policy exists and the intent is clear. What is missing is evidence an auditor can trace from the requirement to the system.

IĀTŌ (Intent-Auditable Trust Object) is a series of identity projects built to close that gap. Each project takes a statement of access intent, enforces it in the system that holds the access, and records what was checked and what was observed.

## Objectives

1. Express each access claim as a trust object: the claim together with its source, scope, observation and test.
2. Enforce intent in the system that holds the access, not in a parallel record.
3. Produce evidence as a by-product of normal operation rather than as a separate audit exercise.

```
 intent          enforcement               observation              evidence
 ------          -----------               -----------              --------
 "only Linux --> Entra group gate at   --> every SSH login is   --> sign-in logs an
  admins log      the host (SSSD)          an Entra sign in         auditor already reads
  in"

 "revoked    --> IdentityIQ revocation --> re-aggregation reads --> attestation that the
  access is       planned on the host      the ACL back from disk    access is gone
  removed"
```

## Assumptions

- Microsoft Entra ID is the authoritative directory for workforce identities, and HR is the authoritative source for joiner, mover and leaver events.
- Target hosts run Debian with an SSSD version that supports the `idp` provider.
- Legacy shares express access through owner, group and mode bits, POSIX ACLs and NFS export options.
- Evidence is credible only if it is read back from the target system after the change, not inferred from the request.

## Project one: Entra ID sign in for Debian

**Problem.** Linux servers often retain local accounts and SSH keys that never pass through the directory, so Conditional Access and MFA stop at the edge of the estate.

**Approach.** `iato` is a self-contained C# (.NET 8) command line tool that configures Debian hosts to sign in Microsoft Entra ID users through the SSSD `idp` provider.

```
 SSH client --> Debian host (sshd + PAM) --> SSSD idp provider --> Microsoft Graph / Entra ID
                                               |                     |
                                               |   Device Authorization Grant: MFA and
                                               |   Conditional Access at every login
                                               v
                                    access_provider = simple (one Entra group)
                                    no cached credentials
                                    UID/GID derived from Entra object ID
```

- `iato register-app` creates the app registration and admin consent through Microsoft Graph with only `User.Read.All` and `GroupMember.Read.All`.
- `iato check --host` validates the rendered `sssd.conf` against the installed SSSD before the service starts.
- Releases ship as signed `.deb` packages for amd64 and arm64, with published checksums.

**Outcome.** Each session is an Entra sign in, a disabled account loses access at its next login, and the policy decision is recorded where an auditor already looks.

## Project two: IdentityIQ governance for legacy file shares

**Problem.** Legacy file servers hold regulated records, but their permissions drift for years and are rarely reviewed against a role model.

**Approach.** SailPoint IdentityIQ governs the shares across the joiner, mover and leaver lifecycle.

```
 HR (authoritative) --> IdentityIQ: correlation, identity refresh
                            |
                            v
               entitlement catalogue + role model + SoD policy
                            |
          access request --> approval --> change planner (revoke before grant)
                                                  |
                                                  v
                                   Linux host: ACLs, groups, NFS exports
                                                  |
                            re-aggregation <------+
                                  |
                                  v
                    attestation evidence: revoked access is absent on disk
```

- A segregation of duties policy (finance share write against audit share write) and targeted certification campaigns keep access under review.
- The deployment runs on JBoss EAP 7.4, with documented migration paths to Azure Files and Azure NetApp Files.

**Outcome.** The trust object is the closed loop: the request, the approval, the change on disk and the check that confirms it.

## Principles carried forward

- Begin with the question an auditor will ask and work backwards; every SSSD setting and IdentityIQ rule exists because a control requires it.
- Validate configuration before enabling a service, so that it cannot drift into a weaker state unnoticed.
- Treat a removal in the governance tool as a claim, and the ACL read back from disk as the evidence.

## Next steps

Further controls will be built on the same pattern, with tighter evidence from each. The source and documentation are available for [Entra ID sign in for Debian](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2) and [IdentityIQ governance for legacy file shares](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V3).
