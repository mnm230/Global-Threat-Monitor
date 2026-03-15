import React from 'react';

// Hardcoded mock data
const TOP_STORY = {
  headline: "MULTIPLE INTERCEPTS REPORTED OVER NORTHERN BORDER SECTOR",
  dateline: "HAIFA — 14:32 UTC",
  lead: "Air defense systems engaged a barrage of incoming projectiles launched from southern Lebanon. Preliminary reports indicate successful interceptions of at least twelve targets. Sirens sounded across multiple municipalities in the upper Galilee region.",
  author: "J. H. Intelligence Desk",
  severity: "CRITICAL"
};

const BREAKING_EVENTS = [
  {
    id: 1,
    headline: "Suspicious Aerial Target Tracked off Coast",
    dateline: "MEDITERRANEAN — 14:15 UTC",
    lead: "Naval radar picked up an unidentified drone approaching the exclusive economic zone. Assets deployed to intercept.",
    severity: "HIGH"
  },
  {
    id: 2,
    headline: "Diplomatic Convoy Rerouted Due to Security Concerns",
    dateline: "BEIRUT — 13:50 UTC",
    lead: "A UNIFIL convoy altered its planned route following intelligence regarding potential improvised explosive devices in the area.",
    severity: "ELEVATED"
  },
  {
    id: 3,
    headline: "Commercial Flight Path Deviations Noted",
    dateline: "TEL AVIV — 13:22 UTC",
    lead: "Several international carriers have temporarily adjusted approach vectors into Ben Gurion Airport citing regional tensions.",
    severity: "ELEVATED"
  },
  {
    id: 4,
    headline: "Thermal Anomaly Detected at Suspected Launch Site",
    dateline: "DAMASCUS — 12:45 UTC",
    lead: "Satellite imagery confirms a significant heat signature consistent with rocket motor ignition at a known militant facility.",
    severity: "HIGH"
  },
  {
    id: 5,
    headline: "Cyber Infrastructure Sustains Minor DDoS Attacks",
    dateline: "JERUSALEM — 11:30 UTC",
    lead: "Government portals experienced brief latency spikes attributed to a coordinated denial-of-service campaign by hacktivist groups.",
    severity: "INFO"
  }
];

const MARKET_DATA = [
  { symbol: "TA-35", value: "1,984.22", change: "-1.2%", status: "down" },
  { symbol: "USD/ILS", value: "3.72", change: "+0.4%", status: "up" },
  { symbol: "BRENT", value: "$84.50", change: "+2.1%", status: "up" },
  { symbol: "GOLD", value: "$2,340", change: "+0.8%", status: "up" }
];

const KEY_COUNTS = [
  { label: "Active Alerts", value: "3" },
  { label: "Intercepts (24h)", value: "42" },
  { label: "Airspace Restrictions", value: "2" },
  { label: "Asset Deployments", value: "14" }
];

export function Chronicle() {
  return (
    <div className="min-h-screen bg-[#fffef9] text-black selection:bg-black selection:text-white p-8 font-serif" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Masthead */}
      <header className="border-b-4 border-black pb-6 mb-8 text-center">
        <div className="flex justify-between items-end mb-2 border-b-2 border-black pb-2">
          <div className="text-xs uppercase tracking-widest font-mono" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
            Vol. CXXIV ... No. 59,812
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-xs uppercase tracking-widest font-bold text-red-600">Live Edition</span>
          </div>
          <div className="text-xs uppercase tracking-widest font-mono" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mt-6 mb-4" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
          WARROOM CHRONICLE
        </h1>
        
        <div className="text-sm uppercase tracking-[0.3em] font-semibold border-t border-b border-black py-2">
          LIVE INTELLIGENCE BRIEF // CONTINUOUS COVERAGE
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Top Story (col-span-5) */}
        <section className="md:col-span-5 pr-8 border-r border-black/20">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">Top Story</div>
          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-red-600" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
            {TOP_STORY.headline}
          </h2>
          
          <div className="mb-6 flex flex-col gap-2 border-b border-black/20 pb-4">
            <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
              BY {TOP_STORY.author}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest font-mono text-gray-600" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
              {TOP_STORY.dateline}
            </span>
          </div>
          
          <p className="text-lg leading-relaxed first-letter:text-7xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:leading-none" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            {TOP_STORY.lead}
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Analysis from forward command centers suggests a coordinated effort to test boundary defenses. Units remain on high alert as the situation develops. Local authorities have instructed residents in affected areas to remain near secure shelters until further notice.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            The intercepts mark the most significant exchange in the northern sector over the past 72 hours, prompting immediate assessments by the joint chiefs.
          </p>
        </section>

        {/* Middle Column: Breaking Events (col-span-4) */}
        <section className="md:col-span-4 pr-8 border-r border-black/20">
          <div className="mb-6 text-xs font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">Breaking Dispatches</div>
          
          <div className="flex flex-col gap-8">
            {BREAKING_EVENTS.map((event) => (
              <article key={event.id} className="pb-8 border-b border-black/10 last:border-0">
                <span className="text-xs font-bold uppercase tracking-widest font-mono text-gray-500 mb-2 block" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
                  {event.dateline}
                </span>
                <h3 className="text-2xl font-bold leading-snug mb-3" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
                  {event.headline}
                </h3>
                <p className="text-base leading-relaxed text-gray-800">
                  {event.lead}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Right Column: Data & Tickers (col-span-3) */}
        <section className="md:col-span-3">
          <div className="mb-6 text-xs font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">Intelligence Metrics</div>
          
          {/* Threat Level Stamp */}
          <div className="mb-10 border-4 border-red-600 p-4 text-center transform -rotate-2">
            <div className="text-xs uppercase font-bold tracking-widest text-red-600 mb-2">Current Posture</div>
            <div className="text-4xl font-black text-red-600 tracking-tighter uppercase" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
              ELEVATED
            </div>
          </div>

          {/* Key Counts */}
          <div className="mb-10">
            <h4 className="text-sm font-bold uppercase border-b border-black pb-2 mb-4">Operational Summary</h4>
            <ul className="flex flex-col gap-3">
              {KEY_COUNTS.map((count, idx) => (
                <li key={idx} className="flex justify-between items-center border-b border-black/10 pb-2 border-dotted">
                  <span className="text-sm font-serif">{count.label}</span>
                  <span className="text-lg font-bold font-mono" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>{count.value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Market Ticker */}
          <div>
            <h4 className="text-sm font-bold uppercase border-b border-black pb-2 mb-4">Market Impact</h4>
            <div className="bg-gray-100 p-4 border border-black/20">
              <ul className="flex flex-col gap-3 font-mono text-sm" style={{ fontFamily: "'Letter Gothic', 'Courier New', monospace" }}>
                {MARKET_DATA.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span className="font-bold">{item.symbol}</span>
                    <div className="flex gap-4 text-right">
                      <span>{item.value}</span>
                      <span className={item.status === 'down' ? 'text-red-600' : 'text-green-700'}>
                        {item.change}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Classification Notice */}
          <div className="mt-12 text-center border-t-2 border-b-2 border-black py-4">
            <p className="text-[10px] uppercase tracking-widest font-bold">
              Restricted Distribution<br/>
              Not for Public Release
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Chronicle;
