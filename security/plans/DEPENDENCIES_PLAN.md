# Dependencies Fix Plan

## Changes

- Run `npm install next@16.2.6 eslint-config-next@16.2.6` to patch both CVEs
- Verify `package.json` and `package-lock.json` reflect the new version
- Run `npm run build` to confirm no breaking changes

## Verification goals

- [ ] `package.json` shows `"next": "16.2.6"`
- [ ] Build succeeds
