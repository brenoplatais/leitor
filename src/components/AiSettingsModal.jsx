import { useState } from 'react'
import { AI_MODELS } from '../lib/aiConfig'
import { Close, Check } from './Icons'

/**
 * Settings for the optional AI detection mode. The key is stored only in this
 * browser (localStorage); when a detection runs, the article text goes directly
 * from here to the Anthropic API — never through any server of ours.
 */
export default function AiSettingsModal({ open, initial, onSave, onClose }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false)
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [model, setModel] = useState(initial?.model ?? AI_MODELS[0].id)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Detecção por IA</h3>
            <p className="text-xs text-slate-400">
              Classificação semântica das seções — mais precisa, inclusive em ensaios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <Close />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Ativar modo IA na detecção de estrutura
              </span>
              <span className="block text-xs text-slate-500">
                Quando ligado, o botão “Detectar estrutura” usa a IA em vez da heurística
                offline.
              </span>
            </span>
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Chave da API Anthropic
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1 text-xs text-slate-400">
              Crie uma chave em console.anthropic.com. Ela fica salva só neste navegador.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            <strong>Privacidade:</strong> ao detectar, o texto do artigo é enviado
            diretamente do seu navegador para a API da Anthropic (não passa por nenhum
            servidor nosso). O uso é cobrado na sua conta Anthropic. A leitura por voz e a
            heurística continuam 100% offline.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ enabled, apiKey: apiKey.trim(), model })}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Check width={16} height={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
