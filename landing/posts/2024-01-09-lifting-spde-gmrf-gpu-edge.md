---
title: "Lifting SPDE-GMRF Fields: GPU Estimation and On-Device Forward Filtering"
date: 2024-01-09
summary: SPDE precision Q(θ) with sparse Cholesky on the host (cuSPARSE, cuDSS), barycentric projector to sensor sites, C99 int8 forward filter for Cortex-M (portable or CMSIS-NN). RCM reduces factor nnz from 45,258 to 11,378; CUDA compiles, never run on a GPU.
---

## Context

The workload partitions into a heavy path and a light path. Field and hyperparameter estimation requires repeated factorisation of a large sparse precision matrix and shall execute on a GPU at an interval of seconds to minutes. Regime decoding requires one small recursion per sample and shall execute on the device.

The SPDE-GMRF repository implements the partition as a tested reference: a Python model, a CUDA estimation path and a C99 int8 filter for Arm Cortex-M. It is a system design with a reference implementation, not a benchmark. Figures 2 to 9 were produced by the captures workflow on an `ubuntu-24.04` runner from the committed code. All data are simulated with fixed seeds.

| Claim | Status in the repository |
|---|---|
| Python reference: mesh, FEM assembly, `Q(θ)`, sparse Cholesky, projector, estimation, float and int8 filters | Tested: 20 pytest tests pass |
| CUDA estimation with cuSPARSE and cuDSS | Compiles with nvcc 12.9 against cuDSS 0.7.1.6; not linked and not run, because CI has no GPU |
| int8 filter on Cortex-M4F | Bit-exact with the Python mirror under QEMU, with the portable kernel and with CMSIS-NN v8.0.0; not run on a physical target |
| GPU timings, cycles or latency per sample, accuracy on recorded drives | Not measured. A MAC count is not a latency |

## Design rationale

### Partition

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/spde-pipeline.png" alt="Pipeline: FEM mesh feeds GPU estimation, which feeds a lift to sensor locations, which feeds an on-device forward filter on Arm Cortex-M, with a dashed loop back for periodic re-estimation" width="1043" height="524" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Heavy path and light path</span> Case study figure, published by the repository as its Figure 1. <code class="ic">C</code> and <code class="ic">G</code> are assembled once; the GPU rebuilds and factorises <code class="ic">Q(θ)</code> and returns <code class="ic">θ̂</code> and <code class="ic">x̂</code> for lifting and quantisation. The figure names cuSOLVER for the factorisation; the repository uses cuDSS.</figcaption></figure>

cuSPARSE holds `Q` in CSR and performs the sparse products; cuDSS performs the SPD Cholesky factorisation, with the analysis phase executed once and the refactorisation and solve phases executed per `θ`. The cuSOLVER sparse Cholesky module is deprecated by NVIDIA and is not used. `θ = (κ, τ)` has two components and is optimised on the host.

### Precision structure and ordering

The SPDE precision for `α = 2` is `Q = τ² (κ⁴ C + 2κ² G + G C⁻¹ G)`; its per-row nonzero count is invariant in mesh size, whereas Cholesky fill-in is ordering dependent. The factorisation shall use a fill-reducing ordering (reverse Cuthill-McKee, AMD or METIS nested dissection) before any port to the GPU. The symbolic phase shall be hoisted out of the likelihood loop.

### Lifting

The projector `P` is sparse: each sensor row holds the three barycentric weights of its enclosing triangle, summing to one. `nnz(P)` is 600 for 200 sensors; `nnz(P_dev)` is 192 for 64 sites. The device receives one int16 offset per site and never the mesh.

### Device recursion

With K = 4, the step is `α_t(k) ∝ b_k(y_t) Σ_j a_jk α_(t-1)(j)`. `Aᵀ α_(t-1)` has fully connected layer shape and executes as `arm_fully_connected_s8` when `HMM_USE_CMSIS_NN` is defined, otherwise as a portable C99 kernel with identical integer semantics.

## Results

