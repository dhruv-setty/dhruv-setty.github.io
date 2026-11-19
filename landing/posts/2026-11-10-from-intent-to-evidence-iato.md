---
title: "From Intent to Evidence: Building IĀTŌ, Identity Controls That Leave Proof"
date: 2026-11-10
summary: A figure by figure walkthrough of the CI captures behind IĀTŌ V2, Entra ID sign in for Debian through SSSD, and IĀTŌ V3, IdentityIQ governance of legacy Linux file shares, read as engineering evidence.
---

## What the figures are

IĀTŌ (Intent-Auditable Trust Object) is a series of identity projects built on one rule: an access claim counts only when the system that holds the access shows it. This post walks through two of them, V2 and V3, using nothing but the figures their repositories publish.

Every figure below was produced by a `captures.yml` workflow on an `ubuntu-24.04` GitHub runner. Each terminal figure is an `xterm` window on an Xvfb display running the commands it shows, captured with ImageMagick; the text it printed is kept beside it as a `.log` or `.txt` transcript. No figure is drawn by hand. That matters for the argument of this post: a screenshot of a command that ran is evidence in the same sense that a sign-in log is evidence, and a diagram is not.

| Repository | What it builds | What CI cannot show |
|---|---|---|
| IĀTŌ V2 | `iato`, a C# (.NET 8) CLI that configures Debian hosts to sign in Microsoft Entra ID users through the SSSD `idp` provider | A real tenant, `iato install` on a systemd host, `iato verify`, and the device code prompt at SSH login |
| IĀTŌ V3 | IdentityIQ Legacy Filesystem Governance: a Java change planner, evidence library and IdentityIQ configuration for POSIX and ACL file shares | IdentityIQ itself and JBoss EAP; the configuration has not been imported into a running IdentityIQ instance |

## Part one: Entra ID sign in for Debian

The intent is short: only members of one Entra group log in, every login is an Entra sign in with MFA and Conditional Access, and a disabled account loses access at its next login. `iato` does not implement any of that itself. It renders, checks and installs SSSD configuration, and SSSD 2.11.0 or later does the sign in through the OAuth 2.0 Device Authorization Grant. The engineering problem is therefore configuration that cannot drift into a weaker state, and that is what the figures test.

### The command surface

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-01-cli-help.png" alt="Terminal showing iato version, iato --help and iato register-app failing without a Graph token" width="746" height="330" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Command line</span> <code class="ic">iato version</code> prints 2.0.1 and <code class="ic">iato --help</code> lists the six subcommands. <code class="ic">iato register-app</code>, run with no <code class="ic">IATO_GRAPH_TOKEN</code> and no Azure CLI sign in, stops before any Graph request and exits with status 1.</figcaption></figure>

The help text states two properties that an auditor would otherwise have to ask about: `register-app` takes its Graph token only from `IATO_GRAPH_TOKEN` or `az account get-access-token`, and files holding the client secret are written with mode 0600. The failure case is the more useful half of the figure. With no token the tool refuses before it sends anything, so a partially created app registration is not a possible outcome of a missing credential.

### A clean release build

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-02-dotnet-build.png" alt="Terminal showing dotnet build -c Release succeeding with one warning and no errors" width="1628" height="348" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Release build</span> <code class="ic">dotnet build -c Release</code> restores and builds <code class="ic">Iato</code> and <code class="ic">Iato.Tests</code> for <code class="ic">net8.0</code> with SDK 11.0.100: 0 errors and 1 warning, the xUnit analyzer rule <code class="ic">xUnit2029</code> at line 19 of <code class="ic">SssdConfigTests.cs</code>.</figcaption></figure>

The single warning is reported rather than suppressed. It is an analyzer style rule in the test project (use `Assert.DoesNotContain` rather than `Assert.Empty`), not a defect in the tool, and leaving it visible is the honest state of the build.

### Ten unit tests

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-03-dotnet-test.png" alt="Terminal listing ten passed xUnit tests" width="1388" height="430" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Unit tests</span> <code class="ic">dotnet test -c Release</code> with the normal console logger lists each test by name. Total tests: 10; passed: 10.</figcaption></figure>

The test names read as the control list:

