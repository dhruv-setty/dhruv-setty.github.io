---
title: "Hidden States: Modelling Driver Behaviour with CARLA, CUDA and a Microcontroller in the Loop"
date: 2023-12-12
summary: How a CARLA simulation, OpenCV and CUDA-accelerated R-CNN detection, and a microcontroller running a hidden Markov model replaced a laboratory of equipment for studying behavioural regime changes.
---

## Motivation

A driver's behaviour changes in two distinct ways. It moves between a small number of qualitative modes, such as calm, alert, high stress and panic, and it drifts gradually within each mode as fatigue accumulates and conditions change. A system intended to warn or intervene must distinguish a genuine change of mode from slow drift. If it cannot, it either misses the moment that matters or raises alarms that operators learn to ignore.

Studying this problem conventionally requires substantial equipment: an instrumented vehicle or driving simulator rig, physiological sensors, roadside cameras and an edge computer to process them. The motivation for this work was to establish whether the same question could be studied credibly with simulation and a single low-cost microcontroller.

## Objectives

1. Represent behaviour with two latent layers: a hidden Markov model (HMM) for discrete regime changes and a sparse Gaussian field for continuous drift.
2. Generate realistic, repeatable driving scenarios, including rare and dangerous ones, without physical testing.
3. Separate computationally heavy perception from the time-critical regime decision, and run each on hardware suited to it.
4. Execute the regime decision on a microcontroller (MCU) in real time, inside the simulation loop.

## Assumptions

- The behavioural modes can be represented by a small number of discrete states, four in this design.
- Given the regime and the field, observation noise is Gaussian.
- Perception does not need to complete within one control cycle. A detection that arrives slightly late is acceptable, provided the regime filter receives a timely summary of it.
- A simulated sensor stream is a sufficient proxy for early-stage model design. It is not a substitute for validation on recorded data.

## Architecture

The work is divided into a heavy path and a light path.

```
 +-------------------+     frames      +----------------------------+
 |  CARLA simulator  | --------------> |  OpenCV preprocessing      |
 |  scenarios, ego   |                 |  resize, normalise, ROI    |
 |  vehicle, sensors |                 +-------------+--------------+
 +---------^---------+                               |
           |                                         v
           |                           +----------------------------+
           |                           |  CUDA GPU (near time)      |
           |                           |  R-CNN object detection    |
           |                           |  feature extraction        |
           |                           +-------------+--------------+
           |                                         | compact feature
           |                                         | vector (UART)
           |                                         v
           |    regime estimate        +----------------------------+
           +-------------------------- |  MCU (hard real time)      |
              (closes the loop)        |  int8 HMM forward filter   |
                                       +----------------------------+
```

CARLA renders the scene and the camera streams. OpenCV prepares each frame. The GPU runs region-based convolutional neural network (R-CNN) detection and reduces each frame to a small feature vector. The MCU receives that vector and updates its belief over the four regimes. The estimate is returned to the simulation, so the scenario can respond to it.

## Why the GPU handles perception

R-CNN detection is expensive, irregular in cost and tolerant of small delays. It therefore belongs off the real-time path. CUDA allows the GPU to process detection in near time, in batches, while the regime filter continues to run at a fixed rate on the latest available features. The heavy path determines what the model sees; it does not determine when the model decides.

## Why a microcontroller rather than a Raspberry Pi

A Raspberry Pi was considered and rejected for the decision path.

| Consideration        | Raspberry Pi (Linux)            | Microcontroller (bare metal)      |
|----------------------|----------------------------------|-----------------------------------|
| Timing               | Scheduler jitter from the OS     | Deterministic, cycle-bounded loop |
| Workload fit         | Capacity largely unused          | Matches a 4 by 4 recursion        |
| Representativeness   | Unlike an embedded target        | The class of device that ships    |
| Power and cost       | Higher                           | Lower                             |

The forward step of the filter is one four by four matrix-vector product, four multiplications and a normalisation per sample:

