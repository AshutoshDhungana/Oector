# Pitch-data runtime artifacts

Run `python -m scripts.seed_pitch_demo` inside the API container to populate
the `pitch-atlas` product with reproducible investor-pitch data.

The script writes its source snapshots and generated files into the Compose
`uploads` volume at `/tmp/kle_uploads/demo/pitch-data/`:

- `nist_sp800_53_rev5_catalog.json` — downloaded NIST OSCAL source snapshot;
- `owasp_asvs_5.0.0.csv` — pinned OWASP ASVS 5.0.0 source snapshot;
- `cisa_kev.json` and `kev_snapshot.csv` — compact CISA KEV sample;
- `pitch_vendor_assessment.xlsx` — the reviewer walkthrough workbook.

The imported Q&A statements are deliberately labelled **Demo policy**. They
are not representations of any organization’s certifications, environment, or
security commitments.

See [ATTRIBUTION.md](ATTRIBUTION.md) before redistributing the bundle.
