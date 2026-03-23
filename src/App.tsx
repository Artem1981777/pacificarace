import { useState, useEffect } from "react"
import { Trophy, Share2, Bell, BarChart3, Brain, Flame } from "lucide-react"

const CLAUDE_API = "https://api.anthropic.com/v1/messages"
const KEY = (import.meta as any).env.VITE_CLAUDE_KEY

// ── Types ──────────────────────────────────────────────
interface Trader {
  id: string
  name: string
  avatar: string
  pnl: number
  pnlPercent: number
  winRate: number
  trades: number
  volume: number
  riskScore: "Low" | "Medium" | "High"
  topAsset: string
  followers: number
  isFollowing: boolean
  positions: Position[]
  badges: string[]
}

interface Position {
  asset: string
  side: "Long" | "Short"
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  leverage: number
}

interface Trade {
  trader: string
  asset: string
  side: "Long" | "Short"
  size: number
  price: number
  pnl: number
  time: number
  likes: number
  liked: boolean
}

interface MarketData {
  symbol: string
  price: number
  change: number
  volume: number
  fundingRate: number
}

// ── Mock Data ──────────────────────────────────────────
const MARKETS: MarketData[] = [
  { symbol: "BTC-PERP", price: 87234.5, change: 2.34, volume: 1234567890, fundingRate: 0.0012 },
  { symbol: "ETH-PERP", price: 3456.78, change: -1.23, volume: 567890123, fundingRate: -0.0008 },
  { symbol: "SOL-PERP", price: 187.34, change: 5.67, volume: 234567890, fundingRate: 0.0021 },
  { symbol: "ARB-PERP", price: 1.234, change: -2.45, volume: 89012345, fundingRate: 0.0003 },
]

const TRADERS: Trader[] = [
  { id: "1", name: "CryptoWhale", avatar: "🐋", pnl: 124567, pnlPercent: 234.5, winRate: 78, trades: 456, volume: 2345678, riskScore: "High", topAsset: "BTC", followers: 12453, isFollowing: false, badges: ["🏆", "🔥", "⚡"], positions: [{ asset: "BTC-PERP", side: "Long", size: 5.2, entryPrice: 82000, currentPrice: 87234, pnl: 27218, leverage: 10 }] },
  { id: "2", name: "SteadyHands", avatar: "🤲", pnl: 45678, pnlPercent: 89.3, winRate: 91, trades: 234, volume: 876543, riskScore: "Low", topAsset: "ETH", followers: 8765, isFollowing: false, badges: ["🛡️", "📈"], positions: [{ asset: "ETH-PERP", side: "Long", size: 12.5, entryPrice: 3200, currentPrice: 3456, pnl: 3200, leverage: 3 }] },
  { id: "3", name: "DeFiNinja", avatar: "🥷", pnl: 78901, pnlPercent: 156.7, winRate: 65, trades: 891, volume: 5678901, riskScore: "High", topAsset: "SOL", followers: 23456, isFollowing: false, badges: ["🥷", "🔥", "💎"], positions: [{ asset: "SOL-PERP", side: "Long", size: 450, entryPrice: 165, currentPrice: 187, pnl: 9900, leverage: 5 }] },
  { id: "4", name: "RiskManager", avatar: "📊", pnl: 23456, pnlPercent: 45.6, winRate: 88, trades: 123, volume: 345678, riskScore: "Low", topAsset: "ARB", followers: 4567, isFollowing: false, badges: ["🛡️", "📊"], positions: [] },
  { id: "5", name: "MoonShot", avatar: "🚀", pnl: -12345, pnlPercent: -23.4, winRate: 43, trades: 567, volume: 3456789, riskScore: "High", topAsset: "BTC", followers: 2345, isFollowing: false, badges: ["🎲"], positions: [{ asset: "BTC-PERP", side: "Short", size: 2.1, entryPrice: 89000, currentPrice: 87234, pnl: 3709, leverage: 20 }] },
]

const LIVE_TRADES: Trade[] = [
  { trader: "CryptoWhale", asset: "BTC-PERP", side: "Long", size: 1.5, price: 87234, pnl: 4521, time: Date.now() - 30000, likes: 23, liked: false },
  { trader: "DeFiNinja", asset: "SOL-PERP", side: "Long", size: 200, price: 187.34, pnl: 1234, time: Date.now() - 120000, likes: 45, liked: false },
  { trader: "SteadyHands", asset: "ETH-PERP", side: "Long", size: 5, price: 3456, pnl: 890, time: Date.now() - 300000, likes: 67, liked: false },
  { trader: "MoonShot", asset: "BTC-PERP", side: "Short", size: 0.5, price: 87234, pnl: -234, time: Date.now() - 600000, likes: 12, liked: false },
]

