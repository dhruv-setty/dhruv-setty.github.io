---
title: "Lifting SPDE-GMRF Fields: GPU Estimation and On-Device Forward Filtering"
date: 2024-01-09
summary: A walkthrough of the SPDE-GMRF repository through its captured figures: a sparse SPDE precision estimated on the host, a three-weight projector to the sensors, fill-in controlled by ordering, an int8 forward filter that tracks the float filter, and a CUDA path that compiles but has not run on a GPU.
---

## What the repository claims, and what it does not

The model has a heavy part and a light part. Estimating the spatial field and its parameters means factorising a large sparse precision matrix, which belongs on a GPU and can run every few seconds or minutes. Deciding the current behavioural mode means one small recursion per sample, which belongs on the device. The SPDE-GMRF repository implements that split as a tested reference: a Python model, a CUDA estimation path and a C99 int8 filter for Arm Cortex-M.

It is a system design with a tested reference implementation, not a benchmark. Before any figure, the boundary:

| Claim | Status in the repository |
|---|---|
| Python reference: mesh, FEM assembly, `Q(θ)`, sparse Cholesky, projector, estimation, float and int8 filters | Tested: 20 pytest tests pass |
| CUDA estimation with cuSPARSE and cuDSS | Compiles with nvcc 12.9 against cuDSS 0.7.1.6; not linked and not run, because CI has no GPU |
| int8 filter on Cortex-M4F | Bit-exact with the Python mirror under QEMU, with the portable kernel and with CMSIS-NN v8.0.0; not run on a physical target |
| GPU timings, cycles or latency per sample, accuracy on recorded drives | Not measured. A MAC count is not a latency |

Every figure below except the first was produced by the repository's captures workflow on an `ubuntu-24.04` runner, from the code in the repository. All data are simulated with fixed seeds.

## The pipeline

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/spde-pipeline.png" alt="Pipeline: FEM mesh feeds GPU estimation, which feeds a lift to sensor locations, which feeds an on-device forward filter on Arm Cortex-M, with a dashed loop back for periodic re-estimation" width="1043" height="524" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Heavy path and light path</span> The case study figure the repository publishes as its Figure 1. The mesh matrices <code class="ic">C</code> and <code class="ic">G</code> are assembled once. The GPU rebuilds <code class="ic">Q(θ)</code>, factorises it and returns <code class="ic">θ̂</code> and <code class="ic">x̂</code>, which are lifted to the sensors and quantised for the device. The figure names cuSOLVER for the factorisation; the repository uses cuDSS.</figcaption></figure>

The figure is the design, and the label on the green box is the one place it disagrees with the code. The README resolves it: cuSPARSE holds `Q` in CSR form and performs the sparse products, and cuDSS performs the SPD Cholesky factorisation, with the analysis phase run once and the refactorisation and solve phases run for each `θ`. The sparse Cholesky module of cuSOLVER is marked deprecated by NVIDIA, and `θ = (κ, τ)` has only two components, so it is optimised on the host. cuSOLVER is not used.

## The reference passes its own tests

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_pytest.png" alt="Terminal running pytest on the Python reference with 20 passed tests" width="1220" height="783" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · pytest run</span> The 20 tests in <code class="ic">python/tests/</code>, run with <code class="ic">CC=gcc</code> so that the C kernel cross-check runs: all 20 pass in 6.50 s. The printed lines show the estimates of <code class="ic">κ</code> and <code class="ic">τ</code>, the scrambled and RCM factor counts for seeds 0, 1 and 2, and the int8 against float agreement over 5,000 samples.</figcaption></figure>

Three printed lines carry the results the rest of this post relies on:

- Estimation: `κ̂ = 4.5744` against 4.7140 (relative error 3.0%) and `τ̂ = 0.001452` against 0.001496 (2.9%), using 177 numeric factorisations after 2 symbolic analyses. The symbolic analysis is reused, which is exactly the analysis-once, refactorise-per-`θ` pattern the cuDSS path follows.
- Fill-in: for seeds 0, 1 and 2 the scrambled order gives 45,258, 44,510 and 43,640 factor nonzeros, and reverse Cuthill-McKee gives 11,378 in each case.
- Filtering: int8 against float argmax agreement of 0.9966 over 5,000 samples, with 0 floor hits.

The test names also state the structural claims: the projector has three weights per row summing to one, the posterior precision stays sparse and local, the transition matrix keeps a direct calm-to-panic path, and the C kernel is bit-exact with the Python mirror.

