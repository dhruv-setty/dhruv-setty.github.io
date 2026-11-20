---
title: "From Intent to Evidence: Building IĀTŌ, Identity Controls That Leave Proof"
date: 2026-11-10
summary: CI captures for two components: a .NET 8 CLI rendering and validating SSSD idp-provider configuration for Entra ID sign-in on Debian, and a Java change planner and evidence library for IdentityIQ governance of POSIX ACL file shares.
---

## Context

Governing rule of the framework: an access claim shall count only when the system that holds the access demonstrates it. Two components are documented here, the Entra ID sign-in component (V2) and the legacy file share governance component (V3), exclusively through the figures their repositories publish.

Every figure was produced by a `captures.yml` workflow on an `ubuntu-24.04` GitHub runner. Each terminal figure is an `xterm` window on an Xvfb display running the commands shown, captured with ImageMagick; the printed output is retained beside it as a `.log` or `.txt` transcript. No figure is drawn by hand. A capture of an executed command is evidence in the same sense as a sign-in log; a diagram is not.

| Component | Implementation | Outside CI coverage |
|---|---|---|
| V2 | `iato`, a C# (.NET 8) CLI that configures Debian hosts to sign in Microsoft Entra ID users through the SSSD `idp` provider | A real tenant, `iato install` on a systemd host, `iato verify`, and the device code prompt at SSH login |
| V3 | IdentityIQ Legacy Filesystem Governance: a Java change planner, evidence library and IdentityIQ configuration for POSIX and ACL file shares | IdentityIQ itself and JBoss EAP; the configuration has not been imported into a running IdentityIQ instance |

## Design rationale

### Entra ID sign-in for Debian

Intent: only members of one Entra group shall log in; every login shall be an Entra sign-in subject to MFA and Conditional Access; a disabled account shall lose access at its next login. The CLI implements none of this directly. It renders, validates and installs SSSD configuration; SSSD 2.11.0 or later performs the sign-in through the OAuth 2.0 Device Authorization Grant. The design obligation is configuration that cannot drift into a weaker state.

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

- `register-app` shall obtain its Graph token only from `IATO_GRAPH_TOKEN` or `az account get-access-token`, and shall fail before any Graph request when neither is present.
- Files holding the client secret shall be created with mode 0600.
- The validator shall not depend on the `sssctl` rule set, which can lag new back ends. A non-zero exit status shall prevent `iato install` from starting SSSD on an invalid file.
- `--host` adds three checks to the file check: installed SSSD version (2.11.0 or later), presence of `libsss_idp.so`, and file mode. Debian 12 ships SSSD 2.8.2 and Debian 13 ships 2.10.1, neither with the `idp` provider; `iato install` therefore pins only the SSSD packages from forky (2.13) on those releases. Without the pin, the check shall fail closed.

### IdentityIQ governance of legacy file shares

Legacy file servers hold regulated records behind owner, group and mode bits, POSIX.1e ACLs and NFS export options that drift through manual change. The component places that access under IdentityIQ with an ordered, idempotent change plan, a separation of duties policy between finance and audit write access, and evidence that a revocation took effect on disk. Core logic resides in `fsgov-core`, a Java library with no IdentityIQ dependency, which is the part the runner can execute.

- Plan ordering: revocations first (ACL entries, then memberships), then group creation, ACL grants, explicit mask steps and membership grants. A request already satisfied by the snapshot shall yield no step.
- Command lines are a display form for reviewers only. The connector queues structured `#fsgov-plan v1` steps and the host executor applies them; no command text is executed anywhere in the component.
- `AccessDiffer` compares IdentityIQ assertions with on-disk state per account and path pair. Evidence bundles are written in a canonical tab separated form with a SHA-256 digest, so identical inputs reproduce identical evidence.
- `OrphanDetector` reports findings with no natural reviewer.
- Revocation shall be proved by a fresh inventory, not inferred from the plan.

## Results: Entra ID sign-in

