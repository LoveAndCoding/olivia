# First Workflow Candidates

> **Historical document.** This was an early exploration doc used during M1 (Product Definition) to evaluate candidate workflows for the first implementation. The shared household inbox was selected and built. All four Horizon 3 workflows and beyond are now complete. This doc is preserved for historical context only.

## Purpose
This document defines the candidate workflows for Olivia's first implementation-ready spec. Its role is to make the next product choice durable and explicit so future agents do not have to reconstruct the option set from conversation history.

## Selection Criteria
The first workflow should:
- deliver visible household value quickly
- reinforce Olivia's core wedge of shared household state and follow-through
- fit the advisory-only trust model
- work in a local-first product shape
- avoid requiring a full multi-user collaboration model on day one

## Recommended MVP Boundary
For the earliest spec, Olivia should assume:
- the stakeholder is the primary operator and evaluator
- the workflow supports household-shared context
- spouse visibility or lightweight participation may be supported if useful
- true two-user collaborative parity is not required for the first implementation-ready spec

This preserves the household focus without forcing early complexity around permissions, sync, or collaboration design before the product wedge is proven.

## Candidate Workflows

### Candidate 1: Shared household inbox and follow-through queue
- Description: a single place to capture, organize, and review tasks, obligations, reminders, and next actions that matter to the household.
- Why it is strong: it directly supports shared state, follow-through, reminders, and visibility in one narrow workflow cluster.
- Why it is feasible: it works well in an advisory-only model and does not require autonomous action.
- Risks: could become too broad if it tries to absorb every possible household object at once.

### Candidate 2: Upcoming obligations and reminder planner
- Description: a workflow focused on surfacing what is coming up soon, what needs preparation, and what should trigger a reminder or nudge.
- Why it is strong: time-sensitive coordination is a real source of household stress and creates frequent opportunities for value.
- Why it is feasible: the system can remain advisory-only by highlighting upcoming needs and drafting reminders.
- Risks: it may under-serve the broader shared-state goal if it lacks a durable place to track ownership and resolution.

### Candidate 3: Household memory and retrieval assistant
- Description: a workflow focused on storing and retrieving important household context such as plans, notes, preferences, and prior decisions.
- Why it is strong: it supports long-term value and reduces reliance on personal memory.
- Why it is feasible: it aligns well with local-first constraints and durable context goals.
- Risks: it may feel less immediately useful than a workflow tied to active responsibilities and follow-through.

## Recommendation
The recommended first workflow is `Candidate 1: shared household inbox and follow-through queue`.

This is the best starting point because it captures the strongest overlap between tasks, reminders, planning, and household context while staying narrow enough to spec and validate. It also gives Olivia a clear operational center of gravity: what exists, who owns it, what is next, and what needs attention.

## What This Decision Does Not Yet Settle
- the exact interface surface
- the final data model
- whether spouse interaction is read-only, lightweight, or collaborative in the earliest version
- whether reminders are a first-class object or a property of broader household items

## Next Step
Turn the recommended workflow into the first implementation-ready feature spec.
