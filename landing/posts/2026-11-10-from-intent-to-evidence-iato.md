---
title: "From Intent to Evidence: Building IĀTŌ, Identity Controls That Leave Proof"
date: 2026-11-10
summary: How the IĀTŌ series turns access intent into evidence, with Entra ID sign in for Debian hosts and SailPoint IdentityIQ governance for legacy Linux file shares.
---

*Why "we have a policy for that" isn't the same as "we can show you"*

Every access review I've been near has the same awkward moment. Someone asks, "Can a leaver still log in to that server?" or "Who can write to the finance share?", and the honest answer is, "They shouldn't." There's a policy. There's an intent. What's missing is evidence an auditor can actually trace.

IĀTŌ (Intent-Auditable Trust Object) is the series of identity projects I've built around that gap. Each one takes a piece of access intent, enforces it in the system that holds the access, and leaves behind a record of what was checked and what came back.

## Why "trust object"?

A claim about access ("only Linux admins can log in to these hosts", "revoked access is gone") should travel with everything needed to check it: where the data came from, what scope it covers, what was observed and which test was run. Bundle those together and you get a trust object. It isn't a promise, it's a receipt.

## Hybrid identity at the server: Entra ID sign in for Debian

The first gap is Linux. Servers often keep local accounts and SSH keys that never pass through the directory, so Conditional Access and MFA stop at the edge of the estate.

One project in the series closes that with `iato`, a self-contained C# (.NET 8) command line tool that configures Debian hosts to sign in Microsoft Entra ID users through the SSSD `idp` provider.

- SSSD reads users and groups from Microsoft Graph, and logins use the OAuth 2.0 Device Authorization Grant, so MFA and Conditional Access apply at every SSH login.
- `access_provider = simple` limits logins to one Entra group, and credentials aren't cached, so a disabled account loses access at its next sign in.
- POSIX UIDs and GIDs are derived from Entra object IDs, with no ID mapping kept by hand.
- `iato register-app` creates the app registration and admin consent through Microsoft Graph with only `User.Read.All` and `GroupMember.Read.All`.
- `iato check --host` validates the rendered `sssd.conf` against the installed SSSD before the service starts.
- Releases ship as signed `.deb` packages for amd64 and arm64, with published checksums.

Here the evidence is the login itself. Every session is an Entra sign in, and the policy decision is recorded where an auditor already looks.

## Governance for legacy data: SailPoint IdentityIQ and Linux file shares

The second gap is old data. Legacy file servers hold regulated records, but they express access in owner, group and mode bits, POSIX ACLs and NFS export options that drift for years.

Another project in the series governs those shares with SailPoint IdentityIQ across the joiner, mover and leaver lifecycle.

- HR is the authoritative source, with correlation and identity refresh.
- An entitlement catalogue is bound to the shares, with a role model and an access request approval workflow.
- A segregation of duties policy (finance share write against audit share write) and targeted certification campaigns keep access reviewed.
- A change planner turns each grant or revocation into structured steps for the host, revoking before granting, and re-aggregation produces attestation evidence that revoked access is actually gone from disk.
- It deploys on JBoss EAP 7.4, with notes for moving the shares to Azure Files and Azure NetApp Files.

Here the trust object is the closed loop: the request, the approval, the change on disk and the check that proves it landed.

## What I learned

Start with the question an auditor will ask, then work backwards. Every setting in `sssd.conf` and every IdentityIQ rule exists because a control needs it.

Validate before you enable. A configuration that's checked before the service starts can't quietly drift into a weaker one.

Close the loop on disk. Removing an entitlement in the governance tool is a claim. Reading the ACL back is the evidence.

## What's next

More controls built the same way, and tighter evidence from each one. If you work on identity governance or access assurance and want to compare notes, I'd like to hear from you.

The code and docs are on GitHub: [Entra ID sign in for Debian](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2) and [IdentityIQ governance for legacy file shares](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V3). You can find more of my work on [my site](https://whatheheckisthis.github.io/).
