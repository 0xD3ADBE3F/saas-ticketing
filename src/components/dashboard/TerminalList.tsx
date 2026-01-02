"use client";

import { useState } from "react";

interface Terminal {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  event: { id: string; title: string } | null;
}

interface Event {
  id: string;
  title: string;
}

interface TerminalListProps {
  terminals: Terminal[];
  events: Event[];
  isAdmin: boolean;
  organizationId: string;
}

export function TerminalList({
  terminals: initialTerminals,
  events,
  isAdmin,
  organizationId,
}: TerminalListProps) {
  const [terminals, setTerminals] = useState(initialTerminals);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/scanner/terminals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: formName,
          eventId: formEventId || undefined,
          expiresAt: formExpiresAt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kon terminal niet aanmaken");
      }

      const { terminal } = await res.json();

      // Add to list
      setTerminals((prev) => [
        {
          ...terminal,
          event: formEventId
            ? events.find((e) => e.id === formEventId) || null
            : null,
        },
        ...prev,
      ]);

      // Reset form
      setFormName("");
      setFormEventId("");
      setFormExpiresAt("");
      setShowCreateForm(false);

      // Show the new code
      alert(
        `Terminal aangemaakt!\n\nCode: ${terminal.code}\n\nDeel deze code met je deur-personeel.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (
    terminalId: string,
    currentActive: boolean
  ) => {
    try {
      const res = await fetch(`/api/scanner/terminals/${terminalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentActive ? "deactivate" : "activate",
        }),
      });

      if (!res.ok) {
        throw new Error("Kon terminal status niet wijzigen");
      }

      setTerminals((prev) =>
        prev.map((t) =>
          t.id === terminalId ? { ...t, isActive: !currentActive } : t
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Er ging iets mis");
    }
  };

  const handleDelete = async (terminalId: string) => {
    if (!confirm("Weet je zeker dat je deze terminal wilt verwijderen?")) {
      return;
    }

    try {
      const res = await fetch(`/api/scanner/terminals/${terminalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Kon terminal niet verwijderen");
      }

      setTerminals((prev) => prev.filter((t) => t.id !== terminalId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Er ging iets mis");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6 pt-5">
      {/* Create Button / Form */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Nieuwe Terminal
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Nieuwe Scanner Terminal
              </h3>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Naam <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="bijv. Deur 1, Hoofdingang, Pietje"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beperken tot evenement (optioneel)
                </label>
                <select
                  value={formEventId}
                  onChange={(e) => setFormEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Alle evenementen</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Laat leeg om toegang te geven tot alle evenementen
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vervaldatum (optioneel)
                </label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Laat leeg voor onbeperkte toegang
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {creating ? "Aanmaken..." : "Terminal Aanmaken"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
          📱 Hoe werkt het?
        </h3>
        <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
          <li>Maak een terminal aan met een herkenbare naam</li>
          <li>Deel de 6-cijferige code met je deur-personeel</li>
          <li>
            Zij openen <strong>scan.getentro.app</strong> op hun mobiel en
            voeren de code in
          </li>
          <li>De scanner gebruikt de camera om QR codes te scannen</li>
        </ol>
      </div>

      {/* Terminal List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Actieve Terminals ({terminals.filter((t) => t.isActive).length})
          </h2>
        </div>

        {terminals.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-3">📱</div>
            <p>Nog geen terminals aangemaakt</p>
            <p className="text-sm mt-1">
              Maak een terminal aan om deur-personeel toegang te geven
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {terminals.map((terminal) => (
              <li key={terminal.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400">
                        {terminal.code}
                      </span>
                      {!terminal.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Inactief
                        </span>
                      )}
                      {isExpired(terminal.expiresAt) && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          Verlopen
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                      {terminal.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      <div>
                        📍{" "}
                        {terminal.event
                          ? terminal.event.title
                          : "Alle evenementen"}
                      </div>
                      {terminal.lastUsedAt && (
                        <div>
                          ✅ Laatst gebruikt: {formatDate(terminal.lastUsedAt)}
                        </div>
                      )}
                      {terminal.expiresAt && (
                        <div>⏱️ Verloopt: {formatDate(terminal.expiresAt)}</div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleActive(terminal.id, terminal.isActive)
                        }
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          terminal.isActive
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                        }`}
                      >
                        {terminal.isActive ? "Deactiveren" : "Activeren"}
                      </button>
                      <button
                        onClick={() => handleDelete(terminal.id)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Verwijderen
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
