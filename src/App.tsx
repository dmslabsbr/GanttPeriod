/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Copy, Calendar, BarChart3, Info, CheckCircle2, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Period {
  id: string;
  start: string;
  end: string;
  name: string;
}

interface CalculationResults {
  totalGrossDays: number;
  concurrentDays: number;
  netDays: number;
  periodSummaries: string[];
}

// --- Utils ---

const dateToString = (date: Date) => {
  if (!date || isNaN(date.getTime())) return '';
  try {
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(NaN);
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return date;
};

const diffInDays = (start: Date, end: Date) => {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (e) {
    return '';
  }
};

// --- Main Component ---

export default function App() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [ganttScale, setGanttScale] = useState<'auto' | 'months' | 'years'>('auto');
  const [viewRange, setViewRange] = useState<{ start: number; end: number } | null>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<Period | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState<{ start: number; end: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load initial data
  useEffect(() => {
    const savedNames = localStorage.getItem('calc_concomitancia_names');
    if (savedNames) {
      setHistory(JSON.parse(savedNames));
    }

    const today = new Date();
    const todayStr = dateToString(today);
    
    setPeriods([{
      id: crypto.randomUUID(),
      start: todayStr,
      end: todayStr,
      name: 'Período-01'
    }]);
  }, []);

  // --- Zoom & Pan Logic ---

  const resetView = () => setViewRange(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (!ganttData || !svgRef.current) return;
    e.preventDefault();

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    const currentStart = viewRange?.start ?? ganttData.minTime;
    const currentEnd = viewRange?.end ?? ganttData.maxTime;
    const currentRange = currentEnd - currentStart;

    const mouseTime = currentStart + (mouseX / width) * currentRange;
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const newRange = currentRange * zoomFactor;
    // Constrain zoom (e.g., minimum 1 day, maximum 100 years)
    if (newRange < 86400000 || newRange > 3153600000000) return;

    const newStart = mouseTime - (mouseX / width) * newRange;
    const newEnd = newStart + newRange;

    setViewRange({ start: newStart, end: newEnd });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!ganttData) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime({
      start: viewRange?.start ?? ganttData.minTime,
      end: viewRange?.end ?? ganttData.maxTime
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (isDragging && dragStartTime && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = e.clientX - dragStartX;
      const currentRange = dragStartTime.end - dragStartTime.start;
      const timeShift = -(dx / rect.width) * currentRange;
      
      setViewRange({
        start: dragStartTime.start + timeShift,
        end: dragStartTime.end + timeShift
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Consolidate unique names into history (Historical + Active)
  const allAvailableNames = useMemo(() => {
    const currentInInputs = periods.map(p => p.name).filter(n => n.trim() !== '');
    return Array.from(new Set([...history, ...currentInInputs])).sort();
  }, [history, periods]);

  const commitToHistory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || history.includes(trimmed)) return;

    const newHistory = [...history, trimmed].sort();
    setHistory(newHistory);
    localStorage.setItem('calc_concomitancia_names', JSON.stringify(newHistory));
  };

  const getTicks = (min: number, max: number, scale: 'auto' | 'months' | 'years') => {
    const ticks: number[] = [];
    if (scale === 'auto') {
      return [0, 0.25, 0.5, 0.75, 1].map(p => min + p * (max - min));
    }

    const start = new Date(min);
    const end = new Date(max);

    if (scale === 'years') {
      let current = new Date(start.getFullYear(), 0, 1);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) ticks.push(current.getTime());
        current.setFullYear(current.getFullYear() + 1);
      }
    } else if (scale === 'months') {
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) ticks.push(current.getTime());
        current.setMonth(current.getMonth() + 1);
      }
    }

    if (ticks.length < 2) return [min, max];
    return ticks;
  };

  const movePeriod = (id: string, direction: 'up' | 'down') => {
    const index = periods.findIndex(p => p.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === periods.length - 1) return;

    const newPeriods = [...periods];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPeriods[index], newPeriods[targetIndex]] = [newPeriods[targetIndex], newPeriods[index]];
    setPeriods(newPeriods);
  };

  const addPeriod = () => {
    const todayStr = dateToString(new Date());
    const lastPeriod = periods[periods.length - 1];
    let nextStart = new Date();
    if (lastPeriod) {
      nextStart = parseDate(lastPeriod.end);
    }
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 1);

    // Limit to today
    const finalStart = parseDate(todayStr) < nextStart ? todayStr : dateToString(nextStart);
    const finalEnd = parseDate(todayStr) < nextEnd ? todayStr : dateToString(nextEnd);

    const nextIdx = (periods.length + 1).toString().padStart(2, '0');

    setPeriods([...periods, {
      id: crypto.randomUUID(),
      start: finalStart,
      end: finalEnd,
      name: `Período-${nextIdx}`
    }]);
  };

  const removePeriod = (id: string) => {
    if (periods.length > 1) {
      setPeriods(periods.filter(p => p.id !== id));
    }
  };

  const updatePeriod = (id: string, field: keyof Period, value: string) => {
    const todayStr = dateToString(new Date());
    
    setPeriods(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      // Prevent future dates
      let finalValue = value;
      if ((field === 'start' || field === 'end') && value > todayStr) {
        finalValue = todayStr;
      }
      
      const updated = { ...p, [field]: finalValue };
      
      // Auto-logic: If start is updated, set end to start + 1 (limited by today)
      if (field === 'start' && finalValue) {
        const d = parseDate(finalValue);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 1);
          const calculatedEnd = dateToString(d);
          // Limit end to today
          updated.end = calculatedEnd > todayStr ? todayStr : calculatedEnd;
        }
      }
      
      return updated;
    }));
  };

  // --- Core Calculation Logic ---

  const results = useMemo((): CalculationResults => {
    if (periods.length === 0) return { totalGrossDays: 0, concurrentDays: 0, netDays: 0, periodSummaries: [] };

    const intervals = periods.map(p => ({
      start: parseDate(p.start).getTime(),
      end: parseDate(p.end).getTime(),
      name: p.name
    })).filter(i => i.end > i.start);

    // Flatten all points
    const pointsSet = new Set<number>();
    intervals.forEach(i => {
      pointsSet.add(i.start);
      pointsSet.add(i.end);
    });
    const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b);

    let totalGrossDays = 0;
    let concurrentDays = 0;
    let netDays = 0;

    // Calculate segments
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const s = sortedPoints[i];
      const e = sortedPoints[i+1];
      const mid = (s + e) / 2;
      
      const overlappingIntervals = intervals.filter(iv => mid >= iv.start && mid < iv.end);
      const count = overlappingIntervals.length;
      const durationDays = Math.floor((e - s) / (1000 * 60 * 60 * 24));

      if (count >= 1) {
        netDays += durationDays;
      }
      if (count > 1) {
        concurrentDays += durationDays;
      }
    }

    // Individual Summaries with Overlaps
    const periodSummaries = periods.map((p, idx) => {
      const start = parseDate(p.start);
      const end = parseDate(p.end);
      const days = diffInDays(start, end);
      totalGrossDays += days;

      const pS = start.getTime();
      const pE = end.getTime();
      
      const overlaps: string[] = [];
      periods.forEach((other, oIdx) => {
        if (idx === oIdx) return;
        const oS = parseDate(other.start).getTime();
        const oE = parseDate(other.end).getTime();

        const intersectStart = Math.max(pS, oS);
        const intersectEnd = Math.min(pE, oE);

        if (intersectStart < intersectEnd) {
          const overlapDays = Math.floor((intersectEnd - intersectStart) / (1000 * 60 * 60 * 24));
          if (overlapDays > 0) {
            const dateRange = `(${formatDate(dateToString(new Date(intersectStart)))} a ${formatDate(dateToString(new Date(intersectEnd)))})`;
            overlaps.push(`  - ${overlapDays} dias concomitantes com ${other.name || `Período-${(oIdx + 1).toString().padStart(2, '0')}`} ${dateRange};`);
          }
        }
      });

      let summary = `${p.name || `Período-${(idx + 1).toString().padStart(2, '0')}`}: ${formatDate(p.start)} até ${formatDate(p.end)} (${days} dias)`;
      if (overlaps.length > 0) {
        summary += '\n' + overlaps.join('\n');
      }
      
      return summary;
    });

    return { totalGrossDays, concurrentDays, netDays, periodSummaries };
  }, [periods]);

  const totalYears = (results.netDays / 365).toFixed(2);
  const quinquenios = (parseFloat(totalYears) / 5).toFixed(2);

  const fullSummaryText = useMemo(() => {
    const lines = [
      "RESUMO DE PERÍODOS",
      "-------------------------",
      ...results.periodSummaries,
      "-------------------------",
      `DIAS TOTAIS (BRUTO): ${results.totalGrossDays}`,
      `DIAS CONCOMITANTES: ${results.concurrentDays}`,
      `DIAS LÍQUIDOS (REAL): ${results.netDays}`,
      `TOTAL EM ANOS: ${totalYears} anos`,
      `TOTAL EM QUINQUÊNIOS: ${quinquenios} quinquênios`,
      "-------------------------",
      `Gerado em: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`
    ];
    return lines.join('\n');
  }, [results, totalYears, quinquenios]);

  const copyToClipboard = () => {
    if (summaryRef.current) {
      summaryRef.current.select();
      navigator.clipboard.writeText(fullSummaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Gantt Chart Logic ---

  const ganttData = useMemo(() => {
    if (periods.length === 0) return null;
    const startTimes = periods.map(p => parseDate(p.start).getTime());
    const endTimes = periods.map(p => parseDate(p.end).getTime());
    
    let minTime = Math.min(...startTimes);
    let maxTime = Math.max(...endTimes);

    // Expand range based on scale to align ticks and bars
    if (ganttScale === 'months') {
      const dMin = new Date(minTime);
      minTime = new Date(dMin.getFullYear(), dMin.getMonth(), 1).getTime();
      const dMax = new Date(maxTime);
      maxTime = new Date(dMax.getFullYear(), dMax.getMonth() + 1, 1).getTime();
    } else if (ganttScale === 'years') {
      const dMin = new Date(minTime);
      minTime = new Date(dMin.getFullYear(), 0, 1).getTime();
      const dMax = new Date(maxTime);
      maxTime = new Date(dMax.getFullYear() + 1, 0, 1).getTime();
    }

    const range = maxTime - minTime || 86400000; // default 1 day if range is 0

    return { minTime, maxTime, range };
  }, [periods, ganttScale]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden p-6">
      <datalist id="names-list">
        {allAvailableNames.map(name => <option key={name} value={name} />)}
      </datalist>

      {/* Header */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">GanttPeriod Pro</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cálculo de Concomitância Serverless</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={copyToClipboard}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar Resumo'}
          </button>
          <button 
            onClick={addPeriod}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Adicionar Período
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-12 gap-6 flex-grow min-h-0">
        
        {/* Sidebar: Period Inputs */}
        <aside className="col-span-5 flex flex-col gap-4 min-h-0">
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700 uppercase">Entrada de Períodos</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-mono">
                {periods.length.toString().padStart(2, '0')} Itens
              </span>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4 flex-grow custom-scrollbar">
              <AnimatePresence initial={false}>
                {periods.map((p) => {
                  const todayStr = dateToString(new Date());
                  const days = diffInDays(parseDate(p.start), parseDate(p.end));
                  const isInvalid = parseDate(p.end) <= parseDate(p.start) || p.end > todayStr || p.start > todayStr;
                  const statusClass = days < 90 ? 'input-error' : days < 180 ? 'input-warn' : '';

                  return (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="period-card bg-slate-50 border border-slate-200 rounded-lg p-3 relative group flex gap-3"
                    >
                      <div className="flex-grow">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Início</label>
                            <input 
                              type="date"
                              value={p.start}
                              max={todayStr}
                              onChange={(e) => updatePeriod(p.id, 'start', e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Fim</label>
                            <input 
                              type="date"
                              min={p.start}
                              max={todayStr}
                              value={p.end}
                              onChange={(e) => updatePeriod(p.id, 'end', e.target.value)}
                              className={`w-full px-2 py-1.5 rounded border text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white ${
                                isInvalid ? 'border-red-500' : 'border-slate-200'
                              } ${statusClass}`}
                            />
                          </div>
                        </div>
                        
                        <div className="relative">
                          <input 
                            type="text"
                            list="names-list"
                            value={p.name}
                            onBlur={(e) => commitToHistory(e.target.value)}
                            onChange={(e) => updatePeriod(p.id, 'name', e.target.value)}
                            placeholder="Nome do período"
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium bg-white"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                            {days}d
                          </div>
                        </div>

                        {isInvalid && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase tracking-wider">
                            <AlertTriangle size={10} />
                            Data inválida
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-col justify-center gap-1.5 pl-3 border-l border-slate-200 shrink-0">
                        <button 
                          onClick={() => movePeriod(p.id, 'up')}
                          disabled={periods.indexOf(p) === 0}
                          className="w-6 h-6 bg-white border border-slate-200 text-slate-400 rounded-md flex items-center justify-center hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          title="Mover para cima"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => movePeriod(p.id, 'down')}
                          disabled={periods.indexOf(p) === periods.length - 1}
                          className="w-6 h-6 bg-white border border-slate-200 text-slate-400 rounded-md flex items-center justify-center hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          title="Mover para baixo"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button 
                          disabled={periods.length <= 1}
                          onClick={() => removePeriod(p.id)}
                          className="w-6 h-6 bg-white border border-slate-200 text-slate-400 rounded-md flex items-center justify-center hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-0 transition-all shadow-sm"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/30">
               <button 
                onClick={addPeriod}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all text-xs font-bold uppercase tracking-wider"
              >
                + Novo Item
              </button>
            </div>
          </section>
        </aside>

        {/* Main Content Area */}
        <div className="col-span-7 flex flex-col gap-6 min-h-0">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dias Totais</p>
              <p className="text-xl font-bold text-slate-800 tracking-tight">{results.totalGrossDays}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Concomitantes</p>
              <p className="text-xl font-bold text-amber-600 tracking-tight">{results.concurrentDays}<span className="text-[9px] ml-0.5">d</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total em Anos</p>
              <p className="text-xl font-bold text-emerald-600 tracking-tight">{totalYears}<span className="text-[9px] ml-0.5 text-slate-400">a</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quinquênios</p>
              <p className="text-xl font-bold text-indigo-500 tracking-tight">{quinquenios}<span className="text-[9px] ml-0.5 text-slate-400">q</span></p>
            </div>
          </div>

          <div className="bg-indigo-600 px-6 py-4 rounded-xl shadow-lg shadow-indigo-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">Total de Dias Líquidos (Real)</p>
              <p className="text-4xl font-black text-white tracking-tighter">{results.netDays}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-indigo-200 justify-end mb-1">
                <BarChart3 size={16} />
                <span className="text-[10px] font-bold uppercase">Métricas de Prazo</span>
              </div>
              <p className="text-xs font-medium text-white opacity-80 italic">Calculado com base em {periods.length} períodos</p>
            </div>
          </div>

          {/* Gantt Chart Display */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-grow flex flex-col min-h-0 relative">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Visualização de Gantt</h2>
                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                  {(['auto', 'months', 'years'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setGanttScale(s)}
                      className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                        ganttScale === s 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {s === 'auto' ? 'Auto' : s === 'months' ? 'Mensal' : 'Anual'}
                    </button>
                  ))}
                </div>
                {viewRange && (
                  <button 
                    onClick={resetView}
                    className="text-[9px] font-bold uppercase bg-slate-100 px-3 py-1.2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200"
                  >
                    Resetar Zoom
                  </button>
                )}
              </div>
              <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> PERÍODO
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400/40 border border-red-400/60"></span> SOBREPOSIÇÃO
                </div>
              </div>
            </div>
            <div 
              className="flex-grow p-6 overflow-y-auto overflow-x-hidden relative cursor-grab active:cursor-grabbing select-none custom-scrollbar"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <AnimatePresence>
                {hoveredPeriod && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{ 
                      position: 'fixed', 
                      left: mousePos.x + 15, 
                      top: mousePos.y + 15,
                      pointerEvents: 'none',
                      zIndex: 100
                    }}
                    className="bg-slate-900 text-white p-3 rounded-lg shadow-2xl border border-slate-700 min-w-[180px]"
                  >
                    <p className="text-xs font-black uppercase text-indigo-400 mb-1">{hoveredPeriod.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-[10px] text-slate-400 font-bold">INÍCIO</span>
                        <span className="text-[10px] font-mono">{formatDate(hoveredPeriod.start)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[10px] text-slate-400 font-bold">FIM</span>
                        <span className="text-[10px] font-mono">{formatDate(hoveredPeriod.end)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-baseline">
                        <span className="text-[10px] text-indigo-300 font-bold italic">DURAÇÃO</span>
                        <div className="text-right">
                          <p className="text-lg font-black text-white leading-none">{diffInDays(parseDate(hoveredPeriod.start), parseDate(hoveredPeriod.end))}d</p>
                          <p className="text-[10px] font-bold text-slate-500">{(diffInDays(parseDate(hoveredPeriod.start), parseDate(hoveredPeriod.end)) / 365).toFixed(2)} anos</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {ganttData && (
                <svg 
                  ref={svgRef}
                  width="100%" 
                  height={Math.max(200, periods.length * 35 + 50)} 
                  className="rounded-lg overflow-visible"
                >
                  {/* Grid Lines */}
                  {getTicks(viewRange?.start ?? ganttData.minTime, viewRange?.end ?? ganttData.maxTime, ganttScale).map((time, idx, arr) => {
                    const currentStart = viewRange?.start ?? ganttData.minTime;
                    const currentEnd = viewRange?.end ?? ganttData.maxTime;
                    const currentRange = currentEnd - currentStart;
                    
                    const x = ((time - currentStart) / currentRange) * 100;
                    if (x < 0 || x > 100) return null;

                    return (
                       <g key={idx}>
                         <line x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#f1f5f9" strokeWidth="1" />
                         <text 
                          x={`${x}%`} 
                          y="10" 
                          fontSize="9" 
                          fontWeight="bold"
                          fill="#cbd5e1" 
                          textAnchor={idx === 0 ? "start" : idx === arr.length - 1 ? "end" : "middle"}
                         >
                          {formatDate(dateToString(new Date(time)))}
                         </text>
                       </g>
                    );
                  })}
                  
                  {/* Bars */}
                  {periods.map((p, idx) => {
                    const currentStart = viewRange?.start ?? ganttData.minTime;
                    const currentEnd = viewRange?.end ?? ganttData.maxTime;
                    const currentRange = currentEnd - currentStart;

                    const s = parseDate(p.start).getTime();
                    const e = parseDate(p.end).getTime();
                    
                    // Don't render if completely out of view
                    if (e < currentStart || s > currentEnd) return null;

                    const x = ((s - currentStart) / currentRange) * 100;
                    const w = ((e - s) / currentRange) * 100;
                    const y = 30 + (idx * 35);
                    
                    return (
                      <g 
                        key={p.id} 
                        className="group"
                        onMouseEnter={() => setHoveredPeriod(p)}
                        onMouseLeave={() => setHoveredPeriod(null)}
                      >
                        <rect 
                          x={`${x}%`} 
                          y={y} 
                          width={`${Math.max(0.2, w)}%`} 
                          height="22" 
                          rx="4" 
                          className="fill-indigo-500 hover:fill-indigo-600 transition-colors cursor-help"
                        />
                        <text 
                          x={`${Math.max(0, x)}%`} 
                          y={y - 4} 
                          fontSize="10" 
                          fontWeight="bold" 
                          fill="#64748b"
                          className="pointer-events-none group-hover:fill-indigo-600 transition-colors"
                        >
                          {p.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Overlaps */}
                  {periods.length > 1 && periods.map((p1, i) => 
                    periods.slice(i + 1).map((p2, j) => {
                      const currentStart = viewRange?.start ?? ganttData.minTime;
                      const currentEnd = viewRange?.end ?? ganttData.maxTime;
                      const currentRange = currentEnd - currentStart;

                      const s1 = parseDate(p1.start).getTime();
                      const e1 = parseDate(p1.end).getTime();
                      const s2 = parseDate(p2.start).getTime();
                      const e2 = parseDate(p2.end).getTime();
                      const oStart = Math.max(s1, s2);
                      const oEnd = Math.min(e1, e2);

                      if (oStart < oEnd && oEnd > currentStart && oStart < currentEnd) {
                        const ox = ((Math.max(oStart, currentStart) - currentStart) / currentRange) * 100;
                        const actualEnd = Math.min(oEnd, currentEnd);
                        const ow = ((actualEnd - Math.max(oStart, currentStart)) / currentRange) * 100;
                        
                        return (
                          <rect 
                            key={`overlap-${i}-${j}`}
                            x={`${ox}%`} 
                            y="20" 
                            width={`${Math.max(0, ow)}%`} 
                            height="100%" 
                            className="fill-red-400 opacity-20 pointer-events-none" 
                          />
                        );
                      }
                      return null;
                    })
                  )}
                </svg>
              )}
            </div>
          </div>

          {/* Professional Summary Footer Component */}
          <div className="h-56 bg-slate-800 rounded-xl p-4 relative shadow-2xl overflow-hidden shrink-0">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumo Profissional</h2>
                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  Auto-save Ativo
                </div>
             </div>
             <textarea 
              ref={summaryRef}
              readOnly 
              value={fullSummaryText}
              className="w-full h-40 bg-transparent text-slate-300 text-xs font-mono resize-none border-none focus:ring-0 leading-relaxed custom-scrollbar outline-none"
             />
             <div className="absolute top-2 right-4 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500">ESTATÍSTICAS ATUALIZADAS</span>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
