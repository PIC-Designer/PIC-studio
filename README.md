# PIC Studio

PIC Studio is the searchable design workspace for
[`PIC-Designer/PIC_library`](https://github.com/PIC-Designer/PIC_library). It
indexes GDSFactory component definitions without executing library code and
presents them by platform, wavelength, mode, cross-section, device family,
version, and release status.

## Current playground

- Static AST-based catalogue generation from registered Cornerstone components
  in `pdk/cornerstone/components_in_platform.py` and all public functions in
  `pdk/developing`
- Multi-dimensional search and filtering
- Responsive component cards and design detail drawer
- Test-chip catalogue with deterministic 13-character UIDs, revision and lineage tracking
- Function signature, default parameter, quick-start, and GitHub source views
- GitHub Pages deployment workflow

Registered `cornerstone` entries are represented as **released**, while all
public `developing` entries are represented as **developing**.

## Local development

```powershell
git clone https://github.com/PIC-Designer/PIC_library.git .reference-library
python scripts/build_catalog.py --source .reference-library/pdk --output public/catalog.json
python scripts/build_chip_catalog.py --source .reference-library --registry data/chip_uid_registry.json --output public/chip_catalog.json
python scripts/build_previews.py --catalog public/catalog.json --library .reference-library --output public/previews
pnpm install
pnpm dev
```

The catalogue builder only parses Python syntax. The separate preview builder
executes catalogue functions with their default parameters and stores compact
WebP raster previews in `public/previews`. These images are not layout files.
Any persisted or downloadable photonic layout artifact must use OAS/OASIS;
GDS/GDSII artifacts are intentionally not supported by PIC Studio.

## Test-chip UID headers

Test-chip metadata is read only from the Python module header. Each `MAIN`
block represents one separately generated layout and must contain all six
fields below. Field names and field values are case-insensitive.

```python
"""
MAIN: main_TE()
PLATFORM: SiN200
WAVELENGTHS: 520nm, 638nm, 780nm
IOS: Grating Coupler
TYPE: test chip
CREATE DATA: 08/2026
"""
```

The UID is a deterministic 13-character identifier derived from `MAIN`,
`PLATFORM`, `WAVELENGTHS`, `IOS`, `TYPE`, and `CREATE DATA`. No value is
inferred from paths, filenames, function bodies, or Git history. A missing or
incomplete header produces a `PLACEHOLDER` entry that lists the missing fields.
All six values are case-folded before hashing, so differences such as
`Grating Coupler` and `grating coupleR` produce the same UID.

An optional, case-insensitive `COMMENTS` field belongs to its nearest preceding
`MAIN` block. It is shown on that imported chip card as a short introduction,
but it is deliberately excluded from the UID identity and changing it never
changes the UID.
The browser's **Generate UID** form applies the same algorithm but is
calculation-only: it does not create a chip, modify the catalogue, or store the
entered values locally.

## GitHub configuration

The deployment workflow needs an Actions secret named `PIC_LIBRARY_TOKEN` with
read-only access to the private `PIC-Designer/PIC_library` repository. GitHub
Pages must use **GitHub Actions** as its build source. Without the secret, the
workflow deploys the committed catalogues and does not attempt to access the
private library.

## Public access model

PIC Studio is intended to be publicly readable. Anyone may view, clone and
download published assets. Only explicitly authorised members of the
`PIC-Designer` organisation have direct write access to this repository.
Changes from other users must go through a pull request and cannot modify the
upstream repository unless an authorised maintainer approves and merges them.

The private `PIC_library` source repository is not included in this repository.
Published catalogue metadata and preview images are static generated assets.

## Roadmap

1. Add editable parameter forms and Python call generation.
2. Run trusted component builds in an isolated GitHub Actions job.
3. Store OAS/OASIS artifacts and design validation history.
