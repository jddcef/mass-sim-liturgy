# Parish source data

One folder per parish, prepared with `node parish-intake.cjs` following
[docs/PARISH-INTAKE.md](../docs/PARISH-INTAKE.md).

```
parishes/
  review-index.js          generated; read by parish-review.html
  <parish-id>/
    spec.json              measurements and descriptions (parish spec v1)
    manifest.json          every source file with status and reasons
    profile.draft.json     generated ChurchProfiles v1 draft
    profile-report.json    clamps, gaps and limitations of the draft
    README.md              parish summary written at the end
    source/                unchanged copies of the originals
    derived/               resized, metadata-free JPEGs for review
    review/queue.json      open review items (generated)
    review/decisions.json  every human decision applied so far
```

This data is reference material for building parish layouts. It is not loaded
by the simulator, and Street View or satellite images must not be used as
textures.