| Test | Control it protects |
|---|---|
| `DebianVersionsParse` (two cases) | The `--host` version gate parses Debian package versions, including an epoch and a release candidate |
| `BadSettingsAreFound` (two cases) | A key SSSD rejects, and a duplicate key, are caught |
| `NewlineInValueIsRejected` | A multi line value cannot inject a setting |
| `MissingValueIsRejected` | Rendering stops when a value is missing |
| `ClientIdMustBeGuid` | `idp_client_id` has the right shape |
| `RenderedTemplatePassesCheck` | The shipped template renders with no placeholders and no errors |
| `SecretFileIsOwnerOnly` | Output files are created with mode 0600 |
| `ApplicationRequestsExpectedPermissions` | The Graph request asks for exactly the two application roles and allows public client flows |

The last test stands in for a capture that CI cannot make. There is no tenant on the runner, so the Graph request body is checked in a unit test instead of being shown against Entra ID.

### The rendered configuration

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-04-render-sssd-conf.png" alt="Terminal showing iato render and the rendered sssd.conf with mode 0600" width="988" height="944" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Rendered sssd.conf</span> <code class="ic">iato render</code> fills the embedded template from a placeholder <code class="ic">entra-app.env</code> and the group <code class="ic">linux-admins</code>. The file is created with mode 0600. The <code class="ic">[domain/entra]</code> section sets <code class="ic">id_provider = idp</code>, <code class="ic">idp_type = entra_id</code>, the tenant token and device authorization endpoints, the idmap range and <code class="ic">cache_credentials = false</code>.</figcaption></figure>

This is the figure where intent becomes configuration, line by line:

```
 intent                                     setting in Figure 4
 ------                                     -------------------
 every login is an Entra sign in        --> id_provider = idp, auth_provider = idp
 only one group may log in              --> access_provider = simple
                                            simple_allow_groups = linux-admins
 a disabled account loses access        --> cache_credentials = false
 at its next login
 the same user has the same UID         --> idmap_range_min / max / size
 on every host
 the secret is readable by root only    --> -rw------- on the rendered file
```

The identifiers in the figure are placeholders (`00000000-...` tenant, `11111111-...` client, `ci-placeholder` secret). No tenant is contacted in any figure in this post.

### Catching a broken configuration

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-05-check-config.png" alt="Terminal showing iato check passing a valid file and reporting five errors on a broken copy" width="1340" height="449" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · Configuration check</span> <code class="ic">iato check</code> reports the rendered file as ok. A copy is broken with <code class="ic">sed</code>: <code class="ic">config_file_version</code> is added, <code class="ic">idp_client_id</code> is replaced by a placeholder and two endpoints are changed to http. <code class="ic">iato check</code> then reports 5 errors and exits with status 1.</figcaption></figure>

The broken copy is a realistic drift scenario, and every change in the `diff` is caught: an unrendered placeholder, a key SSSD 2.13 rejects, two endpoints that are not https, and a client ID that is not a GUID. The checks do not depend on the `sssctl` rule set, which can lag new back ends. A non zero exit status is what lets `iato install` refuse to start SSSD on a bad file.

### The host check where the provider exists

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-06-host-check-forky.png" alt="Terminal showing iato check --host passing in a Debian forky container with SSSD 2.13.1-5" width="860" height="194" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 6 · Host check, Debian forky</span> In a <code class="ic">debian:forky</code> container with <code class="ic">sssd-common</code> and <code class="ic">sssd-idp</code> 2.13.1-5 installed, <code class="ic">iato render</code> writes <code class="ic">/etc/sssd/sssd.conf</code> as root with mode 0600, and <code class="ic">iato check --host</code> reports it as ok.</figcaption></figure>

`--host` adds three checks to the file check: the installed SSSD version (2.11.0 or later), the presence of `libsss_idp.so`, and the file mode. The same command runs in `ci.yml` on every push, so this passing state is repeated, not captured once.

### The host check where it does not

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-07-host-check-trixie.png" alt="Terminal showing iato check --host failing in a Debian trixie container with SSSD 2.10.1" width="868" height="313" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 7 · Host check, Debian 13</span> In a <code class="ic">debian:trixie</code> container, <code class="ic">sssd-common</code> is 2.10.1-2+b1 and <code class="ic">sssd-idp</code> is not installed. <code class="ic">iato check --host</code> reports that SSSD 2.10.1 has no <code class="ic">idp</code> provider and that <code class="ic">libsss_idp.so</code> is missing, and exits with status 1, as intended.</figcaption></figure>