```
 alpha_t(k)  is proportional to  b_k(y_t) * sum_j [ a_jk * alpha_(t-1)(j) ]

   previous belief --> [ A^T * alpha ] --> [ x emission b_k(y_t) ] --> normalise --> current belief
       (4 values)       int8 kernel          lifted field offsets       fixed point       argmax = mode
```

That product has the same shape as a fully connected layer, so it runs on an int8 kernel, with a fixed-point rescale to prevent the belief from underflowing. A general-purpose computer adds capacity the task does not use and timing behaviour the task cannot tolerate.

## Why no edge computing was required

An edge deployment answers a deployment question: where processing runs once sensors exist in the world. This work asked a modelling question: whether the two-layer model detects regime changes correctly and within a time budget. CARLA supplied the sensors, the GPU workstation supplied perception, and the MCU supplied the time-critical decision. Each element an edge node would have provided was already present in the loop.

```
 Conventional study                         This approach
 ------------------                         -------------
 instrumented vehicle or rig      --->      CARLA scenarios
 physiological and road sensors   --->      simulated camera and vehicle signals
 edge computer for perception     --->      CUDA GPU workstation
 embedded decision unit           --->      MCU in the simulation loop
```

## The model

The regime chain moves through a transition matrix. Most probability remains on staying in a regime or moving to a neighbouring one, but a direct path from calm to panic is retained, because the most important events have no gradual build-up. The continuous field is a Gaussian Markov random field obtained through the SPDE approach of Lindgren, Rue and Lindström, which gives a sparse precision matrix whose nonzeros per row remain fixed as the mesh grows. Inference alternates: given the field, the regimes are an ordinary HMM; given the regimes, the field is Gaussian with a precision that remains sparse, so one sparse Cholesky factorisation provides its mean and the log-determinant for the likelihood.

## Model in detail

<p>Human behaviour does two things at once: it jumps between qualitative modes, and it drifts slowly inside them. A hidden Markov model captures the jumps. A Gaussian Markov random field captures the drift. Joined together, and kept sparse through the SPDE approach, the model stays small enough to filter in real time.</p>

<figure class="cs-figure"><img src="/case-studies/hmm-graphical-model.png" alt="Graphical model: a chain of discrete regimes S and a chain of continuous field values x both feed each observation y" width="1138" height="411" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Two latent layers, one observation</span> The regime chain <code class="ic">S_t</code> moves through the transition matrix <code class="ic">A</code>. The field <code class="ic">x_t</code> is a Gaussian Markov structure with precision <code class="ic">Q(θ)</code>. Each observation depends on both: <code class="ic">y_t = μ_S + H x_t + ε_t</code>, with noise <code class="ic">ε_t ~ N(0, Σ_S)</code> set by the current regime. </figcaption></figure>

### Why a plain HMM is not enough

<p> A standard HMM assumes that, given the regime, observations are independent draws from a fixed distribution. Behavioural signals break that assumption. Fatigue builds over a drive, environmental pressure rises and falls, and nearby sensors move together. Forcing that slow variation into discrete states either needs far more states than the problem has meaning for, or it shows up as spurious regime switches. Neither helps an interface decide when to escalate. </p>
<p> The fix is to give the model a second, continuous latent layer. The regimes stay few and interpretable, and the field absorbs the gradual drift, the spatial proximity and the non-stationary noise around them. </p>

### The HMM backbone

<figure class="cs-figure"><img src="/case-studies/hmm-regimes.png" alt="Four regimes in a row, calm, alert, high-stress and panic, with self-transitions, transitions between neighbours, and a dashed direct jump from calm to panic" width="1138" height="419" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Regimes and transitions</span> Each regime has its own emission <code class="ic">N(μ_k + H x_t, Σ_k)</code>. Most mass sits on self-transitions and neighbours, but the model keeps a direct path such as <code class="ic">a_14</code> from calm to panic, because the moments that matter most are the ones with no gradual build-up. </figcaption></figure>

### Keeping the field sparse with SPDE

