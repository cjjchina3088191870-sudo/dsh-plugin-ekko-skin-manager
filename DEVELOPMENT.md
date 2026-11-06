# Shared theme core

`src` is the canonical integrated manager, media store and startup player. Each theme carries a copy in `integrated/src`, with the MIT license. Runtime host/client leases are scoped to the DSH root so installation order and removing the first theme do not create duplicate managers or dispose the remaining theme.

After changing the core, build this package, synchronize its source and license to both theme repositories, and build each theme. Each theme build regenerates the included CSS and inline boot bundle; it does not require this repository at runtime or build time. Keep the snapshots identical.

Run `node --test test/*.test.mjs`; set `DSH_MODULES` to the installed `@deepseek-ai` package directory for the real Context, HTTP bridge and owner-ACL checks. The native integration fixture expects the two built theme repositories alongside this checkout.

Media writes use authenticated owner Fetch routes and 512 KiB chunks, with a 96 MiB per-video cap. Video reads use buffered GET/HEAD request mode; DSH 0.2.2 cannot create a streaming Request body for GET/HEAD. Upload POST routes use streaming mode with their own bound. Do not expose profile paths or make uploaded video a public static resource.