This is the failure the design exists to prevent. Debian 12 ships SSSD 2.8.2 and Debian 13 ships 2.10.1, neither of which has the `idp` provider, so `iato install` pins only the SSSD packages from forky (2.13) on those releases. Without the pin the check fails closed instead of starting a service that cannot enforce the intent.

### What part one does not show

The README is explicit, and so is this post: `iato register-app` against a real tenant, `iato install` on a systemd host, `iato verify`, and the device code prompt that `pam_sss` prints at SSH login are not captured, because CI has no tenant and no systemd host. Continuous integration does not cover Debian 12, Debian 13 or sid hosts. The client secret is the only credential type the `idp` provider supports at present; a certificate credential is planned work, not implemented.

## Part two: IdentityIQ governance for legacy file shares

Legacy file servers hold regulated records behind owner, group and mode bits, POSIX.1e ACLs and NFS export options that drift through manual change. V3 brings that access under IdentityIQ with an ordered, idempotent change plan, a separation of duties policy between finance and audit write access, and evidence that a revocation took effect on disk. The core logic lives in `fsgov-core`, a Java library with no IdentityIQ dependency, which is what the runner can execute.

### Build and tests

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-01-maven-build-tests.png" alt="Terminal showing Maven verify with Surefire counts per test class and BUILD SUCCESS" width="684" height="498" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 8 · Build and unit tests</span> <code class="ic">mvn -B -ntp verify</code>: 78 tests in 14 classes of <code class="ic">fsgov-core</code> and 37 tests in 3 classes of <code class="ic">fsgov-config-validation</code>, with no failures, errors or skips, and BUILD SUCCESS.</figcaption></figure>

| Module | Test classes | Tests | Failures | Errors | Skipped |
|---|---|---|---|---|---|
| `fsgov-core` | 14 | 78 | 0 | 0 | 0 |
| `fsgov-config-validation` | 3 | 37 | 0 | 0 | 0 |
| Total | 17 | 115 | 0 | 0 | 0 |

The 37 configuration tests are the boundary of what can be said about the IdentityIQ XML: every artifact is parsed and declares the `sailpoint.dtd` DOCTYPE, every object reference and rule name resolves, every `%%TOKEN%%` has a value, and the repository contains no script sources. They are well formedness and consistency checks, not validation against `sailpoint.dtd`, which is not public.

### Coverage

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-02-jacoco-coverage.png" alt="JaCoCo coverage report for fsgov-core" width="1145" height="222" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 9 · Coverage</span> JaCoCo report for <code class="ic">fsgov-core</code>: 97 percent instruction coverage and 88 percent branch coverage over 48 classes in four packages.</figcaption></figure>

JaCoCo 0.8.12 reports 171 of 6,100 instructions and 72 of 648 branches missed. The build enforces a floor of 85 percent line coverage and 70 percent branch coverage, so coverage is a gate rather than a statistic.

### A fixture with drift

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-03-posix-acl-fixture.png" alt="Terminal showing users, groups, setfacl commands and getfacl output for /srv/finance, /srv/audit and /srv/scratch" width="1092" height="770" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 10 · POSIX ACL fixture</span> The fixture on the runner's ext4 file system: users and governed groups, <code class="ic">/srv/finance</code>, <code class="ic">/srv/audit</code> and <code class="ic">/srv/scratch</code>, two drift entries (<code class="ic">user:carol:rwx</code> and <code class="ic">user:7777:r-x</code>), and the resulting <code class="ic">getfacl -p</code> output.</figcaption></figure>

Everything after this figure runs against a real file system, not a mock. The two drift entries are the cases a review is meant to find: carol holds a direct `rwx` grant on the finance share outside IdentityIQ, and the audit share carries an entry for uid 7777, which belongs to no account. The exports file is parsed but not loaded into the kernel.

### Inventory and effective access

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-04-inventory-parse-evaluate.png" alt="Terminal showing parsed getfacl blocks, parsed exports rules and effective access per account, locally and over NFSv3" width="820" height="1011" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 11 · Inventory and effective access</span> The collector inventory parsed by <code class="ic">GetfaclParser</code> and <code class="ic">ExportsParser</code>, and effective access from <code class="ic">AccessEvaluator</code>, locally and from NFSv3 client <code class="ic">backup01</code>, where the <code class="ic">ro</code> export removes write. The mode column comes from <code class="ic">stat</code>, whose group bits show the ACL mask.</figcaption></figure>