## Counting the work before timing it

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_mac_table.png" alt="Terminal output of mac_table.py listing MACs per stage on the host and on the device" width="834" height="375" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Operation counts</span> Operation counts per stage from <code class="ic">python/tools/mac_table.py</code>, computed from the sparsity pattern of each matrix: the host stages per evaluation of <code class="ic">θ</code> on the 16 by 16 mesh and the 20 by 20 lattice, and the device stages per sample.</figcaption></figure>

| Stage | Matrix | nnz | MACs | Per |
|---|---|---|---|---|
| Cholesky of `Q`, RCM | `L` of `Q`, 16 by 16 mesh | 5,896 | 72,538 | `θ` |
| Cholesky, 20 by 20 lattice, RCM | `L` of `Q` | 11,378 | 174,362 | `θ` |
| Cholesky, 20 by 20 lattice, scrambled (seed 0) | `L` of `Q` | 45,258 | 3,877,939 | `θ` |
| Device, total per sample | `Aᵀ` (4 by 4, int8), emission, update | | 40 | sample |

The table makes the split quantitative without claiming a time. On the host, ordering alone changes the factorisation from 3,877,939 MACs to 174,362. On the device, the step costs 40 MACs per sample whatever the mesh size, and a test checks that for an 8 by 8 and a 16 by 16 mesh. The repository is explicit that no latency claim may be derived from these counts without a measurement on the target.

## The field and its estimate

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_field_estimate.png" alt="Three panels: sensor observations over the mesh, the simulated field, and the posterior mean with 64 route sites" width="2320" height="819" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Field, observations and posterior mean</span> <code class="ic">spdegmrf.export.run_pipeline</code> (seed 2026) on the 16 by 16 mesh over 1.5 km, n = 256. Left: the 200 sensor observations of the eighth replicate. Centre: the simulated field, <code class="ic">κ</code> = 4.714 and <code class="ic">τ</code> = 0.00150. Right: the posterior mean at <code class="ic">κ̂</code> = 4.574 and <code class="ic">τ̂</code> = 0.00145, with the 64 route sites coloured by their lifted offsets <code class="ic">P_dev x̂</code>, from -88.6 to 9.6 mm.</figcaption></figure>

The left panel is what the estimator sees: 200 noisy points with `σ` = 15 mm. The right panel is what it recovers, and the route sites are what the device receives. Lifting is a sparse projector `P`: each sensor reads the three corners of the triangle it falls in, so each row of `P` has three barycentric weights summing to one. `nnz(P)` is 600 for 200 sensors and `nnz(P_dev)` is 192 for 64 sites. The device never sees the mesh, only one int16 offset per site.

## The likelihood surface

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_loglik_surface.png" alt="Contour plot of the marginal log-likelihood over kappa and tau with the estimate and the true value marked" width="929" height="732" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · Marginal log-likelihood</span> <code class="ic">Estimator.loglik</code> on a 25 by 25 grid of <code class="ic">(κ, τ)</code>, relative to the grid maximum, with contours at -2, -5, -10 and -20. The 625 evaluations used 1,250 numeric factorisations and the 2 symbolic analyses made once. The cross is the Nelder-Mead estimate and the plus sign the simulation value.</figcaption></figure>

Each evaluation rebuilds the values of `Q(θ)` on a fixed sparsity pattern, factorises it, and reads `log|Q| = 2 Σ log L_ii` from the factor diagonal at no extra cost. The figure shows why that matters: 625 points cost 1,250 numeric factorisations and only 2 symbolic analyses. A surface like this is the workload the GPU path is designed for, and the reason the symbolic phase must be hoisted out of the loop.

## Sparsity, and what ordering does to it

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_sparsity.png" alt="Three sparsity patterns: Q on a 10 by 10 lattice, the Cholesky factor in scrambled order and after reverse Cuthill-McKee" width="2030" height="708" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 6 · Sparsity of Q and of its factor</span> Left: <code class="ic">Q</code> on the 10 by 10 lattice, 1,104 nonzeros, at most 13 per row. Centre and right: the Cholesky factor of <code class="ic">Q</code> on the 20 by 20 lattice after the seed 0 relabelling, 45,258 nonzeros, and after reverse Cuthill-McKee, 11,378 nonzeros.</figcaption></figure>

The SPDE precision for `α = 2` is `Q = τ² (κ⁴ C + 2κ² G + G C⁻¹ G)`, and its count per row stays fixed as the mesh grows. The factor is a different matter. The same matrix, factorised in a scrambled order, fills to roughly four times the nonzeros of the RCM order. That is why the README says the factorisation should use a fill-reducing ordering (reverse Cuthill-McKee, AMD or METIS nested dissection) before anything is moved to a GPU.

