# obdai-clone (functional equivalent)

Goal: a **functionally equivalent** mobile app (iOS + Android) to an AI-assisted OBD2 scanner, built from scratch.

## Current direction
- Mobile: **Expo (React Native) + TypeScript** in `mobile/`
- Hardware: **BLE-only** OBD2 adapter (iOS-compatible)
- AI: **OpenAI API** (later: plug-in provider abstraction)
- Distribution: App Store eventually (TestFlight during development)

## Run (mobile)
```bash
cd mobile
npm install
npm run ios
# or
npm run android
```

## Next milestone
1) BLE scan + connect
2) ELM327 init over BLE (ATZ/ATE0/ATL0/ATS0/ATH0/ATSP0)
3) Read DTCs + clear DTCs
4) Live PID streaming + logging
5) First "AI explain" flow for a DTC or PID anomaly
