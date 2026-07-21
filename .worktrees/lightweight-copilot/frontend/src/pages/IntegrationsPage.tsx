import { useState } from "react";

type Integration = {
  slug: string;
  name: string;
  category: "CRM" | "GRC" | "Docs" | "Messaging" | "Ticketing";
  description: string;
  connected: boolean;
  logo: string;      // emoji fallback
};

const INTEGRATIONS: Integration[] = [
  { slug: "slack", name: "Slack", category: "Messaging",
    description: "Route review requests and conflict alerts to any channel.",
    connected: true, logo: "💬" },
  { slug: "salesforce", name: "Salesforce", category: "CRM",
    description: "Auto-draft when a security-review stage is reached in an Opportunity.",
    connected: false, logo: "☁️" },
  { slug: "hubspot", name: "HubSpot", category: "CRM",
    description: "Attach the drafted questionnaire to the deal record.",
    connected: false, logo: "🎯" },
  { slug: "vanta", name: "Vanta", category: "GRC",
    description: "Pull live control status so answers reflect current posture.",
    connected: false, logo: "🛡️" },
  { slug: "drata", name: "Drata", category: "GRC",
    description: "Sync evidence and controls into the library.",
    connected: false, logo: "🛡️" },
  { slug: "onetrust", name: "OneTrust", category: "GRC",
    description: "Import assessments and export approved answers.",
    connected: false, logo: "🏛️" },
  { slug: "jira", name: "Jira", category: "Ticketing",
    description: "File gaps as security tickets automatically.",
    connected: false, logo: "🎫" },
  { slug: "servicenow", name: "ServiceNow", category: "Ticketing",
    description: "Route reviews through your incident/change flow.",
    connected: false, logo: "🧭" },
  { slug: "gdrive", name: "Google Drive", category: "Docs",
    description: "Ingest policies and reports as source of truth.",
    connected: false, logo: "📁" },
  { slug: "sharepoint", name: "SharePoint", category: "Docs",
    description: "Auto-ingest updated policies from your corporate SharePoint.",
    connected: false, logo: "🗂️" },
  { slug: "teams", name: "Microsoft Teams", category: "Messaging",
    description: "Route notifications to Teams channels.",
    connected: false, logo: "🟪" },
  { slug: "confluence", name: "Confluence", category: "Docs",
    description: "Read policies straight from your Confluence spaces.",
    connected: false, logo: "📘" },
];


export default function IntegrationsPage() {
  const [modal, setModal] = useState<Integration | null>(null);
  const [waitlisted, setWaitlisted] = useState<Set<string>>(new Set());

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="text-slate-600 mt-1">
          Connect Trust Copilot to the tools your team already uses.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((it) => (
          <div key={it.slug} className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xl">
                {it.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">{it.name}</div>
                <div className="text-xs text-slate-500">{it.category}</div>
              </div>
              {it.connected ? (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                  Connected ✓
                </span>
              ) : waitlisted.has(it.slug) ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  On waitlist
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-600 mt-3 flex-1">{it.description}</p>
            {!it.connected && (
              <button
                onClick={() => setModal(it)}
                disabled={waitlisted.has(it.slug)}
                className="mt-3 px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {waitlisted.has(it.slug) ? "You'll hear from us" : "Connect"}
              </button>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl">{modal.logo}</div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{modal.name} — coming soon</h3>
            <p className="text-slate-600 mt-2 text-sm">
              We're rolling out {modal.name} integration in Q1 2026. Join the waitlist and we'll
              notify your team when it lands.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setWaitlisted((prev) => new Set(prev).add(modal.slug));
                  setModal(null);
                }}
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
