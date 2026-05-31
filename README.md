# FlickWinds™ — Human Capability Intelligence Dashboard

An interactive founder and investor dashboard for FlickWinds, built in React with Recharts. It combines the core business model (process-centric fault line detection across industry verticals) with the HCI buy-signal heatmap (10 industries × 8 fault lines) into a unified intelligence platform.

## What's Inside

The dashboard has eight navigable sections: Command Centre (hero value-leakage metric + signal metrics), Buy Signals (the interactive 10×8 heatmap with re-scoring, cell detail panels, and sendPrompt action buttons), Fault Line Intelligence (the eight people-process fault lines with service plays and value levers), Industry Verticals (Retail and FSO process-level analysis with expansion roadmap), Value Engine (client ROI case studies and product revenue ladder), AI Agents (six agents mapped to specific fault lines), Growth & Financials (5-year revenue, EBITDA, ARR, CAPEX/OPEX), and Assets & Valuation (strategic asset timeline and enterprise value progression).

## Quick Start

```bash
npx create-react-app flickwinds-dashboard
cd flickwinds-dashboard
npm install recharts
```

Then replace `src/App.js` with:

```jsx
import FlickWindsDashboard from './FlickWindsDashboard';

function App() {
  return <FlickWindsDashboard />;
}

export default App;
```

Copy `src/FlickWindsDashboard.jsx` from this repo into your `src/` folder, then:

```bash
npm start
```

## Dependencies

React 18+ and Recharts are the only dependencies. The dashboard uses Google Fonts (Instrument Sans + Playfair Display) loaded via CDN link tag. No additional UI libraries required.

## Design

Dark intelligence-briefing aesthetic with a slate and amber/gold palette. The heatmap uses a teal/amber/grey signal palette (Strong Buy 80+, Buy 70-79, Watch 55-69, Pass <55) matching the HCI buy-signal scoring system.

## Licence

Proprietary — FlickWinds™
