# PIC Studio

PIC Studio is the searchable design workspace for
[`PIC-Designer/PIC_library`](https://github.com/PIC-Designer/PIC_library). It
indexes GDSFactory component definitions without executing library code and
presents them by platform, wavelength, mode, cross-section, device family,
version, and release status.

## Current playground

- Static AST-based catalogue generation from `pdk/cornerstone` and
  `pdk/developing`
- Multi-dimensional search and filtering
- Responsive component cards and design detail drawer
- Function signature, default parameter, quick-start, and GitHub source views
- GitHub Pages workflow with daily library refresh

`cornerstone` entries are represented as **released**, while `developing`
entries are represented as **developing**.

## Local development

```powershell
git clone https://github.com/PIC-Designer/PIC_library.git .reference-library
python scripts/build_catalog.py --source .reference-library/pdk --output public/catalog.json
pnpm install
pnpm dev
```

The catalogue builder only parses Python syntax. It does not import the PDK,
open GDSFactory, or execute component functions.

## GitHub configuration

The deployment workflow needs an Actions secret named `PIC_LIBRARY_TOKEN` with
read-only access to the private `PIC-Designer/PIC_library` repository. GitHub
Pages must use **GitHub Actions** as its build source.

## Roadmap

1. Add generated SVG/PNG component previews.
2. Add editable parameter forms and Python call generation.
3. Run trusted component builds in an isolated GitHub Actions job.
4. Store GDS/OAS artifacts and design validation history.
