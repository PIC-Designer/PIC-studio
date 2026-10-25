# Contributing

PIC Studio is publicly readable, but direct writes are restricted to authorised
members of the PIC-Designer organisation.

External users may report a problem or propose a change with a pull request.
Only an authorised maintainer can review and merge a change into the upstream
repository. Do not include proprietary PDK source, access tokens, credentials,
customer data, or unapproved layout assets in an issue or pull request.

Before proposing a code change, run:

```text
pnpm lint
pnpm build
python scripts/check_layout_formats.py public
```

Persisted photonic layout downloads must use OAS/OASIS. Raster previews use
WebP. The private PIC_library checkout must remain under `.reference-library`,
which is excluded from version control.
