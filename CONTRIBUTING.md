# Contributing

Thanks for helping. Bug reports, date corrections and pull requests are all welcome.

## Report a wrong date

Date data matters more than anything else here. If a conversion is wrong,
[open an issue](https://github.com/sandeshthapa07/nepali-day-picker/issues) with:

- the BS date and the AD date you expected,
- what the package returned, and
- a source: a photo or link to an official or printed calendar.

## Set up

You need Node.js 22 or later.

```sh
git clone https://github.com/sandeshthapa07/nepali-day-picker.git
cd nepali-day-picker
npm install
npm test
```

| Command                           | What it does                                    |
| --------------------------------- | ----------------------------------------------- |
| `npm test`                        | Runs the tests in your time zone                |
| `npm run test:tz`                 | Runs the tests once in each of seven time zones |
| `npm run typecheck`               | Type-checks the source and tests                |
| `npm run lint` / `npm run format` | Checks / fixes formatting and lint with Biome   |
| `npm run build`                   | Builds `dist/` with tsup                        |
| `npm run size`                    | Builds and checks the bundle-size budget        |
| `npm run check`                   | Everything above, as CI runs it                 |

## Project layout

```text
data/bs-calendar.json   month lengths for each BS year: the source of truth
data/SOURCES.md         where the data came from, and how sure it is
scripts/build-data.mjs  encodes the JSON into src/data/table.ts
src/core/               converter, formatting, parsing, fiscal year, weeks, names, digits
src/index.ts            the public API
test/                   Vitest tests
docs/                   user guides and API reference
```

## Fix month-length data

1. Edit the year's row in `data/bs-calendar.json`. Keep its 12 lengths in month order, Baisakh first.
2. Update its `status` if needed (`agreed`, `disputed`, `single-source` or `projected`).
3. Run `npm run data` to regenerate `src/data/table.ts`. Never edit that file by hand; CI fails if
   it is out of date.
4. Add a golden test in `test/convert.test.ts` for the corrected date, naming its source.
5. Note the change and its source in `data/SOURCES.md`.

## Pull requests

- Run `npm run check` before you push; it is what CI runs.
- Add or update tests for any behaviour change.
- Keep the core free of runtime dependencies.
- Update `CHANGELOG.md` under a new version heading.

## Releasing (maintainers)

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Commit and push.
3. In a normal terminal, in the project folder, run `npm publish`. It runs `npm run check` first,
   then asks for two-factor approval in the browser.
4. A new version takes a minute or two to appear on npm.