### Command line

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-01-cli-help.png" alt="Terminal showing iato version, iato --help and iato register-app failing without a Graph token" width="746" height="330" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Command line</span> <code class="ic">iato version</code> prints 2.0.1; <code class="ic">iato --help</code> lists six subcommands. <code class="ic">iato register-app</code> with no <code class="ic">IATO_GRAPH_TOKEN</code> and no Azure CLI sign-in stops before any Graph request and exits with status 1.</figcaption></figure>

### Release build

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-02-dotnet-build.png" alt="Terminal showing dotnet build -c Release succeeding with one warning and no errors" width="1628" height="348" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Release build</span> <code class="ic">dotnet build -c Release</code> restores and builds <code class="ic">Iato</code> and <code class="ic">Iato.Tests</code> for <code class="ic">net8.0</code> with SDK 11.0.100: 0 errors, 1 warning, xUnit analyzer rule <code class="ic">xUnit2029</code> at line 19 of <code class="ic">SssdConfigTests.cs</code>.</figcaption></figure>

### Unit tests

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-03-dotnet-test.png" alt="Terminal listing ten passed xUnit tests" width="1388" height="430" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Unit tests</span> <code class="ic">dotnet test -c Release</code> with the normal console logger, each test listed by name. Total tests: 10; passed: 10.</figcaption></figure>

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

### Rendered sssd.conf

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-04-render-sssd-conf.png" alt="Terminal showing iato render and the rendered sssd.conf with mode 0600" width="988" height="944" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Rendered sssd.conf</span> <code class="ic">iato render</code> fills the embedded template from a placeholder <code class="ic">entra-app.env</code> and the group <code class="ic">linux-admins</code>; the file is created with mode 0600. <code class="ic">[domain/entra]</code> sets <code class="ic">id_provider = idp</code>, <code class="ic">idp_type = entra_id</code>, the tenant token and device authorization endpoints, the idmap range and <code class="ic">cache_credentials = false</code>.</figcaption></figure>

Identifiers in the figure are placeholders (`00000000-...` tenant, `11111111-...` client, `ci-placeholder` secret). No figure contacts a tenant.

### Configuration validation

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-05-check-config.png" alt="Terminal showing iato check passing a valid file and reporting five errors on a broken copy" width="1340" height="449" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · Configuration check</span> <code class="ic">iato check</code> reports the rendered file as ok. A copy is mutated with <code class="ic">sed</code>: <code class="ic">config_file_version</code> added, <code class="ic">idp_client_id</code> replaced by a placeholder, two endpoints changed to http. <code class="ic">iato check</code> then reports 5 errors and exits with status 1.</figcaption></figure>

Every mutation in the `diff` is detected: an unrendered placeholder, a key rejected by SSSD 2.13, two non-https endpoints, and a client ID that is not a GUID.

### Host check, Debian forky

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-06-host-check-forky.png" alt="Terminal showing iato check --host passing in a Debian forky container with SSSD 2.13.1-5" width="860" height="194" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 6 · Host check, Debian forky</span> <code class="ic">debian:forky</code> container with <code class="ic">sssd-common</code> and <code class="ic">sssd-idp</code> 2.13.1-5: <code class="ic">iato render</code> writes <code class="ic">/etc/sssd/sssd.conf</code> as root with mode 0600, and <code class="ic">iato check --host</code> reports it as ok.</figcaption></figure>

The same command runs in `ci.yml` on every push; the passing state is continuously reproduced, not captured once.

### Host check, Debian 13

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v2-07-host-check-trixie.png" alt="Terminal showing iato check --host failing in a Debian trixie container with SSSD 2.10.1" width="868" height="313" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 7 · Host check, Debian 13</span> <code class="ic">debian:trixie</code> container, <code class="ic">sssd-common</code> 2.10.1-2+b1, no <code class="ic">sssd-idp</code>. <code class="ic">iato check --host</code> reports that SSSD 2.10.1 has no <code class="ic">idp</code> provider and that <code class="ic">libsss_idp.so</code> is missing, and exits with status 1, as specified.</figcaption></figure>

## Results: file share governance

