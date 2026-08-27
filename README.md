# Stream Sense AI

Create a premium, ultra-modern mobile-first web app for an AI-powered OTT and Streaming Language Finder. The UI must be high-end, clean, and highly scannable, using a dark theme (deep grays, whites, and vibrant accent colors like red/neon green).



Key UI & Navigation Requirements:

1. Horizontal Scrolling Pill Filters: Strictly avoid vertical checkboxes. Users must select options using swipeable horizontal pill rows.

   - Row 1 (Categories): Movies, Web Series, Anime, Documentary, Cartoon, Short Drama.

   - Row 2 (Top Streaming Platforms Only): Netflix, Prime Video, JioCinema, Disney+ Hotstar, Zee5, SonyLIV.

   - Row 3 (Audio Preference - Core USP): Only Hindi Dubbed (with a green check indicator), Original English, Regional Languages.

2. Smart Keyword Search Bar: A prominent, smooth search bar that allows users to type full descriptive phrases or custom tags (e.g., "prison se bhagne wale group"). It must allow users to choose typed keywords as tags.

3. User Taste & Interaction Tracker:

   - Implement local storage tracking to analyze user behavior based on past searches and clicked content.

   - On the homepage, display a dedicated personalized section: "Based on Your Taste" or "Recommended For You" which dynamically prioritizes categories/genres they interact with most.

4. Top-Tier Search Results Card Layout:

   - Display cards showing the content poster, verified platform badge, runtime, and Rotten Tomatoes meter.

   - The card must feature a distinct "Hindi Audio Status" indicator badge showing either "🟢 Verified" (with date), "🟡 User Confirmed", or "⚪ Unverified (Subtitles Only)".

   - Include a secondary toggle inside the card to expand details showing Wikipedia-sourced financial data: Budget & Worldwide Box Office Collection, along with an "Entertainment Value Analysis" text section.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/473d7104-c17c-41b4-b3b1-28c48f99ebab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
