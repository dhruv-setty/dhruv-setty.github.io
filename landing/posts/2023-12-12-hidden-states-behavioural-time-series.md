---
title: "Hidden States: Modelling Driver Behaviour with CARLA, CUDA and a Microcontroller in the Loop"
date: 2023-12-12
summary: How a CARLA simulation, OpenCV and CUDA-accelerated R-CNN detection, and a microcontroller running a hidden Markov model replaced a laboratory of equipment for studying behavioural regime changes.
---

*Modelling behavioural regimes in real time without an instrumented vehicle, an edge computer or a laboratory*

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

## Outcomes

- A closed simulation loop in which perception, field estimation and regime filtering run on separate hardware, each matched to its workload.
- A regime filter small enough for a microcontroller, with a per-sample cost set by the number of regimes rather than the size of the field.
- A method for studying rare and dangerous scenarios repeatably, without physical risk or laboratory equipment.

## Limitations

This is a model and system design, not a measured result. The sparsity figures in the related case studies are computed from real lattice precisions and real factorisations, but the regimes, transition probabilities and emission parameters are illustrative and have not been fitted to recorded driving data. Detection accuracy, end-to-end latency and the agreement of the int8 filter with a floating-point reference remain to be measured, and simulated behaviour must be validated against real behaviour before any conclusion is drawn about drivers.

## Further reading

The full case studies cover [hidden Markov models with Gaussian fields](/case-studies/hmm-gaussian-fields/) and [lifting SPDE-GMRF fields to the GPU and the device](/case-studies/spde-gmrf-gpu-edge/).