### Reference test suite

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_pytest.png" alt="Terminal running pytest on the Python reference with 20 passed tests" width="1220" height="783" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · pytest run</span> 20 tests in <code class="ic">python/tests/</code>, run with <code class="ic">CC=gcc</code> to enable the C kernel cross-check; 20 pass in 6.50 s. Printed lines: estimates of <code class="ic">κ</code> and <code class="ic">τ</code>, factor counts for seeds 0, 1 and 2, int8 against float agreement.</figcaption></figure>

- Estimation: `κ̂ = 4.5744` against 4.7140 (relative error 3.0%), `τ̂ = 0.001452` against 0.001496 (2.9%); 177 numeric factorisations after 2 symbolic analyses, the same analyse-once, refactorise-per-`θ` pattern as the cuDSS path.
- Fill-in: scrambled order 45,258, 44,510 and 43,640 factor nonzeros for seeds 0, 1 and 2; reverse Cuthill-McKee 11,378 in each case.
- Filtering: int8 against float argmax agreement 0.9966 over 5,000 samples, 0 floor hits.

The suite asserts the structural invariants: three projector weights per row summing to one, sparse and local posterior precision, a retained direct calm-to-panic transition, and bit-exactness of the C kernel with the Python mirror.

### Operation counts

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_mac_table.png" alt="Terminal output of mac_table.py listing MACs per stage on the host and on the device" width="834" height="375" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Operation counts</span> <code class="ic">python/tools/mac_table.py</code>, computed from each sparsity pattern: host stages per evaluation of <code class="ic">θ</code> on the 16 by 16 mesh and the 20 by 20 lattice; device stages per sample.</figcaption></figure>

| Stage | Matrix | nnz | MACs | Per |
|---|---|---|---|---|
| Cholesky of `Q`, RCM | `L` of `Q`, 16 by 16 mesh | 5,896 | 72,538 | `θ` |
| Cholesky, 20 by 20 lattice, RCM | `L` of `Q` | 11,378 | 174,362 | `θ` |
| Cholesky, 20 by 20 lattice, scrambled (seed 0) | `L` of `Q` | 45,258 | 3,877,939 | `θ` |
| Device, total per sample | `Aᵀ` (4 by 4, int8), emission, update | | 40 | sample |

Device cost is 40 MACs per sample independent of mesh size; a test asserts this for 8 by 8 and 16 by 16 meshes.

### Field estimate

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_field_estimate.png" alt="Three panels: sensor observations over the mesh, the simulated field, and the posterior mean with 64 route sites" width="2320" height="819" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Field, observations and posterior mean</span> <code class="ic">spdegmrf.export.run_pipeline</code> (seed 2026), 16 by 16 mesh over 1.5 km, n = 256. Left: 200 sensor observations of the eighth replicate, <code class="ic">σ</code> = 15 mm. Centre: simulated field, <code class="ic">κ</code> = 4.714, <code class="ic">τ</code> = 0.00150. Right: posterior mean at <code class="ic">κ̂</code> = 4.574, <code class="ic">τ̂</code> = 0.00145, with 64 route sites coloured by <code class="ic">P_dev x̂</code>, from -88.6 to 9.6 mm.</figcaption></figure>

### Marginal likelihood

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_loglik_surface.png" alt="Contour plot of the marginal log-likelihood over kappa and tau with the estimate and the true value marked" width="929" height="732" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · Marginal log-likelihood</span> <code class="ic">Estimator.loglik</code> on a 25 by 25 grid of <code class="ic">(κ, τ)</code>, relative to the grid maximum, contours at -2, -5, -10 and -20. Cross: Nelder-Mead estimate. Plus sign: simulation value.</figcaption></figure>

Each evaluation rebuilds the values of `Q(θ)` on a fixed sparsity pattern, factorises, and reads `log|Q| = 2 Σ log L_ii` from the factor diagonal. 625 evaluations required 1,250 numeric factorisations and 2 symbolic analyses.

### Sparsity

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_sparsity.png" alt="Three sparsity patterns: Q on a 10 by 10 lattice, the Cholesky factor in scrambled order and after reverse Cuthill-McKee" width="2030" height="708" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 6 · Sparsity of Q and of its factor</span> Left: <code class="ic">Q</code> on the 10 by 10 lattice, 1,104 nonzeros, at most 13 per row. Centre and right: Cholesky factor of <code class="ic">Q</code> on the 20 by 20 lattice after the seed 0 relabelling, 45,258 nonzeros, and after reverse Cuthill-McKee, 11,378 nonzeros.</figcaption></figure>

