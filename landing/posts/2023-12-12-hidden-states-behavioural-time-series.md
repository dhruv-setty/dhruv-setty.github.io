---
title: "Hidden States: Modelling Driver Behaviour with Regimes, Drift and a Forward Filter"
date: 2023-12-12
summary: A walkthrough of the behavioural time series model behind the lane detection project: four hidden regimes with a direct calm-to-panic path, a sparse Gaussian field for drift, the inference loop that joins them, and a simulated run in which an int8 forward filter tracks the float filter on 99.66% of 5,000 samples.
---

## The problem the model has to solve

A dashboard-mounted phone can detect lane markings and estimate the Standard Deviation of Lane Position (SDLP), but lane position alone does not explain why lateral control changes. A driver's behaviour changes in two ways at once. It moves between a small number of qualitative modes, and it drifts gradually within each mode. A system that warns or intervenes has to tell a genuine change of mode from slow drift; if it cannot, it either misses the moment that matters or raises alarms that operators learn to ignore.

The lane detection project, now the SPDE-GMRF repository, models that with two latent layers. This post walks through four figures: three model figures from the project's case study, kept in an earlier revision of the repository, and one time series captured by the repository's CI from the code as it stands. All data are simulated with fixed seeds, and the transition and emission parameters are illustrative; they have not been fitted to recorded drives.

| Layer | Representation |
|---|---|
| Discrete | Hidden Markov model over calm, alert, high stress and panic, K = 4 |
| Continuous | Gaussian field with sparse precision `Q(θ)` |
| Observations | Lateral lane offset and an SDLP window, both in millimetres |

## Two latent layers, one observation

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-graphical-model.png" alt="Graphical model with a chain of discrete regimes on top, observed signals in the middle and a chain of continuous field states below" width="1138" height="411" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Two latent layers, one observation</span> The regime chain <code class="ic">S_t</code> moves through the transition matrix <code class="ic">A</code>. The field <code class="ic">x_t</code> is a Gaussian Markov structure with precision <code class="ic">Q(θ)</code>. Each observation depends on both: <code class="ic">y_t = μ_S + H x_t + ε_t</code>, with noise <code class="ic">ε_t ~ N(0, Σ_S)</code> set by the current regime.</figcaption></figure>

The figure is the whole modelling decision in one picture. A plain HMM assumes that, given the regime, observations are independent draws from a fixed distribution. Behavioural signals break that: fatigue builds over a drive and conditions rise and fall. Forcing that slow variation into discrete states needs more states than the problem has meaning for, or it shows up as spurious regime switches. The second, continuous layer absorbs the drift, so the regimes stay few and interpretable. In the repository the field enters the lateral offset channel only, through the lifted offset of the current site.

## Regimes and the path that skips the build-up

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-regimes.png" alt="Four regime states, calm, alert, high-stress and panic, with self-transitions, neighbour transitions and a dashed direct path from calm to panic" width="1138" height="419" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Regimes and transitions</span> Each regime <code class="ic">k</code> has its own emission <code class="ic">N(μ_k + H x_t, Σ_k)</code>. Most mass sits on self-transitions and neighbours, but the model keeps a direct path <code class="ic">a_14</code> from calm to panic, because the moments that matter most have no gradual build-up.</figcaption></figure>

The dashed arc is the engineering requirement in this figure. `a_14` is small by design, and a small weight is exactly what int8 quantisation can round to zero, which would make the most dangerous transition impossible for the filter to infer. The repository states the requirement in normative terms: the int8 model must retain a nonzero `a_14` after quantisation, and a test (`test_transition_matrix_keeps_direct_calm_to_panic`) checks it.

The README is also explicit about the remaining gap. The int8 quantiser rounds the transition weights with no floor, so a nonzero `a_14` is guaranteed only under a floor-at-one rule that the repository's Lean proof sketch proves sufficient, and that rule is not yet in the code. Plain rounding sends every `a_14` below 1/254 to zero.

## The inference loop

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/hmm-inference-loop.png" alt="Two boxes, forward filter and backward sample on the left and Gaussian field update on the right, exchanging the regime path and the field estimate, both feeding a hyperparameter box below" width="973" height="428" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · The inference loop</span> Given the field, the regimes are an ordinary HMM, filtered in <code class="ic">O(TK²)</code> with K = 4. Given the regimes, the field is Gaussian with a sparse precision, solved with one sparse Cholesky factorisation. The hyperparameters <code class="ic">θ = (A, μ_k, Σ_k, κ, τ)</code> are updated from the joint likelihood, and <code class="ic">log|Q| = 2 Σ log L_ii</code> comes from the same Cholesky factor.</figcaption></figure>

The figure describes the full design, and the repository implements part of it. Implemented: the field side, which is estimation of `κ` and `τ` with `log|Q|` read from the factor, and the forward filter. Not implemented: backward sampling and the EM or Laplace update of `A`, `μ_k` and `Σ_k`; the regime parameters are fixed and illustrative. The split is still the right one, because it puts the expensive step, a sparse factorisation, on the field side where it can run periodically, and leaves the per-sample work as a 4 by 4 recursion.

## The forward filter on a simulated drive

<figure class="cs-figure"><img src="/journal/hidden-states-behavioural-time-series/plot_forward_filter.png" alt="Four stacked panels over 600 samples: lateral offset and SDLP observations, simulated regime against int8 mode, float filter posterior, int8 filter belief" width="1803" height="1383" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Observations, regimes and filter beliefs</span> The data of <code class="ic">python/tests/test_forward_filter.py</code> (seed 7), first 600 of 5,000 samples. From the top: the two observation channels; the simulated regime and the int8 mode; the float forward filter posterior; and the int8 belief, dequantised as <code class="ic">(α + 128) / 255</code> and normalised. Over all 5,000 samples the argmax agreement is 99.66% and the mean absolute belief error is 0.0020.</figcaption></figure>

This is the time series the model exists to read, and each panel answers a different question.

- **Top panel, the observations.** The lateral offset and the SDLP window are noisy, and the regime changes are not obvious by eye. Around sample 300 both channels widen sharply; elsewhere the swings are smaller and harder to separate from noise. That is the case for a model rather than a threshold.
- **Second panel, truth against decision.** The black line is the simulated regime and the red line is the mode chosen by the int8 filter (drawn with a small offset so both are visible). The int8 mode follows the regime changes, including the jumps to panic near samples 80 and 300, with brief disagreements at transitions.
- **Third and fourth panels, the beliefs.** The float posterior and the int8 belief are close to indistinguishable at this scale. That is the claim that matters for a microcontroller: quantising the filter to int8 does not change the decision.

The test log adds the numbers behind the picture. Over 5,000 samples the maximum absolute belief error is 0.1265, accuracy against the simulated regime is 0.9234 for the float filter and 0.9240 for the int8 filter, and there are 0 floor hits, so the fixed-point rescale kept the belief from underflowing throughout. The step costs 40 MACs per sample regardless of the size of the field. These are simulated results; accuracy on recorded drives has not been measured.

## Where the loop goes next

The study was designed around a closed loop: CARLA renders the scene, OpenCV and the lane detector produce the lateral offset and SDLP, a GPU runs R-CNN detection, and a microcontroller receives the features over UART, updates its belief over the four regimes and returns the estimate to the simulation. In the repository that loop is a design only. What exists is the model, the filter, and firmware that is bit-exact with the Python reference under QEMU for Cortex-M4F. The GPU and on-device timing, and accuracy on real driving, are the measurements still owed.

Source on GitHub: [the SPDE-GMRF repository](https://github.com/whatheheckisthis/SPDE-GMRF).