## Fill-in over 1,000 relabellings

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_fill_in_seeds.png" alt="Histogram of scrambled-order factor nonzeros over 1,000 seeds with lines for this repository, the case study value and RCM" width="1085" height="642" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 7 · Scrambled-order fill-in</span> Factor nonzeros on the 20 by 20 lattice for 1,000 uniform random relabellings (seeds 0 to 999): minimum 34,195, median 42,308, maximum 48,532. The case study count of 37,615 lies at the 2.5th percentile; seed 0 of this repository gives 45,258. Across the 1,000 seeds RCM gives 11,378 or 11,370.</figcaption></figure>

This figure settles a number. The earlier case study reported 37,615 nonzeros for a scrambled order; the repository's seed 0 gives 45,258. Rather than choose one, the workflow runs 1,000 relabellings and shows that 37,615 is a legitimate but unusual draw (2.5% of seeds give that many or fewer). The post uses the repository's figures: 45,258 scrambled and 11,378 after RCM. The README also records an open item: RCM gives 11,378 or 11,370 depending on the input labelling, 500 and 500 of 1,000 seeds in this run and 502 and 498 in an earlier one, and the cause of the variation between runs has not been established. Seeds 0, 1 and 2, which the tests use, gave 11,378 in every run.

## The forward filter, float and int8

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/plot_forward_filter.png" alt="Four stacked panels: two observation channels, simulated regime and int8 mode, float filter posterior, int8 filter belief" width="1803" height="1383" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 8 · Float and int8 forward filters</span> The data of <code class="ic">python/tests/test_forward_filter.py</code> (seed 7), first 600 of 5,000 samples. From the top: the two observation channels; the simulated regime and the int8 mode; the float forward filter posterior; and the int8 belief of <code class="ic">quant.Int8Filter</code>, dequantised as <code class="ic">(α + 128) / 255</code> and normalised. Over all 5,000 samples the argmax agreement is 99.66% and the mean absolute belief error is 0.0020.</figcaption></figure>

This is the light path. With four regimes the step is `α_t(k) ∝ b_k(y_t) Σ_j a_jk α_(t-1)(j)`, and the product `Aᵀ α_(t-1)` has the shape of a fully connected layer, so it runs as `arm_fully_connected_s8` when `HMM_USE_CMSIS_NN` is defined, or as a portable C99 kernel with identical integer semantics. The lower two panels are close to indistinguishable, which is the claim: quantising to int8 does not change the decision. The test also reports 0 floor hits, meaning the fixed-point rescale kept the belief from underflowing over all 5,000 samples. On the 600 committed firmware vectors the agreement is 0.9933, and under `qemu-arm -cpu cortex-m4` both kernels are bit-exact with the Python mirror. QEMU gives no cycle counts.

## The CUDA path compiles, and no more

<figure class="cs-figure"><img src="/journal/lifting-spde-gmrf-gpu-edge/terminal_nvcc.png" alt="Terminal compiling spde_gpu.cu with nvcc against cuDSS 0.7.1.6 successfully and against cuDSS 1.0.0.35 with eight errors" width="1172" height="392" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 9 · CUDA compile against two cuDSS releases</span> nvcc 12.9.86 compiles <code class="ic">gpu/src/spde_gpu.cu</code> against the cuDSS 0.7.1.6 headers. Against cuDSS 1.0.0.35 it stops with eight errors at lines 179 and 181, where <code class="ic">cudssMatrixCreateCsr</code> now takes an <code class="ic">offsetType</code> argument. Compile only: the object is not linked or run, because the runner has no GPU.</figcaption></figure>

It is the least flattering figure in the repository, and the right one to end on. It shows that the CUDA source is real and typechecks against one cuDSS release, and that an API change in the next release breaks it. It shows nothing about GPU performance. The README states the obligation plainly: the GPU path must be checked against `gpu/compare.py` on a GPU before any GPU result is reported.

## Where this leaves the design

- The heavy path is correct on the CPU reference, with ordering shown to dominate the cost.
- The light path is 40 MACs per sample, and the int8 filter agrees with the float filter on 99.66% of 5,000 simulated samples.
- The GPU estimation and the on-device timing are the two measurements still owed, and nothing above stands in for them.

Source on GitHub: [the SPDE-GMRF repository](https://github.com/whatheheckisthis/SPDE-GMRF).