<p> A Gaussian field with a Matérn covariance is the natural choice for smooth variation, but its covariance matrix is dense, and every likelihood evaluation would cost a dense factorisation. The SPDE approach of Lindgren, Rue and Lindström replaces it. A Matérn field is the solution of <code class="ic">(κ² − Δ)^(α/2) (τ x) = W</code>, driven by white noise <code class="ic">W</code>. Solving that equation with finite elements gives a Gaussian Markov random field whose precision is sparse. For <code class="ic">α = 2</code>, <code class="ic">Q = τ² (κ⁴ C + 2κ² G + G C⁻¹ G)</code>, where <code class="ic">C</code> is the lumped mass matrix and <code class="ic">G</code> the stiffness matrix. </p>
<figure class="cs-figure"><img src="/case-studies/hmm-sparse-precision.png" alt="Two matrix patterns for a 10 by 10 lattice: the dense covariance fills the whole square, the SPDE precision has a few narrow bands" width="919" height="491" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Dense covariance against sparse precision</span> Computed on a 10 by 10 lattice with <code class="ic">n = 100</code>. The covariance has 10,000 entries. The precision has 1,104 nonzeros, at most 13 per row, and that count per row stays fixed as the mesh grows. The parameter <code class="ic">κ</code> sets the range, about <code class="ic">√(8ν)/κ</code> with <code class="ic">ν = α − d/2</code>, and <code class="ic">τ</code> sets the variance. </figcaption></figure>

### Joint inference

<p> Exact inference in a switching model is out of reach: the posterior over the field is a mixture of <code class="ic">K^T</code> Gaussians, one for every regime path. The model is split instead. Given the field, the regimes are an ordinary HMM, and forward filtering with backward sampling costs <code class="ic">O(TK²)</code>. Given the regimes, the field is Gaussian with precision <code class="ic">Q + Hᵀ D_S H</code>, which is still sparse, so one sparse Cholesky factorisation gives its mean and a sample. </p>
<figure class="cs-figure"><img src="/case-studies/hmm-inference-loop.png" alt="Two boxes exchanging estimates, a forward filter for the regimes and a Gaussian field update, both feeding a hyperparameter update" width="973" height="428" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · The inference loop</span> The two steps alternate, and the hyperparameters <code class="ic">θ = (A, μ_k, Σ_k, κ, τ)</code> are updated from the joint likelihood by EM or a Laplace step. The same Cholesky factor <code class="ic">L</code> that solves for the field gives <code class="ic">log|Q| = 2 Σ log L_ii</code>, so the likelihood costs no extra factorisation. </figcaption></figure>

### What the model buys

<p> Few, meaningful regimes that map directly onto interface states and escalation logic. A continuous layer that explains slow drift instead of mislabelling it as a regime change. And a cost per step that grows with the number of nonzeros in <code class="ic">Q</code>, not with the square of the field size. </p>

## Outcomes

- A closed simulation loop in which perception, field estimation and regime filtering run on separate hardware, each matched to its workload.
- A regime filter small enough for a microcontroller, with a per-sample cost set by the number of regimes rather than the size of the field.
- A method for studying rare and dangerous scenarios repeatably, without physical risk or laboratory equipment.

## Limitations

This is a model and system design, not a measured result. The sparsity figures in this entry and in the companion entry on lifting SPDE-GMRF fields are computed from real lattice precisions and real factorisations, but the regimes, transition probabilities and emission parameters are illustrative and have not been fitted to recorded driving data. Detection accuracy, end-to-end latency and the agreement of the int8 filter with a floating-point reference remain to be measured, and simulated behaviour must be validated against real behaviour before any conclusion is drawn about drivers.

## Further reading

- [Lindgren, Rue and Lindström, An explicit link between Gaussian fields and Gaussian Markov random fields: the SPDE approach](https://doi.org/10.1111/j.1467-9868.2011.00777.x)
- [Hidden Markov model overview](https://en.wikipedia.org/wiki/Hidden_Markov_model)
- The companion entry, [Lifting SPDE-GMRF Fields: GPU Estimation and On-Device Forward Filtering](/blog/lifting-spde-gmrf-gpu-edge/)
