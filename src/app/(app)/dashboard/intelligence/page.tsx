"use client";

import { useState } from "react";

interface IntelligenceResponse {
  success: boolean;
  myStats: {
    totalPostsAnalyzed: number;
    topPosts: number;
    midPosts: number;
    flopPosts: number;
    avgEngagementRate: string;
    bestFormat: string;
    bestFormatAvgEngagement: string;
    impressionsEstimated: boolean;
  };
  intelligence: {
    whatWorked: string;
    whatFailed: string;
    contentPillars: string;
    xPosts: string[];
    linkedinPosts: string[];
    replyScript: string[];
    competitorGaps: string;
  };
  actionPlan: Record<string, string>;
}

export default function IntelligencePage() {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intelligence/analyze");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Analysis failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400">🧠 Legent Intelligence</h1>
          <p className="text-gray-400 mt-2">
            Analyzes @ankittharol + competitors → writes viral posts
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="w-full py-4 bg-green-500 text-black font-bold text-xl rounded-lg hover:bg-green-400 disabled:bg-gray-600 disabled:text-gray-400 transition mb-8"
        >
          {loading ? "⏳ Analyzing (1-3 min)..." : "🚀 Run Full Analysis + Generate Viral Posts"}
        </button>

        {error && (
          <div className="bg-red-900 border border-red-500 p-4 rounded-lg mb-6">
            <p className="text-red-300 font-bold">Error: {error}</p>
            <p className="text-red-400 text-sm mt-1">
              Check .env.local for TWITTER_BEARER_TOKEN, TWITTER_USER_ID and OPENROUTER_API_KEY.
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {data.myStats.impressionsEstimated && (
              <div className="bg-yellow-900/40 border border-yellow-600 p-3 rounded-lg text-yellow-200 text-xs">
                ⚠️ Impression counts were unavailable from the X API (Free tier), so engagement
                rates are estimates against an assumed 500 impressions. Treat likes/retweets/replies
                as the source of truth.
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Posts Analyzed", value: String(data.myStats.totalPostsAnalyzed) },
                { label: "Avg Engagement", value: data.myStats.avgEngagementRate },
                { label: "Best Format", value: data.myStats.bestFormat },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-900 p-4 rounded-lg border border-gray-700"
                >
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <p className="text-green-400 text-2xl font-bold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <Section title="✅ What's Working" color="green">
              <pre className="whitespace-pre-wrap text-green-300 text-sm">
                {data.intelligence.whatWorked}
              </pre>
            </Section>

            <Section title="❌ What's Failing" color="red">
              <pre className="whitespace-pre-wrap text-red-300 text-sm">
                {data.intelligence.whatFailed}
              </pre>
            </Section>

            <Section title="🎯 Content Pillars (Ranked by YOUR Data)" color="blue">
              <pre className="whitespace-pre-wrap text-blue-300 text-sm">
                {data.intelligence.contentPillars}
              </pre>
            </Section>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-bold text-white mb-4">🐦 X Posts (Copy → Schedule)</h2>
              {data.intelligence.xPosts.map((post, i) => (
                <div key={i} className="mb-4 bg-black p-4 rounded border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">
                      Post {i + 1} — Schedule: Day {i + 1} at 8:00 AM IST
                    </span>
                    <button
                      onClick={() => copyToClipboard(post)}
                      className="text-xs bg-green-800 text-green-300 px-2 py-1 rounded hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-white text-sm whitespace-pre-wrap">{post}</p>
                  <p className="text-gray-600 text-xs mt-2">{post.length}/280 chars</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-bold text-white mb-4">
                💼 LinkedIn Posts (Copy → Schedule)
              </h2>
              {data.intelligence.linkedinPosts.map((post, i) => (
                <div key={i} className="mb-4 bg-black p-4 rounded border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">
                      Post {i + 1} — Schedule: Day {i + 1} at 7:30 AM IST
                    </span>
                    <button
                      onClick={() => copyToClipboard(post)}
                      className="text-xs bg-blue-800 text-blue-300 px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-white text-sm whitespace-pre-wrap">{post}</p>
                </div>
              ))}
            </div>

            <Section title="💬 Reply Scripts (Do BEFORE posting — 40/day)" color="yellow">
              <pre className="whitespace-pre-wrap text-yellow-300 text-sm">
                {data.intelligence.replyScript[0]}
              </pre>
            </Section>

            <Section title="🕳️ Competitor Gaps (Own These)" color="blue">
              <pre className="whitespace-pre-wrap text-blue-300 text-sm">
                {data.intelligence.competitorGaps}
              </pre>
            </Section>

            <div className="bg-green-900 border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-bold text-green-300 mb-3">⚡ Action Plan (Right Now)</h2>
              {Object.entries(data.actionPlan).map(([key, value]) => (
                <div key={key} className="mb-2">
                  <span className="text-green-500 font-bold uppercase text-xs">{key}: </span>
                  <span className="text-green-200 text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: "green" | "red" | "blue" | "yellow";
  children: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    green: "border-green-800",
    red: "border-red-800",
    blue: "border-blue-800",
    yellow: "border-yellow-800",
  };
  return (
    <div className={`bg-gray-900 border ${borderMap[color]} rounded-lg p-4`}>
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
