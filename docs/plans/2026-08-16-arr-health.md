# Sonarr and Radarr health

Date: 2026-08-16

## Outcome

Add a small, read-only Arr API adapter and use it to show live Sonarr and
Radarr system health in Operations when server-side URLs and API keys are
configured.

## Deliberate limits

- This slice does not expose queue mutations or media deletion.
- API keys remain deployment secrets; no integration editor is implied.
- Queue and wanted-media normalization remain follow-up slices after the
  authenticated health path is verified against a real instance.
