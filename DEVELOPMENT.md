# Shared theme core

`src` is the canonical integrated manager, media store and startup player. Each theme carries a copy in `integrated/src`, with the MIT license. Runtime host/client leases are scoped to the DSH root so installation order and removing the first theme do not create duplicate managers or dispose the remaining theme.

After changing the core, build this package, synchronize its source and license to both theme repositories, and build each theme. Each theme build regenerates the included CSS and inline boot bundle; it does not require this repository at runtime or build time. Keep the snapshots identical.

Run `node --test test/*.test.mjs`; set `DSH_MODULES` to the installed `@deepseek-ai` package directory for the real Context, HTTP bridge and owner-ACL checks. The native integration fixture expects the two built theme repositories alongside this checkout.

Media writes use authenticated owner Fetch routes and 512 KiB chunks, with a 96 MiB per-video cap. Video reads use buffered GET/HEAD request mode; DSH 0.2.2 cannot create a streaming Request body for GET/HEAD. Upload POST routes use streaming mode with their own bound. Do not expose profile paths or make uploaded video a public static resource.


Media settings v2 preserve all v1 fields and revisions. Each skin keeps the desktop clip at the original `file`/`name` keys and a separate `mobile` clip and fit. An absent mobile clip resolves to the current desktop URL. Upload and reset requests accept a `device` (`desktop` by default), and garbage collection retains hashes used by either screen of either theme. Startup selects the mobile clip for narrow screens or phone landscape with coarse touch input. Files are not transcoded or resized.

Do not require a local Blob video to decode before uploading. A metadata timeout, local-file access restriction, or browser codec limitation is not proof that the file is invalid on the device that will play it. Uploads remain bounded and container-validated by the owner API; preview errors are advisory and startup playback fails open.

Bundled `boot.mp4` and `boot.webm` encode the same clip. Match an uploaded copy by SHA-256 before offering the bundled alternative; never substitute unrelated artwork. Owner video routes support `variant=webm` and retain file allowlists, GET/HEAD ranges and authentication. Private `<original hash>.mp4.compat.webm` sidecars are supported and collected only when neither screen uses the original. No runtime transcoder is required. Both startup and settings previews try alternative encodings, and previews no longer seek automatically on metadata load.
