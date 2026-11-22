---
title: "Hidden States: Modelling Driver Behaviour with Regimes, Drift and a Forward Filter"
date: 2023-12-12
summary: Switching HMM over four behavioural regimes coupled to a GMRF drift field with sparse precision Q(θ); simulated int8 forward filter, 99.66% argmax agreement with the float filter over 5,000 samples, 40 MACs per sample.
---

## Context

The observation model takes two channels from a dashboard-mounted lane detector: lateral lane offset and a Standard Deviation of Lane Position (SDLP) window, both in millimetres. The latent process is non-stationary in two senses: discrete switching between qualitative regimes, and slow drift within a regime. The estimator shall discriminate a regime change from within-regime drift; failure in either direction yields missed detections or alarm fatigue.

The model resides in the SPDE-GMRF repository. Figures 1 to 3 are model figures from the case study, retained in an earlier revision of the repository. Figure 4 is a CI capture from the current code. All data are simulated with fixed seeds; transition and emission parameters are illustrative and have not been fitted to recorded drives.

| Layer | Representation |
|---|---|
| Discrete | HMM over calm, alert, high stress and panic, K = 4 |
| Continuous | Gaussian field with sparse precision `Q(θ)` |
| Observations | Lateral lane offset and an SDLP window, both in millimetres |

## Design rationale

### Two latent layers

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-graphical-model.png" alt="Graphical model with a chain of discrete regimes on top, observed signals in the middle and a chain of continuous field states below" width="1138" height="411" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Two latent layers, one observation</span> Regime chain <code class="ic">S_t</code> under transition matrix <code class="ic">A</code>; field <code class="ic">x_t</code> with precision <code class="ic">Q(θ)</code>. Observation <code class="ic">y_t = μ_S + H x_t + ε_t</code>, with <code class="ic">ε_t ~ N(0, Σ_S)</code> conditioned on the current regime.</figcaption></figure>

A plain HMM assumes conditionally independent emissions given the regime. Fatigue accumulation and varying conditions violate that assumption; absorbing the drift into the discrete layer either inflates K beyond the semantically meaningful states or produces spurious regime switches. The continuous layer carries the drift so that K remains 4 and each regime remains interpretable. The field enters the lateral offset channel only, through the lifted offset of the current site.

### Direct calm-to-panic transition

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-regimes.png" alt="Four regime states, calm, alert, high-stress and panic, with self-transitions, neighbour transitions and a dashed direct path from calm to panic" width="1138" height="419" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Regimes and transitions</span> Per-regime emission <code class="ic">N(μ_k + H x_t, Σ_k)</code>. Mass concentrates on self-transitions and nearest neighbours; the dashed arc is the direct transition <code class="ic">a_14</code>.</figcaption></figure>

`a_14` exists because onset of the critical regime is not preceded by a gradual build-up. It is small by construction and is therefore the weight most exposed to int8 rounding to zero, which would render the transition unreachable for the filter. Requirement: the int8 model shall retain a nonzero `a_14` after quantisation. `test_transition_matrix_keeps_direct_calm_to_panic` checks the requirement.

### Inference decomposition

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-inference-loop.png" alt="Two boxes, forward filter and backward sample on the left and Gaussian field update on the right, exchanging the regime path and the field estimate, both feeding a hyperparameter box below" width="973" height="428" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · The inference loop</span> Conditioned on the field, the regimes form an HMM filtered in <code class="ic">O(TK²)</code>, K = 4. Conditioned on the regimes, the field is Gaussian with sparse precision, solved by one sparse Cholesky factorisation. <code class="ic">θ = (A, μ_k, Σ_k, κ, τ)</code> is updated from the joint likelihood, with <code class="ic">log|Q| = 2 Σ log L_ii</code> taken from the same factor.</figcaption></figure>

The decomposition places the sparse factorisation on the field side, where it executes periodically, and reduces the per-sample path to a 4 by 4 recursion. Implemented: field-side estimation of `κ` and `τ` with `log|Q|` read from the factor, and the forward filter.

## Results

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/plot_forward_filter.png" alt="Four stacked panels over 600 samples: lateral offset and SDLP observations, simulated regime against int8 mode, float filter posterior, int8 filter belief" width="1803" height="1383" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Observations, regimes and filter beliefs</span> Data of <code class="ic">python/tests/test_forward_filter.py</code> (seed 7), first 600 of 5,000 samples. Panels: observation channels; simulated regime and int8 mode (offset for visibility); float forward posterior; int8 belief, dequantised as <code class="ic">(α + 128) / 255</code> and normalised.</figcaption></figure>

| Metric (5,000 samples) | Value |
|---|---|
| int8 against float argmax agreement | 99.66% |
| Mean absolute belief error | 0.0020 |
| Maximum absolute belief error | 0.1265 |
| Accuracy against simulated regime, float filter | 0.9234 |
| Accuracy against simulated regime, int8 filter | 0.9240 |
| Floor hits | 0 |
| Cost per sample | 40 MACs, independent of field size |

## Observations

- Regime changes are not separable by inspection of the observation channels. Near sample 300 both channels widen sharply; elsewhere the excursions are comparable to the noise floor. A fixed threshold is therefore insufficient.
- The int8 mode tracks the simulated regime, including the transitions to panic near samples 80 and 300, with transient disagreement confined to transition boundaries.
- The float posterior and the int8 belief are indistinguishable at plot scale. int8 quantisation of the filter does not alter the MAP decision.
- Zero floor hits: the fixed-point rescale prevented belief underflow over the full run.

## Limitations

- The int8 quantiser rounds transition weights without a floor. A nonzero `a_14` is guaranteed only under a floor-at-one rule, which the repository's Lean proof sketch proves sufficient and which is not yet implemented. Plain rounding maps every `a_14` below 1/254 to zero.
- Backward sampling and the EM or Laplace update of `A`, `μ_k` and `Σ_k` are not implemented; regime parameters are fixed.
- The closed loop (CARLA scene rendering, OpenCV lane detection producing lateral offset and SDLP, GPU R-CNN detection, and a microcontroller receiving features over UART, updating the regime belief and returning the estimate to the simulation) exists as a design only.
- Implemented: the model, the filter, and firmware bit-exact with the Python reference under QEMU for Cortex-M4F. GPU timing, on-device timing and accuracy on recorded drives are not measured.

Source:

[SPDE-GMRF lane perception repository on GitHub](https://github.com/dhruv-setty/split-spde-gmrf-inference-for-lane-perception)
