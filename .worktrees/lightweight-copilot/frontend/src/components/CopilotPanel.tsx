import { useState } from "react";
import { Link } from "react-router-dom";
import { api, AnswerResult } from "../api";
import ProductSelect from "./ProductSelect";

type Message =
  | { kind: "user"; text: string }
  | { kind: "answer"; result: AnswerResult };

export default function CopilotPanel() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const text = question.trim();
    if (!text || busy) return;

    setQuestion("");
    setError(null);
    setBusy(true);
    setMessages((previous) => [...previous, { kind: "user", text }]);
    try {
      const result = await api.answer.draft(text, product || undefined);
      setMessages((previous) => [...previous, { kind: "answer", result }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open Trust Copilot"
      >
        Ask Copilot
      </button>
    );
  }

  return (
    <aside className="fixed bottom-5 right-5 z-40 flex h-[min(42rem,calc(100vh-2.5rem))] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">Trust Copilot</div>
          <p className="mt-0.5 text-xs text-slate-500">Grounded in your approved knowledge library.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
      </div>

      <div className="border-b border-slate-100 px-4 py-2">
        <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Scope answers to product
        </label>
        <ProductSelect value={product} onChange={setProduct} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm bg-white" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
            Ask about encryption, access controls, incident response, or any other customer-assurance topic. Copilot cites the entries it used and flags gaps instead of inventing an answer.
          </div>
        )}
        {messages.map((message, index) => message.kind === "user" ? (
          <div key={index} className="ml-8 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">{message.text}</div>
        ) : (
          <AnswerCard key={index} result={message.result} />
        ))}
        {busy && <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">Searching the knowledge library and drafting a cited answer…</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="border-t border-slate-200 bg-white p-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask();
            }
          }}
          rows={3}
          placeholder="Ask a security-assurance question…"
          className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={busy}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={() => { setMessages([]); setError(null); }} disabled={busy || messages.length === 0}>Clear chat</button>
          <button type="submit" disabled={busy || !question.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>
    </aside>
  );
}

function AnswerCard({ result }: { result: AnswerResult }) {
  const gap = result.verdict === "gap" || !result.answer;
  return (
    <div className={`mr-3 rounded-lg border px-3 py-3 text-sm shadow-sm ${gap ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${gap ? "text-amber-800" : "text-blue-700"}`}>{gap ? "Evidence gap — review needed" : "Grounded answer"}</span>
        <span className="text-xs text-slate-500">{Math.round(result.confidence * 100)}% confidence</span>
      </div>
      {gap ? (
        <p className="mt-2 text-slate-700">Copilot could not find enough approved evidence to draft a safe answer. Review the related entries below or add new evidence.</p>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-slate-800">{result.answer}</p>
      )}
      {result.hits.length > 0 && (
        <div className="mt-3 border-t border-slate-200/70 pt-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Retrieved evidence</div>
          <ul className="mt-1 space-y-1">
            {result.hits.map((hit, index) => (
              <li key={hit.entry_id} className="text-xs text-slate-600">
                <Link to={`/entries?highlight=${hit.entry_id}`} className="text-blue-700 hover:underline">[{index + 1}] {hit.question}</Link>
                <span className="ml-1 text-slate-400">{Math.round(hit.score * 100)}% match</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
