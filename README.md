# Sensebridge

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Gemini](https://img.shields.io/badge/Google-Gemini_API-orange?style=flat-square&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A React/TypeScript application built with the Gemini API via Google AI Studio, exploring multimodal interaction and real-time AI-assisted interfaces.

## What it does

Sensebridge is an AI Studio app that uses the Gemini API to handle interactive, context-aware conversations through a clean browser-based UI. Built as an exploration of building lightweight AI-powered interfaces without a heavy backend.

## Running locally

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/ipjrb12/sensebridge.git
cd sensebridge
npm install
```

Add your Gemini API key to `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

Then run:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project structure

```
├── App.tsx              # Root component
├── index.tsx            # Entry point
├── index.html           # HTML shell
├── components/          # UI components
├── metadata.json        # App metadata
├── package.json
└── tsconfig.json
```

## Tools

- React, TypeScript
- Google Gemini API
- Vite

## License

MIT