The evaluator answers the reviewer's question per account and path, with the reason. carol has `rwx` on `/srv/finance` locally through `user:carol:rwx masked by rwx`, and `r-x` from `backup01` because the export is read only. The mode reads 2770 rather than the 2750 that was set because, with an ACL present, the group bits show the mask.

### The change plan

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-05-change-plan.png" alt="Terminal showing ten ordered change plan steps and the encoded plan" width="628" height="621" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 12 · Change plan</span> <code class="ic">ChangePlanner</code> output for three requests (grant <code class="ic">fs_fin_rw</code> to alice, grant <code class="ic">fs_audit_ro</code> to carol, remove carol's direct entry on <code class="ic">/srv/finance</code>): ten steps with the revocation first, no warnings, and a <code class="ic">ChangePlanCodec</code> round trip of all ten steps.</figcaption></figure>

The ordering is the control. Revocations come first (ACL entries, then memberships), then group creation, ACL grants, explicit mask steps and membership grants. A request that the snapshot already satisfies yields no step. The command lines are a display form for reviewers only. The connector queues the structured `#fsgov-plan v1` steps and the host executor applies them; no command text is executed anywhere in the project.

### Evidence before remediation

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-06-certification-evidence-before.png" alt="Terminal showing the evidence bundle with MISSING, MATCH and EXCESS records and three hygiene findings" width="772" height="264" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 13 · Evidence before remediation</span> Two <code class="ic">MISSING</code> records, one <code class="ic">MATCH</code> and one <code class="ic">EXCESS</code> (carol's direct <code class="ic">rwx</code> on <code class="ic">/srv/finance</code>), with three hygiene findings: a dangling ACL entry for uid 7777, an empty governed group and a <code class="ic">no_root_squash</code> export.</figcaption></figure>

`AccessDiffer` compares what IdentityIQ asserts with what is on disk and classifies each account and path pair. The `EXCESS` record becomes a review item. The bundle is written in a canonical tab separated form with a SHA-256 digest, so the same inputs reproduce the same evidence. `OrphanDetector` reports findings that have no natural reviewer: here an entry for a uid with no account, a governed group with no effective members and an export that lets remote root act as local root.

### The plan applied

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-07-plan-applied-getfacl.png" alt="Terminal showing the plan steps run with sudo, getent group and getfacl after the change" width="516" height="838" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 14 · Plan applied</span> The display form of the plan run by the workflow on the disposable runner in place of a host executor, followed by <code class="ic">getent group</code> and <code class="ic">getfacl -p</code> showing the new group entries and default ACLs and no entry for carol on <code class="ic">/srv/finance</code>.</figcaption></figure>

The host executor is not part of the repository, so the workflow stands in for it on a runner that is thrown away afterwards. The figure is the read back, not the request: `fs_fin_rw` has alice, `fs_audit_ro` has carol, and `/srv/finance` no longer lists `user:carol`.

### Evidence after remediation

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-08-certification-evidence-after.png" alt="Terminal showing three MATCH records, two remaining findings and an empty replan" width="772" height="382" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 15 · Evidence after remediation</span> Evidence from a fresh inventory: three <code class="ic">MATCH</code> records and the two findings outside the requests. Planning the same requests again yields zero steps and reports seven already satisfied conditions.</figcaption></figure>

This is the closed loop. The revocation is proved by a new inventory, not inferred from the plan. The two findings that remain, the dangling entry for uid 7777 and the `no_root_squash` export, were not part of the requests and are still reported. Replanning returns an empty plan, which is the idempotency property the connector relies on.

### What part two does not show

No figure shows IdentityIQ or JBoss EAP; both need a licensed or running server that the capture workflow does not have. The IdentityIQ artifacts have not been validated against `sailpoint.dtd` or imported into a running IdentityIQ instance, the adapter has not been compiled against `identityiq.jar` in CI, and the JBoss CLI scripts have not been run against a server. The README treats the configuration as a reviewed starting point that must be imported and tested in a sandbox before any higher environment, and so does this post.

## What carries forward

- A control is stated as a check that can fail: `iato check` exits 1, the replan is empty or it is not.
- A removal is a claim until the system is read again. Figure 15 matters more than Figure 12.
- The limits are part of the evidence. Each repository states what CI cannot run, and the figures stop exactly there.

Source on GitHub: [IĀTŌ V2, Entra ID sign in for Debian](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2) and [IĀTŌ V3, IdentityIQ governance for legacy file shares](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V3).