### Fill-in distribution

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_fill_in_seeds.png" alt="Histogram of scrambled-order factor nonzeros over 1,000 seeds with lines for this repository, the case study value and RCM" width="1085" height="642" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 7 · Scrambled-order fill-in</span> Factor nonzeros on the 20 by 20 lattice for 1,000 uniform random relabellings (seeds 0 to 999): minimum 34,195, median 42,308, maximum 48,532. Marked: case study count 37,615 (2.5th percentile), repository seed 0 at 45,258, and RCM at 11,378 or 11,370.</figcaption></figure>

### Forward filters

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_forward_filter.png" alt="Four stacked panels: two observation channels, simulated regime and int8 mode, float filter posterior, int8 filter belief" width="1803" height="1383" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 8 · Float and int8 forward filters</span> Data of <code class="ic">python/tests/test_forward_filter.py</code> (seed 7), first 600 of 5,000 samples. Panels: observation channels; simulated regime and int8 mode; float forward posterior; int8 belief of <code class="ic">quant.Int8Filter</code>, dequantised as <code class="ic">(α + 128) / 255</code> and normalised.</figcaption></figure>

| Metric | Value |
|---|---|
| Argmax agreement, 5,000 samples | 99.66% |
| Mean absolute belief error | 0.0020 |
| Floor hits | 0 |
| Agreement, 600 committed firmware vectors | 0.9933 |
| `qemu-arm -cpu cortex-m4`, portable and CMSIS-NN kernels | Bit-exact with the Python mirror |

### CUDA compilation

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_nvcc.png" alt="Terminal compiling spde_gpu.cu with nvcc against cuDSS 0.7.1.6 successfully and against cuDSS 1.0.0.35 with eight errors" width="1172" height="392" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 9 · CUDA compile against two cuDSS releases</span> nvcc 12.9.86 compiles <code class="ic">gpu/src/spde_gpu.cu</code> against the cuDSS 0.7.1.6 headers. Against cuDSS 1.0.0.35 it fails with eight errors at lines 179 and 181, where <code class="ic">cudssMatrixCreateCsr</code> takes an additional <code class="ic">offsetType</code> argument.</figcaption></figure>

## Observations

- Ordering dominates host cost: RCM reduces the 20 by 20 lattice factorisation from 3,877,939 MACs to 174,362, and the scrambled factor carries roughly four times the RCM nonzeros.
- The likelihood surface is the target GPU workload; the 1,250 to 2 ratio of numeric factorisations to symbolic analyses confirms that symbolic reuse is mandatory.
- The case study scrambled count of 37,615 is a valid but atypical draw: 2.5% of the 1,000 relabellings yield that many nonzeros or fewer. This post uses the repository values, 45,258 scrambled and 11,378 after RCM.
- int8 quantisation does not alter the MAP decision; the lower two panels of Figure 8 are indistinguishable at plot scale.
- The CUDA source typechecks against cuDSS 0.7.1.6 and is broken by the cuDSS 1.0.0.35 API change. Figure 9 establishes nothing about GPU performance.

## Limitations

- The CUDA object is compiled only, not linked and never run on a GPU. Before any GPU result is reported, the GPU path shall be checked against `gpu/compare.py` on a GPU.
- No latency claim shall be derived from MAC counts without a measurement on the target. QEMU provides no cycle counts.
- RCM yields 11,378 or 11,370 nonzeros depending on input labelling: 500 and 500 of 1,000 seeds in this run, 502 and 498 in an earlier run. The cause of the inter-run variation has not been established. Seeds 0, 1 and 2, used by the tests, gave 11,378 in every run.
- GPU estimation and on-device timing remain unmeasured; no result above substitutes for either.

Source: [SPDE-GMRF lane perception repository on GitHub](https://github.com/dhruv-setty/split-spde-gmrf-inference-for-lane-perception)
