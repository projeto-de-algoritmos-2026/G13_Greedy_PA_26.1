import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, Pencil, Plus, X, Check, Info, Ticket as TicketIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Priorizador Inteligente de Tickets — EDF" },
      { name: "description", content: "Priorize tickets de suporte com o algoritmo Earliest Deadline First (Atraso Mínimo)." },
    ],
  }),
});

type Ticket = {
  id: string;
  name: string;
  duration: number; // dias
  deadline: string; // ISO yyyy-mm-dd
};

const DURATION_OPTIONS = [1, 2, 3, 5, 9];

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function Index() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number>(1);
  const [deadline, setDeadline] = useState<string>(todayISO());
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [tickets]
  );

  const today = todayISO();

  const computed = useMemo(() => {
    let acc = 0;
    return sorted.map((t) => {
      acc += t.duration;
      const finishDate = new Date(today);
      finishDate.setDate(finishDate.getDate() + acc);
      const deadlineDays = daysBetween(today, t.deadline);
      const slack = deadlineDays - acc;
      let status: "ontime" | "risk" | "late";
      if (slack < 0) status = "late";
      else if (slack <= 1) status = "risk";
      else status = "ontime";
      return { ticket: t, accumulated: acc, finishDate, slack, status };
    });
  }, [sorted, today]);

  const metrics = useMemo(() => {
    const total = computed.length;
    const totalTime = computed.reduce((s, c) => s + c.ticket.duration, 0);
    const onTime = computed.filter((c) => c.status !== "late").length;
    const late = computed.filter((c) => c.status === "late").length;
    return { total, totalTime, onTime, late };
  }, [computed]);

  function resetForm() {
    setName("");
    setDuration(1);
    setDeadline(todayISO());
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      setTickets((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, name: name.trim(), duration, deadline } : t))
      );
    } else {
      setTickets((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: name.trim(), duration, deadline },
      ]);
    }
    resetForm();
  }

  function handleEdit(t: Ticket) {
    setEditingId(t.id);
    setName(t.name);
    setDuration(t.duration);
    setDeadline(t.deadline);
  }

  function handleRemove(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2.5 text-primary-foreground shadow-[var(--shadow-card)]">
              <TicketIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Priorizador Inteligente de Tickets
              </h1>
              <p className="text-sm text-muted-foreground">
                Algoritmo de Atraso Mínimo · Earliest Deadline First
              </p>
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Total de tickets" value={metrics.total} icon={<TicketIcon className="h-4 w-4" />} />
          <MetricCard label="Tempo total (dias)" value={metrics.totalTime} icon={<Clock className="h-4 w-4" />} />
          <MetricCard label="No prazo" value={metrics.onTime} accent="success" icon={<CheckCircle2 className="h-4 w-4" />} />
          <MetricCard label="Irão atrasar" value={metrics.late} accent="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Form */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {editingId ? "Editar ticket" : "Novo ticket"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Descrição">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reset de senha do cliente X"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  required
                />
              </Field>
              <Field label="Tempo estimado (dias)">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? "dia" : "dias"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Deadline">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={todayISO()}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  required
                />
              </Field>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar alterações" : "Adicionar Ticket"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* List */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Fila priorizada</h2>
              <span className="text-xs text-muted-foreground">Ordenada por deadline mais próximo</span>
            </div>

            {computed.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Nenhum ticket cadastrado. Adicione o primeiro para ver a priorização.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Ticket</th>
                      <th className="px-2 py-2">Tempo</th>
                      <th className="px-2 py-2">Deadline</th>
                      <th className="px-2 py-2">Acumulado</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.map((c, i) => (
                      <tr key={c.ticket.id} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-3 font-medium text-muted-foreground">#{i + 1}</td>
                        <td className="px-2 py-3 font-medium text-foreground">{c.ticket.name}</td>
                        <td className="px-2 py-3 text-foreground">{c.ticket.duration}d</td>
                        <td className="px-2 py-3 text-foreground">
                          {new Date(c.ticket.deadline).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </td>
                        <td className="px-2 py-3 text-foreground">{c.accumulated}d</td>
                        <td className="px-2 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEdit(c.ticket)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(c.ticket.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-danger"
                              aria-label="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Explanation */}
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-accent p-2 text-accent-foreground">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="mb-1 text-base font-semibold text-foreground">Como o algoritmo funciona</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Este sistema utiliza o algoritmo de <strong>Atraso Mínimo</strong> (Minimum Delay
                Scheduling / Earliest Deadline First). Sempre que um ticket é adicionado, editado ou
                removido, a fila é reordenada pelo <strong>prazo mais próximo primeiro</strong>. Em
                seguida, o tempo acumulado de execução é calculado para cada ticket, considerando os
                anteriores na fila. Caso o tempo acumulado ultrapasse o deadline do ticket, ele é
                marcado como atrasado. Está provado que essa estratégia minimiza o atraso máximo
                (lateness) entre todas as ordenações possíveis.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "success" | "danger";
}) {
  const accentClass =
    accent === "success"
      ? "text-success"
      : accent === "danger"
      ? "text-danger"
      : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${accentClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ontime" | "risk" | "late" }) {
  const map = {
    ontime: { label: "No prazo", cls: "bg-success/15 text-success" },
    risk: { label: "Risco de atraso", cls: "bg-warning/20 text-warning-foreground" },
    late: { label: "Atrasado", cls: "bg-danger/15 text-danger" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
