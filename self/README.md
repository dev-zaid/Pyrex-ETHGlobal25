# Self playground

The Self playground provides an example usage of Self.

The main page `app/page.tsx` imports `@selfxyz/qrcode` and displays an interface to edit the attributes that should be revealed.

The API endpoint `pages/api/verify.ts` imports `@selfxyz/core`, receives proofs from the Self mobile app and verifies them.

To keep track of which session asks for which attributes, we store a mapping from user identifier to attributes to reveal using in-memory storage.

If you're looking for a simpler example that checks a set of fixed attributes, checkout [happy-birthday](https://github.com/selfxyz/happy-birthday) instead.

## Getting Started

- Fork the project and add it to your Vercel account.
- Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
- Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

When developing locally, you can route the requests from the mobile app to your local machine by opening an ngrok endpoint using `ngrok http 3000` and replace `endpoint: "https://playground.self.xyz/api/verify"` in `app/page.tsx` with the newly generated url, that should look something like `endpoint: "https://198c-166-144-250-126.ngrok-free.app/api/verify"`.

After you do that, make sure you also update the url passed to `SelfBackendVerifier` in `pages/api/verify.ts` with your new ngrok url. This is so the sdk can check the proof comes from the right url, and avoids replay attacks that could be used to deanonimize users.

When deploying to Vercel, update those urls to match your Vercel deployment url.