### Build and tests

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-01-maven-build-tests.png" alt="Terminal showing Maven verify with Surefire counts per test class and BUILD SUCCESS" width="684" height="498" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 8 · Build and unit tests</span> <code class="ic">mvn -B -ntp verify</code>: 78 tests in 14 classes of <code class="ic">fsgov-core</code> and 37 tests in 3 classes of <code class="ic">fsgov-config-validation</code>, no failures, errors or skips, BUILD SUCCESS.</figcaption></figure>

| Module | Test classes | Tests | Failures | Errors | Skipped |
|---|---|---|---|---|---|
| `fsgov-core` | 14 | 78 | 0 | 0 | 0 |
| `fsgov-config-validation` | 3 | 37 | 0 | 0 | 0 |
| Total | 17 | 115 | 0 | 0 | 0 |

The 37 configuration tests assert that every artifact parses and declares the `sailpoint.dtd` DOCTYPE, that every object reference and rule name resolves, that every `%%TOKEN%%` has a value, and that the repository contains no script sources.

### Coverage

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-02-jacoco-coverage.png" alt="JaCoCo coverage report for fsgov-core" width="1145" height="222" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 9 · Coverage</span> JaCoCo report for <code class="ic">fsgov-core</code>: 97 percent instruction coverage and 88 percent branch coverage over 48 classes in four packages.</figcaption></figure>

JaCoCo 0.8.12 reports 171 of 6,100 instructions and 72 of 648 branches missed. The build enforces a floor of 85 percent line coverage and 70 percent branch coverage; coverage is a gate, not a statistic.

### POSIX ACL fixture

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-03-posix-acl-fixture.png" alt="Terminal showing users, groups, setfacl commands and getfacl output for /srv/finance, /srv/audit and /srv/scratch" width="1092" height="770" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 10 · POSIX ACL fixture</span> Fixture on the runner's ext4 file system: users and governed groups, <code class="ic">/srv/finance</code>, <code class="ic">/srv/audit</code> and <code class="ic">/srv/scratch</code>, two drift entries (<code class="ic">user:carol:rwx</code> and <code class="ic">user:7777:r-x</code>), and the resulting <code class="ic">getfacl -p</code> output.</figcaption></figure>

All subsequent figures execute against a real file system, not a mock. Drift entries: a direct `rwx` grant to carol on the finance share outside IdentityIQ, and an entry on the audit share for uid 7777, which maps to no account. The exports file is parsed but not loaded into the kernel.

### Inventory and effective access

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-04-inventory-parse-evaluate.png" alt="Terminal showing parsed getfacl blocks, parsed exports rules and effective access per account, locally and over NFSv3" width="820" height="1011" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 11 · Inventory and effective access</span> Collector inventory parsed by <code class="ic">GetfaclParser</code> and <code class="ic">ExportsParser</code>, and effective access from <code class="ic">AccessEvaluator</code>, locally and from NFSv3 client <code class="ic">backup01</code>, where the <code class="ic">ro</code> export removes write. The mode column is taken from <code class="ic">stat</code>.</figcaption></figure>

carol holds `rwx` on `/srv/finance` locally through `user:carol:rwx masked by rwx`, and `r-x` from `backup01` under the read-only export. The mode reads 2770 rather than the 2750 that was set: with an ACL present, the group bits reflect the mask.

### Change plan

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-05-change-plan.png" alt="Terminal showing ten ordered change plan steps and the encoded plan" width="628" height="621" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 12 · Change plan</span> <code class="ic">ChangePlanner</code> output for three requests (grant <code class="ic">fs_fin_rw</code> to alice, grant <code class="ic">fs_audit_ro</code> to carol, remove carol's direct entry on <code class="ic">/srv/finance</code>): ten steps, revocation first, no warnings, and a <code class="ic">ChangePlanCodec</code> round trip of all ten steps.</figcaption></figure>

