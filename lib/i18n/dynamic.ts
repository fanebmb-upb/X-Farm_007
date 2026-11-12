import { ro } from "./ro.ts";

// Runtime text from the simulation (stored in English so older saves and the
// database keep working) translated by pattern. Unmatched text is returned as is.
const patterns: Array<[RegExp, (...groups: string[]) => string]> = [
  [/^Soil moisture reached ([\d.]+)% · 3 L estimated · simulated$/, (value) => `Umiditatea solului a ajuns la ${value}% · ~3 L estimat · simulat`],
  [/^([\d.]+) °C exceeded the ([\d.]+) °C threshold · simulated$/, (value, limit) => `${value} °C a depășit pragul de ${limit} °C · simulat`],
  [/^([\d.]+) °C exceeded the ([\d.]+) °C threshold$/, (value, limit) => `${value} °C a depășit pragul de ${limit} °C`],
  [/^Light is below (\d+) µmol\/m²\/s · simulated$/, (value) => `Lumina este sub ${value} µmol/m²/s · simulat`],
  [/^Greenhouse A · (\d+) plants · 3 L estimated · simulated$/, (count) => `Sera A · ${count} ${count === "1" ? "plantă" : "plante"} · ~3 L estimat · simulat`],
  [/^(\d{4}-\d{2}-\d{2}): forecast low (-?[\d.]+) °C may affect exposed plants\.$/, (date, value) => `${date}: minima prognozată de ${value} °C poate afecta plantele neprotejate.`],
  [/^(\d{4}-\d{2}-\d{2}): forecast high (-?[\d.]+) °C may increase plant water stress\.$/, (date, value) => `${date}: maxima prognozată de ${value} °C poate crește stresul hidric al plantelor.`],
  [/^(\d{4}-\d{2}-\d{2})(?:, up to (\d+)% chance)?(?:, ([\d.]+) mm forecast)?\. Check soil conditions before watering\.$/, (date, chance, amount) => `${date}${chance ? `, probabilitate de până la ${chance}%` : ""}${amount ? `, ${amount} mm prognozați` : ""}. Verificați solul înainte de udare.`],
  [/^(\d{4}-\d{2}-\d{2}): maximum UV index ([\d.]+); consider shade for sensitive plants\.$/, (date, value) => `${date}: indice UV maxim ${value}; umbriți plantele sensibile.`],
  [/^(.+) growth$/, (name) => `Creștere ${name}`],
  [/^(Ventilation|Grow lights) returned to automatic control$/, (label) => label === "Ventilation" ? "Ventilația a revenit la control automat" : "Lămpile de creștere au revenit la control automat"],
  [/^(Ventilation|Grow lights) manually (activated|deactivated)$/, (label, state) => label === "Ventilation" ? `Ventilație ${state === "activated" ? "pornită" : "oprită"} manual` : `Lămpi de creștere ${state === "activated" ? "pornite" : "oprite"} manual`],
  [/^(Ventilation|Grow lights) (activated|deactivated)$/, (label, state) => label === "Ventilation" ? `Ventilație ${state === "activated" ? "pornită" : "oprită"}` : `Lămpi de creștere ${state === "activated" ? "pornite" : "oprite"}`],
];

export function translateDynamicRo(text: string): string {
  if (ro[text]) return ro[text];
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(text);
    if (match) return render(...match.slice(1));
  }
  return text;
}
