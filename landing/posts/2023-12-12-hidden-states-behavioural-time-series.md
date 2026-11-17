---
title: "Hidden States: Modelling Behaviour as Regimes That Jump and Fields That Drift"
date: 2023-12-12
summary: Why behavioural time series need two latent layers, a hidden Markov model for the jumps and a sparse Gaussian field for the drift, and how the work splits between a GPU and the device.
---

*Behaviour does two things at once, and a model that only sees one of them gets both wrong*

Watch a driver over a long trip and two things happen. Their state jumps between a few qualitative modes: calm, alert, high-stress, and occasionally panic. And inside each mode, things drift: fatigue builds, conditions get worse and then ease, and nearby sensors move together. Any system that wants to decide when to warn, intervene or escalate has to tell those two apart.

That's the premise behind two of my case studies, and the question I keep coming back to: what is the hidden state, and how do you know when it has changed?

## Why a plain HMM isn't enough

A hidden Markov model is the natural start. The modes are hidden states, a transition matrix says how likely each switch is, and each state emits observations from its own distribution.

The trouble is the assumption underneath. Given the state, a standard HMM treats observations as independent draws from a fixed distribution. Behavioural signals don't behave like that. Slow drift either needs far more states than the problem has meaning for, or it shows up as spurious regime switches. Neither helps an interface decide when to act.

## Two latent layers

The fix is a second, continuous latent layer. The regimes stay few and interpretable, and a Gaussian field absorbs the gradual drift, the spatial proximity and the noise around them. Each observation depends on both: the current regime sets its mean and noise, and the field adds the slow variation.

The transitions matter as much as the states. Most of the probability sits on staying put or moving to a neighbouring mode, but the model keeps a direct path from calm to panic, because the moments that matter most are the ones with no gradual build-up.

## Keeping it small enough to run

A smooth Gaussian field normally means a dense covariance matrix, and every likelihood evaluation would cost a dense factorisation. The SPDE approach of Lindgren, Rue and Lindström avoids that. It represents the field as the solution of a stochastic equation, which turns it into a Gaussian Markov random field with a sparse precision matrix. The number of nonzeros per row stays fixed as the mesh grows.

Exact inference over every possible regime path is out of reach, so the model alternates. Given the field, the regimes are an ordinary HMM and forward filtering is cheap. Given the regimes, the field is Gaussian with a precision that is still sparse, so one sparse Cholesky factorisation gives its mean, a sample and the log-determinant for the likelihood.

## Heavy path, light path

That split also decides where the work runs. Estimating the field and its parameters means factorising large sparse matrices again and again, which belongs on a GPU and only needs to happen as often as the environment changes. Deciding the current mode is one small recursion per sample, a four by four matrix-vector product and a normalisation, which belongs on the device.

The field lives on mesh nodes but the signals arrive at sensors, so a sparse projector lifts one onto the other, with each sensor reading from the three corners of the triangle it sits in. On the device, the forward step has the same shape as a fully connected layer, so it can run as an int8 kernel on an Arm Cortex-M class microcontroller, with a fixed-point rescale to keep the belief from underflowing.

## What's proven and what isn't

Both studies are designs, not measured results. The sparsity and fill-in figures are computed from real lattice precisions and real factorisations, but the regimes, transitions and emission parameters are illustrative and haven't been fitted to recorded data. Detection accuracy, GPU timings, device latency and the accuracy of the int8 filter against a floating-point reference are all open until they're measured. I'd rather say that plainly than borrow confidence from the maths.

## What I took from it

Name the hidden state before you model it. A few regimes that map onto real decisions beat many that nobody can act on.

Let the continuous layer carry the drift. If slow change is forced into discrete states, it shows up as false alarms.

Put each piece of work where it fits. The expensive part depends on how fast the world changes; the cheap part depends on every sample.

You can read the full case studies on [hidden Markov models with Gaussian fields](/case-studies/hmm-gaussian-fields/) and on [lifting SPDE-GMRF fields to the GPU and the edge](/case-studies/spde-gmrf-gpu-edge/).
