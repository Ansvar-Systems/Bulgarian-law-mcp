# Provision Verification (Character-by-Character)

Method:
- Re-parse official act payloads from `parliament.bg` stored in `data/source/acts/{actId}.json`.
- Compare seed provision `content` text to re-parsed official provision text character-by-character.

Verified provisions:

1. Act `78098`, provision `1` (`Чл. 1.`)
   - Seed file: `data/seed/1223-act-78098.json`
   - Match: `true`
   - Lengths: `469` vs `469`
   - SHA-256: `9a13e8dfe9d982fa715651708505a76c5f37c7d78c42c30e970ac5042cea7952`

2. Act `15565`, provision `1` (`Чл. 1.`)
   - Seed file: `data/seed/0916-act-15565.json`
   - Match: `true`
   - Lengths: `132` vs `132`
   - SHA-256: `6c341ebec8a01dcf14186d68ddf24faae9ae638f3dd867353d4b1dd400627a7e`

3. Act `165936`, provision `1` (`Чл. 1.`)
   - Seed file: `data/seed/1915-act-165936.json`
   - Match: `true`
   - Lengths: `718` vs `718`
   - SHA-256: `5a95545ac974c718825996f9d100482c13ec8263ac99aa0b6fa6e015b00b2751`
