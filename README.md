# Steamified-Hack

A Babylon.js-powered Next.js event and scene application built with a lightweight editor runtime and custom scene assets.

## Overview

`Steamified-Hack` is a React/Next.js project using Babylon.js (`@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/materials`, `@babylonjs/addons`, and `@babylonjs/havok`) to render interactive 3D content in the browser.

The app loads a dynamic `SimulationWorkspace` component client-side, and the project includes scene data and assets under `assets/` and `public/scene/` for fast preview and export.

## Key Features

- `Next.js` app with client-side Babylon.js rendering
- Babylon.js 8.x ecosystem support
- Custom scene/assets structure for event authoring
- Static export capable via `next.config.js` (`output: "export"`)
- Build compression and editor baking scripts included

## Project Structure

- `src/app/page.tsx` — main app page that dynamically loads the Babylon render workspace
- `src/app/layout.tsx` — root app layout and global font styles
- `src/scripts/venturiController.ts` — custom simulation or scene control logic
- `assets/` — scene assets, Babylon editor data, meshes, materials, cameras, lights, and more
- `public/scene/` — exported static scene content for deployment
- `scripts/` — build helper scripts:
  - `bake-lab.mjs`
  - `compress-for-s3.js`

## Installation

```bash
npm install
```

## Development
`This project can also be run using CreatorEngine(Mostly Browser don't allow to run and the browser will crash, So using CreatorEngine will be better choice for running locally)`

Run the development server locally:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

- `npm run dev` — start the Next.js development server
- `npm run build` — build the application for production
- `npm run build:compress` — build and run S3 compression helper
- `npm run generate` — generate a Babylon editor pack with `babylonjs-editor-cli`
- `npm run start` — run the production server after build
- `npm run lint` — run ESLint checks
- `npm run bake:editor` — execute editor baking script

## Dependencies

- `next` 16
- `react` 18
- `react-dom` 18
- `@babylonjs/core` 8
- `@babylonjs/gui` 8
- `@babylonjs/materials` 8
- `@babylonjs/addons` 8
- `@babylonjs/havok`
- `babylonjs-editor-tools`
- `@iwsdk/core`

## Notes

- The main Babylon rendering happens client-side to avoid server-side rendering issues.
- Use the `assets/` and `public/scene/` directories to add or update scene files and exported content.
- If you want to extend the event experience, add more scene logic under `src/scripts/` and connect it to the `SimulationWorkspace` component.
