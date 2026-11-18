---
title: "Lifting SPDE-GMRF Fields: GPU Estimation and On-Device Forward Filtering"
date: 2024-01-09
summary: Sparse precision factorised on the GPU with cuSPARSE and cuSOLVER, and an int8 forward filter on Arm Cortex-M via CMSIS-NN.
---

## Motivation

The behavioural model described in <a href="/blog/hidden-states-behavioural-time-series/">Hidden States</a> has a heavy part and a light part. Estimating the spatial field and its parameters means factorising large sparse precision matrices, which belongs on a GPU. Deciding the current behavioural mode means one small recursion per sample, which belongs on the device. Splitting them is how high-dimensional inference stays inside a real-time latency budget.

<figure class="cs-figure"><img src="/case-studies/spde-pipeline.png" alt="Pipeline: FEM mesh feeds GPU estimation, which feeds a lift to sensor locations, which feeds an on-device forward filter on Arm Cortex-M, with a dashed loop back for periodic re-estimation" width="1043" height="524" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Heavy path and light path</span> The mesh matrices <code class="ic">C</code> and <code class="ic">G</code> are assembled once. The GPU rebuilds <code class="ic">Q(θ)</code>, factorises it and returns <code class="ic">θ̂</code> and the field estimate <code class="ic">x̂</code>. Those are lifted to the sensor locations and quantised for the device, which runs the forward filter on every sample. Re-estimation runs periodically, off the latency path. </figcaption></figure>

## Method

### Lifting the field to the sensors

<p> The field lives on mesh nodes, but the signals arrive at sensor locations. Lifting maps one to the other with a sparse projector <code class="ic">P</code>, so the observation model becomes <code class="ic">y = μ_S + H P x + ε</code>. Because the finite elements are piecewise linear, each sensor reads from the three corners of the triangle it falls in, and each row of <code class="ic">P</code> has three nonzeros. </p>
<figure class="cs-figure"><img src="/case-studies/spde-lifting.png" alt="Triangular mesh with one shaded triangle; a sensor point inside it connects to the three corner nodes, with barycentric weights" width="1339" height="531" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · One sensor, three weights</span> The field at sensor <code class="ic">s</code> is <code class="ic">w_i x_i + w_j x_j + w_k x_k</code>, with barycentric weights that sum to one. The posterior precision <code class="ic">Q + Pᵀ Hᵀ D_S H P</code> therefore stays sparse: lifting adds only local couplings between nodes that share a sensor. </figcaption></figure>

### Parameter estimation on the GPU

<p> Every evaluation of the likelihood for a candidate <code class="ic">θ = (κ, τ)</code> rebuilds <code class="ic">Q(θ)</code> from the fixed <code class="ic">C</code> and <code class="ic">G</code>, factorises it, and reads the log-determinant from the diagonal of the factor. The sparsity pattern never changes, only the values, so the symbolic analysis is done once and reused. cuSPARSE handles the sparse assembly and the sparse matrix-vector products, and cuSOLVER handles the sparse Cholesky factorisation and solves. NVIDIA now marks the sparse cuSOLVER module as deprecated, so a new build would move the factorisation to cuDSS and keep the rest of the design unchanged. </p>
<figure class="cs-figure"><img src="/case-studies/spde-fill-in.png" alt="Two Cholesky factor patterns of the same matrix: in mesh order the lower triangle fills heavily, after reverse Cuthill-McKee reordering the factor is a narrow band" width="868" height="521" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Ordering decides the cost</span> Computed on a 20 by 20 lattice, <code class="ic">n = 400</code>, where <code class="ic">Q</code> has 4,804 nonzeros. With the scrambled node order a mesh generator produces, the Cholesky factor has 37,615 nonzeros. After reverse Cuthill-McKee reordering it has 11,378, about 70% fewer. cuSOLVER's sparse Cholesky takes a reordering option for this reason, including reverse Cuthill-McKee, AMD and METIS nested dissection. </figcaption></figure>

### Forward filtering on the device

<p> Once the field is estimated, the device does not need it in full. It needs the lifted offsets <code class="ic">P x̂</code> for its own sensors and the transition matrix <code class="ic">A</code>. With four regimes, the forward step is <code class="ic">α_t(k) ∝ b_k(y_t) Σ_j a_jk α_(t−1)(j)</code>: one 4 by 4 matrix-vector product, four multiplies and a normalisation per sample. </p>
<figure class="cs-figure"><img src="/case-studies/spde-forward-filter.png" alt="Forward filter recursion: previous belief goes through a CMSIS-NN fully connected int8 kernel, is multiplied by the emission likelihoods, normalised, and becomes the current belief whose largest entry is the mode" width="1137" height="503" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · The per-sample recursion</span> The product <code class="ic">Aᵀ α_(t−1)</code> has the same shape as a fully connected layer, so it runs on the int8 fully connected kernel in CMSIS-NN. The emission term uses the lifted offsets, and a fixed-point rescale keeps the belief normalised so it never underflows. The largest entry of <code class="ic">α_t</code> is the current behavioural mode, evaluated locally with no round trip to the GPU. </figcaption></figure>

## Outcomes

<p> The expensive work, factorising a large sparse precision, depends only on how fast the environment changes, so it can run every few seconds or minutes. The cheap work depends on every sample, and its cost is fixed by the number of regimes, not by the size of the field. Each side runs on the hardware that fits it. </p>

## Limitations

<p> This is a system design, not a benchmark. Figure 3 is computed from a real lattice precision and a real Cholesky factorisation, but no GPU timings, device latencies or quantisation error figures have been measured yet. The int8 forward filter in particular needs its accuracy checked against a floating-point reference before any latency claim is made. </p>

## References

<ul class="cs-refs">
<li><a href="https://doi.org/10.1111/j.1467-9868.2011.00777.x">Lindgren, Rue and Lindström, An explicit link between Gaussian fields and Gaussian Markov random fields: the SPDE approach</a></li>
<li><a href="https://docs.nvidia.com/cuda/cusolver/">NVIDIA cuSOLVER documentation</a></li>
<li><a href="https://docs.nvidia.com/cuda/cudss/">NVIDIA cuDSS documentation</a></li>
<li><a href="https://docs.nvidia.com/cuda/cusparse/">NVIDIA cuSPARSE documentation</a></li>
<li><a href="https://github.com/ARM-software/CMSIS-NN">Arm CMSIS-NN</a></li>
</ul>