function fmt(n: number) { return n >= 1e6 ? (n/1e6).toFixed(2)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : n.toFixed(0) }
function ago(ts: number) { const s = Math.floor((Date.now()-ts)/1000); return s < 60 ? s+"s" : s < 3600 ? Math.floor(s/60)+"m" : Math.floor(s/3600)+"h" }

export default function App() {
  const [page, setPage] = useState("leaderboard")
  const [traders, setTraders] = useState<Trader[]>(TRADERS)
  const [trades, setTrades] = useState<Trade[]>(LIVE_TRADES)
  const [markets, setMarkets] = useState<MarketData[]>(MARKETS)
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
  const [notif, setNotif] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<"pnl" | "winrate" | "volume">("pnl")
  const [alerts, setAlerts] = useState<string[]>([])
  const [wallet, setWallet] = useState("")
  const [walletConnected, setWalletConnected] = useState(false)

  async function connectWallet() {
    const phantom = (window as any).solana
    if (phantom && phantom.isPhantom) {
      try {
        const response = await phantom.connect()
        const pubkey = response.publicKey.toString()
        setWallet(pubkey.slice(0, 4) + "..." + pubkey.slice(-4))
        setWalletConnected(true)
        toast("✅ Phantom connected!")
      } catch {
        setWallet("Demo...1234")
        setWalletConnected(true)
        toast("✅ Demo mode!")
      }
    } else {
      setWallet("Demo...1234")
      setWalletConnected(true)
      toast("✅ Demo mode — Install Phantom for full access!")
    }
  }

  const toast = (m: string) => { setNotif(m); setTimeout(() => setNotif(""), 3000) }

  // Fetch real Pacifica market data
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("https://api.pacifica.fi/api/v1/info/prices")
        const data = await res.json()
        if (data.success && data.data) {
          const symbols = ["BTC", "ETH", "SOL", "ARB", "DOGE", "SUI", "XRP", "HYPE"]
          const updated = data.data
            .filter((m: any) => symbols.includes(m.symbol))
            .map((m: any) => ({
              symbol: m.symbol + "-PERP",
              price: parseFloat(m.mark),
              change: ((parseFloat(m.mark) - parseFloat(m.yesterday_price)) / parseFloat(m.yesterday_price)) * 100,
              volume: parseFloat(m.volume_24h),
              fundingRate: parseFloat(m.funding),
            }))
          if (updated.length > 0) setMarkets(updated)
        }
      } catch {
        // fallback to mock data
      }
    }
    fetchMarkets()
    const interval = setInterval(fetchMarkets, 5000)
    return () => clearInterval(interval)
  }, [])

  // Simulate trader updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTraders(prev => prev.map(t => ({
        ...t,
        pnl: t.pnl + (Math.random() - 0.48) * 100,
        pnlPercent: t.pnlPercent + (Math.random() - 0.48) * 0.1,
        followers: t.followers + Math.floor(Math.random() * 3),
      })))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  async function analyzeTrader(trader: Trader) {
    setAnalyzing(true)
    setAiAnalysis("")
    try {
      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-calls": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: `Analyze this crypto trader in 3 sentences: Name: ${trader.name}, PnL: $${trader.pnl.toFixed(0)}, Win Rate: ${trader.winRate}%, Trades: ${trader.trades}, Risk: ${trader.riskScore}, Top Asset: ${trader.topAsset}. Give trading style assessment and risk advice.` }]
        })
      })
      const data = await res.json()
      setAiAnalysis(data.content?.[0]?.text || "Analysis unavailable")
    } catch {
      setAiAnalysis("AI analysis temporarily unavailable. Based on stats: " + (trader.winRate > 80 ? "Conservative, consistent trader with excellent win rate." : trader.winRate > 60 ? "Balanced trader with moderate risk appetite." : "Aggressive trader, high risk - copy with caution."))
    }
    setAnalyzing(false)
  }

  function copyTrader(trader: Trader) {
    toast("✅ Now copying " + trader.name + " — auto-executing their trades!")
  }

  function followTrader(id: string) {
    setTraders(prev => prev.map(t => t.id === id ? { ...t, isFollowing: !t.isFollowing } : t))
    const t = traders.find(x => x.id === id)
    toast(t?.isFollowing ? "Unfollowed " + t?.name : "Following " + t?.name)
  }

  function likeTrade(idx: number) {
    setTrades(prev => prev.map((t, i) => i === idx ? { ...t, likes: t.liked ? t.likes - 1 : t.likes + 1, liked: !t.liked } : t))
  }

  function addAlert(msg: string) {
    setAlerts(prev => [msg, ...prev.slice(0, 4)])
    toast("🔔 " + msg)
  }

  const sorted = [...traders].sort((a, b) =>
    filter === "pnl" ? b.pnl - a.pnl :
    filter === "winrate" ? b.winRate - a.winRate :
    b.volume - a.volume
  )

  const S: Record<string, any> = {
    app: { minHeight: "100vh", background: "#05070d", color: "#e8edf5", fontFamily: "sans-serif", paddingBottom: "64px" },
    header: { background: "rgba(8,12,20,0.97)", borderBottom: "1px solid #1a2540", padding: "0 16px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 50 },
    card: { background: "#080c14", border: "1px solid #1a2540", borderRadius: "10px", padding: "14px", marginBottom: "8px" },
    nav: { position: "fixed" as const, bottom: 0, left: 0, right: 0, background: "#080c14", borderTop: "1px solid #1a2540", display: "flex", height: "56px", zIndex: 100 },
    pill: (c: string) => ({ background: c+"18", border: "1px solid "+c+"40", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: 700, color: c }),
    green: { color: "#00ff88" },
    red: { color: "#ff3366" },
    gold: { color: "#ffaa00" },
    mono: { fontFamily: "monospace" },
    btnG: { background: "linear-gradient(135deg,#00ff88,#00cc6a)", border: "none", borderRadius: "8px", color: "#000", padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "12px" },
    btnGhost: { background: "transparent", border: "1px solid #1a2540", borderRadius: "8px", color: "#e8edf5", padding: "8px 16px", cursor: "pointer", fontSize: "12px" },
  }

  return (
    <div style={S.app}>
      {notif && <div style={{ position: "fixed" as const, top: "60px", left: "50%", transform: "translateX(-50%)", background: "#0c1220", border: "1px solid #00ff8840", borderRadius: "6px", padding: "8px 18px", zIndex: 200, color: "#00ff88", fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap" as const }}>{notif}</div>}

      {/* ══ LEADERBOARD ══ */}
      {page === "leaderboard" && <>
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Trophy size={16} color="#ffaa00" />
            <span style={{ fontWeight: 800, fontSize: "16px" }}>Pacifica<span style={S.gold}>Race</span></span>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {(["pnl","winrate","volume"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...S.btnGhost, padding: "4px 10px", fontSize: "10px", border: `1px solid ${filter===f?"#ffaa00":"#1a2540"}`, color: filter===f?"#ffaa00":"#8899bb" }}>{f === "pnl" ? "PnL" : f === "winrate" ? "Win%" : "Vol"}</button>
            ))}
            <button onClick={connectWallet} style={{ background: walletConnected ? "#0c1220" : "linear-gradient(135deg,#ffaa00,#ff8800)", border: "1px solid #ffaa0040", borderRadius: "6px", color: walletConnected ? "#ffaa00" : "#000", padding: "4px 10px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
              {walletConnected ? wallet : "Connect"}
            </button>
          </div>
        </div>

        {/* Market Ticker */}
        <div style={{ background: "#080c14", borderBottom: "1px solid #1a2540", padding: "8px 16px", display: "flex", gap: "16px", overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          {markets.map(m => (
            <div key={m.symbol} style={{ flexShrink: 0, cursor: "pointer" }}>
              <span style={{ fontSize: "10px", color: "#8899bb", fontFamily: "monospace" }}>{m.symbol} </span>
              <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: m.change >= 0 ? "#00ff88" : "#ff3366" }}>${fmt(m.price)}</span>
              <span style={{ fontSize: "10px", color: m.change >= 0 ? "#00ff88" : "#ff3366", marginLeft: "4px" }}>{m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px" }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{ ...S.card, cursor: "pointer", border: i === 0 ? "1px solid #ffaa0040" : "1px solid #1a2540" }} onClick={() => { setSelectedTrader(t); setPage("trader"); analyzeTrader(t) }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "10px", color: i===0?"#ffaa00":i===1?"#c0c0c0":i===2?"#cd7f32":"#4a5a7a", fontFamily: "monospace", width: "20px", paddingTop: "4px", fontWeight: 700 }}>#{i+1}</div>
                <div style={{ fontSize: "28px" }}>{t.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{t.name}</span>
                    {t.badges.map((b, bi) => <span key={bi} style={{ fontSize: "12px" }}>{b}</span>)}
                    <span style={{ ...S.pill(t.riskScore==="Low"?"#00ff88":t.riskScore==="Medium"?"#ffaa00":"#ff3366") }}>{t.riskScore}</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: "11px", color: t.pnl >= 0 ? "#00ff88" : "#ff3366", fontWeight: 700, fontFamily: "monospace" }}>{t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}</span>
                    <span style={{ fontSize: "11px", color: "#8899bb" }}>Win: {t.winRate}%</span>
                    <span style={{ fontSize: "11px", color: "#8899bb" }}>Vol: ${fmt(t.volume)}</span>
                    <span style={{ fontSize: "11px", color: "#8899bb" }}>👥{fmt(t.followers)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={e => { e.stopPropagation(); copyTrader(t) }} style={{ ...S.btnG, padding: "6px 10px", fontSize: "10px" }}>Copy</button>
                  <button onClick={e => { e.stopPropagation(); followTrader(t.id) }} style={{ ...S.btnGhost, padding: "6px 10px", fontSize: "10px", border: t.isFollowing ? "1px solid #00ff88" : "1px solid #1a2540", color: t.isFollowing ? "#00ff88" : "#e8edf5" }}>{t.isFollowing ? "✓" : "+"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ══ TRADER PROFILE ══ */}
      {page === "trader" && selectedTrader && <>
        <div style={S.header}>
          <button onClick={() => setPage("leaderboard")} style={{ background: "none", border: "none", color: "#8899bb", cursor: "pointer", fontSize: "18px" }}>←</button>
          <span style={{ fontWeight: 700 }}>{selectedTrader.avatar} {selectedTrader.name}</span>
          <button onClick={() => { navigator.clipboard.writeText("Check out " + selectedTrader.name + " on PacificaRace!"); toast("Link copied!") }} style={{ background: "none", border: "none", color: "#8899bb", cursor: "pointer" }}><Share2 size={16} /></button>
        </div>
        <div style={{ padding: "12px" }}>
          {/* Stats */}
          <div style={{ ...S.card, background: "linear-gradient(135deg,#080c14,#0c1a2e)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" as const }}>
              {[
                { l: "Total PnL", v: (selectedTrader.pnl >= 0 ? "+" : "") + "$" + fmt(selectedTrader.pnl), c: selectedTrader.pnl >= 0 ? "#00ff88" : "#ff3366" },
                { l: "Win Rate", v: selectedTrader.winRate + "%", c: "#ffaa00" },
                { l: "Trades", v: selectedTrader.trades.toString(), c: "#8899bb" },
                { l: "Volume", v: "$" + fmt(selectedTrader.volume), c: "#8899bb" },
                { l: "Followers", v: fmt(selectedTrader.followers), c: "#8899bb" },
                { l: "Risk", v: selectedTrader.riskScore, c: selectedTrader.riskScore==="Low"?"#00ff88":selectedTrader.riskScore==="Medium"?"#ffaa00":"#ff3366" },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: s.c, fontFamily: "monospace" }}>{s.v}</div>
                  <div style={{ fontSize: "10px", color: "#4a5a7a" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Brain size={14} color="#8855ff" />
              <span style={{ fontSize: "12px", fontWeight: 700 }}>AI Analysis</span>
            </div>
            {analyzing ? <div style={{ color: "#8899bb", fontSize: "12px" }}>🤖 Analyzing trader...</div> : <div style={{ color: "#8899bb", fontSize: "12px", lineHeight: 1.6 }}>{aiAnalysis || "Click to analyze"}</div>}
          </div>

          {/* Open Positions */}
          {selectedTrader.positions.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5a7a", marginBottom: "10px" }}>OPEN POSITIONS</div>
              {selectedTrader.positions.map((p, i) => (
                <div key={i} style={{ background: "#05070d", borderRadius: "8px", padding: "10px", marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "13px" }}>{p.asset}</span>
                      <span style={{ marginLeft: "8px", ...S.pill(p.side === "Long" ? "#00ff88" : "#ff3366") }}>{p.side}</span>
                      <span style={{ marginLeft: "6px", fontSize: "10px", color: "#4a5a7a" }}>{p.leverage}x</span>
                    </div>
                    <span style={{ color: p.pnl >= 0 ? "#00ff88" : "#ff3366", fontWeight: 700, fontFamily: "monospace" }}>{p.pnl >= 0 ? "+" : ""}${fmt(p.pnl)}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#8899bb", marginTop: "4px", fontFamily: "monospace" }}>Entry: ${fmt(p.entryPrice)} → ${fmt(p.currentPrice)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...S.btnG, flex: 1, padding: "12px" }} onClick={() => copyTrader(selectedTrader)}>⚡ Copy Trader</button>
            <button style={{ ...S.btnGhost, flex: 1, padding: "12px" }} onClick={() => { followTrader(selectedTrader.id); setSelectedTrader(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null) }}>{selectedTrader.isFollowing ? "✓ Following" : "+ Follow"}</button>
          </div>
        </div>
      </>}

      {/* ══ LIVE FEED ══ */}
      {page === "feed" && <>
        <div style={S.header}>
          <span style={{ fontWeight: 800 }}>Live Feed</span>
          <span style={{ ...S.pill("#ff3366"), display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: 6, height: 6, background: "#ff3366", borderRadius: "50%", display: "inline-block", animation: "pulse 1s infinite" }} />LIVE</span>
        </div>
        <div style={{ padding: "12px" }}>
          {trades.map((t, i) => (
            <div key={i} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>{t.trader}</span>
                    <span style={S.pill(t.side === "Long" ? "#00ff88" : "#ff3366")}>{t.side}</span>
                    <span style={{ fontSize: "11px", color: "#8899bb", fontFamily: "monospace" }}>{t.asset}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#8899bb", fontFamily: "monospace" }}>
                    Size: {t.size} @ ${fmt(t.price)} · PnL: <span style={{ color: t.pnl >= 0 ? "#00ff88" : "#ff3366", fontWeight: 700 }}>{t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#4a5a7a", marginTop: "4px" }}>{ago(t.time)} ago</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px" }}>
                  <button onClick={() => likeTrade(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>{t.liked ? "❤️" : "🤍"}</button>
                  <span style={{ fontSize: "10px", color: "#4a5a7a" }}>{t.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ══ MARKETS ══ */}
      {page === "markets" && <>
        <div style={S.header}><span style={{ fontWeight: 800 }}>Markets</span></div>
        <div style={{ padding: "12px" }}>
          {markets.map(m => (
            <div key={m.symbol} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "monospace" }}>{m.symbol}</div>
                  <div style={{ fontSize: "11px", color: "#4a5a7a", marginTop: "2px" }}>Vol: ${fmt(m.volume)} · Funding: <span style={{ color: m.fundingRate >= 0 ? "#00ff88" : "#ff3366" }}>{(m.fundingRate * 100).toFixed(4)}%</span></div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "monospace" }}>${m.price > 1000 ? m.price.toLocaleString("en", {maximumFractionDigits: 1}) : m.price.toFixed(4)}</div>
                  <div style={{ color: m.change >= 0 ? "#00ff88" : "#ff3366", fontWeight: 700, fontSize: "13px" }}>{m.change >= 0 ? "▲" : "▼"}{Math.abs(m.change).toFixed(2)}%</div>
                </div>
              </div>
              <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                <button onClick={() => { addAlert(m.symbol + " price alert set!") }} style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px" }}><Bell size={11} /> Alert</button>
                <button onClick={() => toast("Opening " + m.symbol + " on Pacifica...")} style={{ ...S.btnG, fontSize: "11px", padding: "5px 10px" }}>Trade →</button>
              </div>
            </div>
          ))}

          {alerts.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5a7a", marginBottom: "8px" }}>ACTIVE ALERTS</div>
              {alerts.map((a, i) => <div key={i} style={{ fontSize: "12px", color: "#ffaa00", padding: "3px 0" }}>🔔 {a}</div>)}
            </div>
          )}
        </div>
      </>}

      {/* ══ NAV ══ */}
      <nav style={S.nav}>
        {[
          { id: "leaderboard", l: "Leaders", i: <Trophy size={16} /> },
          { id: "feed", l: "Feed", i: <Flame size={16} /> },
          { id: "markets", l: "Markets", i: <BarChart3 size={16} /> },
        ].map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ flex: 1, background: "none", border: "none", color: page===n.id?"#ffaa00":"#4a5a7a", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: "2px", fontSize: "9px", fontWeight: page===n.id?700:500 }}>
            {n.i}<span>{n.l}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