### Evidence before remediation

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-06-certification-evidence-before.png" alt="Terminal showing the evidence bundle with MISSING, MATCH and EXCESS records and three hygiene findings" width="772" height="264" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 13 · Evidence before remediation</span> Two <code class="ic">MISSING</code> records, one <code class="ic">MATCH</code> and one <code class="ic">EXCESS</code> (carol's direct <code class="ic">rwx</code> on <code class="ic">/srv/finance</code>), with three hygiene findings: a dangling ACL entry for uid 7777, an empty governed group and a <code class="ic">no_root_squash</code> export.</figcaption></figure>

The `EXCESS` record becomes a review item. The `OrphanDetector` findings are an entry for a uid with no account, a governed group with no effective members, and an export under which remote root acts as local root.

### Plan applied

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-07-plan-applied-getfacl.png" alt="Terminal showing the plan steps run with sudo, getent group and getfacl after the change" width="516" height="838" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 14 · Plan applied</span> The display form of the plan, run by the workflow on the disposable runner in place of a host executor, followed by <code class="ic">getent group</code> and <code class="ic">getfacl -p</code> showing the new group entries and default ACLs and no entry for carol on <code class="ic">/srv/finance</code>.</figcaption></figure>

The figure is the read-back, not the request: `fs_fin_rw` contains alice, `fs_audit_ro` contains carol, and `/srv/finance` no longer lists `user:carol`.

### Evidence after remediation

<figure class="cs-figure"><img src="/journal/from-intent-to-evidence-iato/v3-08-certification-evidence-after.png" alt="Terminal showing three MATCH records, two remaining findings and an empty replan" width="772" height="382" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 15 · Evidence after remediation</span> Evidence from a fresh inventory: three <code class="ic">MATCH</code> records and the two findings outside the requests. Replanning the same requests yields zero steps and reports seven already satisfied conditions.</figcaption></figure>

## Observations

- `register-app` fails before transmission, so a missing credential cannot produce a partially created app registration.
- The single build warning is an analyzer style rule in the test project (`Assert.DoesNotContain` in place of `Assert.Empty`), not a defect in the CLI, and is reported rather than suppressed.
- No tenant exists on the runner; `ApplicationRequestsExpectedPermissions` therefore verifies the Graph request body in a unit test in place of a capture against Entra ID.
- The Debian 13 failure (Figure 7) is the condition the forky pin exists to prevent; the check fails closed instead of starting a service that cannot enforce the intent.
- The 37 configuration tests are well-formedness and consistency checks, not validation against `sailpoint.dtd`, which is not public.
- Remediation closes the loop: the revocation is proved by a new inventory (Figure 15), not inferred from the plan (Figure 12). The remaining findings, the dangling uid 7777 entry and the `no_root_squash` export, were outside the requests and continue to be reported. The empty replan is the idempotency property on which the connector relies.
- Every control is expressed as a check that can fail: `iato check` exits 1, and the replan is empty or it is not.

## Limitations

- Entra ID sign-in: `iato register-app` against a real tenant, `iato install` on a systemd host, `iato verify`, and the device code prompt that `pam_sss` prints at SSH login are not captured, because CI has neither a tenant nor a systemd host. CI does not cover Debian 12, Debian 13 or sid hosts.
- The client secret is the only credential type the `idp` provider currently supports. A certificate credential is planned and not implemented.
- File share governance: no figure shows IdentityIQ or JBoss EAP; both require a licensed or running server that the capture workflow lacks. The IdentityIQ artifacts have not been validated against `sailpoint.dtd` or imported into a running IdentityIQ instance, the adapter has not been compiled against `identityiq.jar` in CI, and the JBoss CLI scripts have not been run against a server.
- The host executor is not part of the repository; the workflow substitutes for it on a runner that is discarded afterwards.
- The IdentityIQ configuration is a reviewed starting point. It shall be imported and tested in a sandbox before promotion to any higher environment.

Source: [Entra ID sign-in for Debian on GitHub](https://github.com/dhruv-setty/entra-id-debian-sssd) and [IdentityIQ legacy file share governance on GitHub](https://github.com/dhruv-setty/sailpoint-iiq-linux-fs-governance)
