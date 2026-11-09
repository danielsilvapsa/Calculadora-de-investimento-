import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Percent, 
  Award, 
  HelpCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ChevronRight,
  BarChart3,
  PieChart,
  ShieldCheck,
  Info,
  CheckCircle2,
  Sparkles,
  Building2,
  Receipt
} from 'lucide-react';

// Tabela regressiva de IR para Renda Fixa (em dias corridos)
const getIRRate = (days, assetCategory) => {
  // LCI e LCA são isentos de IR para Pessoa Física
  if (assetCategory === 'LCI' || assetCategory === 'LCA') {
    return 0;
  }
  if (days <= 180) return 22.5;
  if (days <= 360) return 20.0;
  if (days <= 720) return 17.5;
  return 15.0;
};

// Formatação para Moeda BRL
const formatCurrency = (val) => {
  if (isNaN(val) || val === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

// Formatação para Porcentagem
const formatPercent = (val, decimals = 2) => {
  if (isNaN(val) || val === null) return '0,00%';
  return `${Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
};

export default function App() {
  // Parâmetros Globais
  const [initialAmount, setInitialAmount] = useState(10000);
  const [periodValue, setPeriodValue] = useState(12);
  const [periodType, setPeriodType] = useState('months'); // 'months' ou 'days'
  const [selicRate, setSelicRate] = useState(10.75); // Taxa Selic/CDI base padrão
  const [ipcaRate, setIpcaRate] = useState(4.0); // Estimativa IPCA 
a.a.

  // Lista de Ativos de Renda Fixa (máximo 4)
  const [cdbs, setCdbs] = useState([
    { id: 1, name: 'CDB Banco Digital', category: 'CDB', type: 'POS', rate: 110, active: true },
    { id: 2, name: 'LCI Isento de IR', category: 'LCI', type: 'POS', rate: 90, active: true },
    { id: 3, name: 'LCA Inflação+', category: 'LCA', type: 'IPCA', rate: 5.5, active: true },
    { id: 4, name: 'CDB Pré-fixado', category: 'CDB', type: 'PRE', rate: 
12.5, active: true }
  ]);

  // Modais / Dicas de Interface
  const [activeTab, setActiveTab] = useState('comparativo'); // 'comparativo', 'detalhes', 'grafico'

  // Cálculo do total de dias para o IR
  const totalDays = useMemo(() => {
    return periodType === 'months' ? Math.round(periodValue * 30.4167) : Number(periodValue);
  }, [periodValue, periodType]);

  // Alíquota de IR padrão para CDB no prazo selecionado
  const cdbIrTaxRate = useMemo(() => getIRRate(totalDays, 'CDB'), [totalDays]);

  // Cálculo das rentabilidades
  const calculatedResults = useMemo(() => {
    const years = totalDays / 365;

    return cdbs.map((cdb) => {
      if (!cdb.active) return null;

      let annualGrossRate = 0; // Taxa de juros anual equivalente

      if (cdb.type === 'POS') {
        // Pós-fixado: % do CDI (CDI é aprox Selic)
        annualGrossRate = (selicRate * (cdb.rate / 100));
      } else if (cdb.type === 'PRE') {
        // Pré-fixado: % fixo ao ano
        annualGrossRate = Number(cdb.rate);
      } else if (cdb.type === 'IPCA') {
        // IPCA + Taxa Fixo
        // Fórmula exata de juros compostos com inflação: (1 + IPCA) * (1 + Taxa) - 1
        const ipcaDecimal = ipcaRate / 100;
        const realDecimal = Number(cdb.rate) / 100;
        annualGrossRate = ((1 + ipcaDecimal) * (1 + realDecimal) - 1) * 100;
      }

      // Cálculo do montante bruto
      const annualDecimal = annualGrossRate / 100;
      const finalGrossAmount = initialAmount * Math.pow(1 + annualDecimal, years);
      const grossProfit = finalGrossAmount - 
initialAmount;

      // Imposto de Renda (LCI/LCA = 0%, CDB = Regressivo)
      const assetIrTaxRate = getIRRate(totalDays, cdb.category);
      const irAmount = grossProfit * (assetIrTaxRate / 100);
      const finalNetAmount = finalGrossAmount - irAmount;
      const netProfit = finalNetAmount - initialAmount;

      // Percentual de retorno líquido total no período
      const totalNetReturnPercent 
= (netProfit / initialAmount) * 100;

      // Taxa líquida equivalente (% ao ano)
      const annualNetRate = (Math.pow(finalNetAmount / initialAmount, 1 / years) - 1) * 100;

      // Equivalente em CDB % do CDI (para LCIs/LCAs)
      // Ex: Qual % do CDI em CDB eu precisaria para empatar com esta LCI/LCA?
      let cdbEquivalentCdi = 0;
      if (selicRate > 0) {
        if (cdb.category === 'LCI' || cdb.category === 'LCA') {
          const grossEquivalentRate = annualGrossRate / (1 - (cdbIrTaxRate / 100));
          cdbEquivalentCdi = (grossEquivalentRate / selicRate) * 100;
        } else {
          cdbEquivalentCdi = (annualGrossRate / selicRate) * 100;
        }
      }

      return {
        ...cdb,
        annualGrossRate,
        finalGrossAmount,
        grossProfit,
        irAmount,
        irTaxRate: assetIrTaxRate,
        finalNetAmount,
        netProfit,
        totalNetReturnPercent,
        annualNetRate,
        cdbEquivalentCdi
      };
    }).filter(Boolean);
  }, [cdbs, initialAmount, totalDays, selicRate, ipcaRate, cdbIrTaxRate]);

  // Identificar o melhor produto
  const bestCdbId = useMemo(() => {
    if (calculatedResults.length === 0) return null;
    let best = calculatedResults[0];
    calculatedResults.forEach((res) => {
      if (res.finalNetAmount > best.finalNetAmount) {
        best = res;
      }
    });
    return best.id;
  }, [calculatedResults]);

  // Manipuladores de estado do 
ativo
  const updateCdb = (id, field, value) => {
    setCdbs(cdbs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const toggleCdbActive = (id) => {
    setCdbs(cdbs.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  // Valor máximo para barras do gráfico proporcional
  const maxNetAmount = useMemo(() => {
    if (calculatedResults.length === 0) return 1;
    return Math.max(...calculatedResults.map(r => r.finalNetAmount));
  }, [calculatedResults]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 md:p-8">
      {/* Header do App */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start 
md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text 
text-transparent">
              Simulador Renda Fixa: CDB, LCI e LCA
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Compare até 4 títulos de renda fixa (com isenção automática de IR para LCI/LCA) e descubra o melhor retorno.
          </p>
        </div>

        {/* Status Selic / CDI */}
        <div className="flex 
items-center gap-4 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 text-xs sm:text-sm">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">CDI / Selic Referência</span>
            <span className="font-semibold text-emerald-400">{formatPercent(selicRate)} a.a.</span>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">IR CDB ({totalDays} dias)</span>
            <span className="font-semibold text-amber-400">{formatPercent(cdbIrTaxRate, 1)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: PARÂMETROS GLOBAIS E TÍTULOS (5 Colunas no Desktop) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD DE PARÂMETROS GLOBAIS */}
          <div 
className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Parâmetros da Simulação
            </h2>

            <div className="space-y-4">
              {/* Valor Aportado */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Valor Inicial Investido
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    value={initialAmount 
|| ''}
                    onChange={(e) => setInitialAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 font-semibold text-sm outline-none transition"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Prazo do Investimento */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Prazo de Resgate
                  </label>
                  <span className="text-xs text-slate-500">
                    ~{totalDays} dias corridos
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={periodValue || ''}
                    onChange={(e) => setPeriodValue(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 
rounded-xl px-4 py-2.5 text-slate-100 font-semibold text-sm outline-none transition"
                  />
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPeriodType('months')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                        periodType === 'months'
                          ? 'bg-emerald-500 
text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodType('days')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                        periodType === 'days'
                          ? 'bg-emerald-500 
text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dias
                    </button>
                  </div>
                </div>
              </div>

              {/* Taxa Selic / CDI e IPCA ajustáveis */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Taxa CDI/Selic (% a.a.)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={selicRate || ''}
                    onChange={(e) => setSelicRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 
focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Projeção IPCA (% a.a.)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ipcaRate || ''}
                    onChange={(e) => setIpcaRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 text-sm outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* LISTA DE OPÇÕES DE ATIVOS */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-base font-semibold text-slate-300">
                Opções de Títulos ({cdbs.length}/4)
              </h2>
              <span className="text-xs 
text-slate-500">Altere produto e taxas</span>
            </div>

            {cdbs.map((cdb, index) => (
              <div
                key={cdb.id}
                className={`transition-all rounded-2xl p-4 border ${
                  !cdb.active 
                    ? 'bg-slate-900/40 border-slate-850 opacity-60' 
                    : cdb.id === bestCdbId
                    ? 'bg-slate-900/90 border-emerald-500/50 ring-1 
ring-emerald-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cdb.active}
                      onChange={() => toggleCdbActive(cdb.id)}
                      className="w-4 
h-4 rounded text-emerald-500 focus:ring-emerald-500/30 bg-slate-950 border-slate-700"
                    />
                    <input
                      type="text"
                      value={cdb.name}
                      onChange={(e) => updateCdb(cdb.id, 'name', e.target.value)}
                      className="bg-transparent text-sm font-semibold text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-emerald-500 
outline-none px-1 py-0.5 rounded"
                      placeholder={`Opção ${index + 1}`}
                    />
                  </div>

                  {cdb.id === bestCdbId && cdb.active && (
                    <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                      <Sparkles className="w-3 h-3" /> Maior Retorno
                    </span>
                  )}
                </div>

                {cdb.active && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Categoria: CDB, LCI, LCA */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Produto</label>
                      <select
                        value={cdb.category}
                        onChange={(e) => updateCdb(cdb.id, 'category', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-semibold text-emerald-400 outline-none focus:border-emerald-500"
                      >
                        <option value="CDB">CDB (com IR)</option>
                        <option 
value="LCI">LCI (Isento IR)</option>
                        <option value="LCA">LCA (Isento IR)</option>
                      </select>
                    </div>

                    {/* Tipo de Rendimento */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Indexador</label>
                      <select
                        value={cdb.type}
                        onChange={(e) => updateCdb(cdb.id, 'type', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                      >
                        <option value="POS">Pós (% do CDI)</option>
                        <option value="PRE">Pré (% a.a.)</option>
                        <option 
value="IPCA">IPCA + (%)</option>
                      </select>
                    </div>

                    {/* Taxa do Ativo */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {cdb.type === 'POS' ? '% do CDI' : cdb.type === 'PRE' ? 'Taxa % a.a.' : 'Taxa Fixa %'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={cdb.rate}
                          onChange={(e) => updateCdb(cdb.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-medium outline-none focus:border-emerald-500 pr-6"
                        />
                        <span className="absolute right-2 
top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DICA INFORMATIVA DE IR E ISENÇÃO */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 flex items-start 
gap-3">
            <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300 mb-1">CDB vs. LCI e LCA</p>
              <p>• <strong>LCI e LCA:</strong> Isentas de Imposto de Renda para Pessoa Física.</p>
              <p>• <strong>CDB:</strong> Sujeito à tabela regressiva de IR (22,5% até 15%). O simulador converte o rendimento equivalente para 
facilitar a decisão!</p>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: RESULTADOS E VISUALIZAÇÕES (7 Colunas no Desktop) */}
        <div className="lg:col-span-7 space-y-6">

          {/* CABEÇALHO COM TABS DE VISUALIZAÇÃO */}
          <div className="bg-slate-900/90 
border border-slate-800 p-1.5 rounded-2xl flex gap-1">
            <button
              onClick={() => setActiveTab('comparativo')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition ${
                activeTab === 'comparativo'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200 
hover:bg-slate-800/50'
              }`}
            >
              <Award className="w-4 h-4" />
              Comparativo Direct
            </button>
            <button
              onClick={() => setActiveTab('grafico')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition ${
                activeTab === 'grafico'
                  ? 'bg-emerald-500 
text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Gráfico Visual
            </button>
            <button
              onClick={() => setActiveTab('detalhes')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium flex 
items-center justify-center gap-2 transition ${
                activeTab === 'detalhes'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Detalhamento Completo
            </button>
          </div>

          {/* DESTAQUE DO VENCEDOR (PODIUM) */}
          {calculatedResults.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Award className="w-4 h-4" /> Campeão de Rendimento Líquido
                  </span>
                  <div className="flex 
items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {calculatedResults.find(r => r.id === bestCdbId)?.category}
                    </span>
                    <h3 className="text-xl font-bold text-slate-100">
                      {calculatedResults.find(r => r.id === bestCdbId)?.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Equivale a um CDB tributável de <span className="text-emerald-300 font-semibold">{formatPercent(calculatedResults.find(r => r.id === bestCdbId)?.cdbEquivalentCdi, 1)} do CDI</span>
                  </p>
                </div>

                <div className="bg-emerald-500/10 
border border-emerald-500/20 rounded-xl p-3 text-right w-full sm:w-auto">
                  <div className="text-xs text-slate-400">Valor Líquido Final</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {formatCurrency(calculatedResults.find(r => r.id === bestCdbId)?.finalNetAmount)}
                  </div>
                  <div className="text-xs text-emerald-300/80 
font-medium">
                    Lucro de +{formatCurrency(calculatedResults.find(r => r.id === bestCdbId)?.netProfit)} ({formatPercent(calculatedResults.find(r => r.id === bestCdbId)?.totalNetReturnPercent)})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: CARD COMPARATIVO RAPIDO */}
          {activeTab === 
'comparativo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {calculatedResults.map((res) => {
                const isWinner = res.id === bestCdbId;
                const isTaxFree = res.category === 'LCI' || res.category === 'LCA';

                return (
                  <div
                    key={res.id}
                    
className={`rounded-2xl p-5 border transition flex flex-col justify-between ${
                      isWinner
                        ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/20'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div 
className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isTaxFree 
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' 
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {res.category}
                          </span>
                          <h4 className="font-semibold text-slate-200 text-sm truncate 
max-w-[140px]">{res.name}</h4>
                        </div>
                        {isWinner && (
                          <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                            1º Lugar
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mb-4">
                        {res.type === 'POS' && `${res.rate}% do CDI`}
                        {res.type === 'PRE' && `${res.rate}% ao ano (Pré)`}
                        {res.type === 'IPCA' && `IPCA + ${res.rate}% a.a.`}
                      </div>

                      <div className="space-y-2 mb-4 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Rendimento 
Bruto:</span>
                          <span className="font-medium text-slate-200">{formatCurrency(res.grossProfit)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">IR Retido:</span>
                          {isTaxFree ? (
                            <span className="font-medium 
text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded text-[11px]">ISENTO</span>
                          ) : (
                            <span className="font-medium text-rose-400">-{formatCurrency(res.irAmount)} ({res.irTaxRate}%)</span>
                          )}
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Equiv. CDB % 
CDI:</span>
                          <span className="font-medium text-amber-300 font-mono">{formatPercent(res.cdbEquivalentCdi, 1)} CDI</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-end">
                      <div>
                        <span className="text-[10px] 
text-slate-500 block uppercase font-medium">Lucro Líquido</span>
                        <span className="text-sm font-bold text-emerald-400">+{formatCurrency(res.netProfit)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Final</span>
                        <span 
className="text-base font-extrabold text-slate-100">{formatCurrency(res.finalNetAmount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: GRÁFICO COMPARATIVO */}
          {activeTab === 'grafico' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Comparativo de Montante Líquido Final
              </h3>

              <div className="space-y-6">
                
{calculatedResults.map((res) => {
                  const percentage = (res.finalNetAmount / maxNetAmount) * 100;
                  const isWinner = res.id === bestCdbId;
                  const isTaxFree = res.category === 'LCI' || res.category === 'LCA';

                  return (
                    <div key={res.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-200 flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                            {res.category}
                          </span>
                          {res.name}
                          {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </span>
                        <span 
className="font-bold text-slate-100">{formatCurrency(res.finalNetAmount)}</span>
                      </div>

                      <div className="h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinner
                              ? 'bg-gradient-to-r 
from-emerald-500 to-teal-400'
                              : isTaxFree
                              ? 'bg-gradient-to-r from-teal-600 to-cyan-500'
                              : 'bg-gradient-to-r from-slate-600 to-slate-500'
                          }`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Aporte: {formatCurrency(initialAmount)}</span>
                        <span className="text-emerald-400 font-medium">
                          Lucro Líquido: +{formatCurrency(res.netProfit)} ({formatPercent(res.totalNetReturnPercent)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TABELA DETALHADA */}
          {activeTab === 'detalhes' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead 
className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Produto / Investimento</th>
                      <th className="py-3.5 px-4 text-right">Tx. Bruta a.a.</th>
                      <th className="py-3.5 px-4 text-right">Valor Bruto</th>
                      <th className="py-3.5 px-4 
text-right">Imposto (IR)</th>
                      <th className="py-3.5 px-4 text-right">Valor Líquido</th>
                      <th className="py-3.5 px-4 text-right">Equiv. CDB %CDI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {calculatedResults.map((res) => {
                      const isWinner = 
res.id === bestCdbId;
                      const isTaxFree = res.category === 'LCI' || res.category === 'LCA';

                      return (
                        <tr key={res.id} className={isWinner ? 'bg-emerald-950/20' : 'hover:bg-slate-800/30'}>
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 
text-slate-300 font-bold border border-slate-700">
                              {res.category}
                            </span>
                            {res.name}
                            {isWinner && (
                              <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-normal border border-emerald-500/30">
                                Melhor
                              </span>
                            )}
                          </td>
                          <td 
className="py-3.5 px-4 text-right">{formatPercent(res.annualGrossRate)}</td>
                          <td className="py-3.5 px-4 text-right text-slate-200">{formatCurrency(res.finalGrossAmount)}</td>
                          <td className="py-3.5 px-4 text-right">
                            {isTaxFree ? (
                              <span className="text-teal-400 font-semibold">ISENTO</span>
                            ) : (
                              <span className="text-rose-400">
                                -{formatCurrency(res.irAmount)}
                                <span className="block text-[10px] text-slate-500">({res.irTaxRate}%)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                            {formatCurrency(
res.finalNetAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-amber-300 font-mono">
                            {formatPercent(res.cdbEquivalentCdi, 1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESUMO EXPLICATIVO DE SEGURANÇA */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Garantia FGC para CDB, 
LCI e LCA
            </h4>
            <p>
              Tanto os CDBs quanto as LCIs e LCAs contam com a proteção do Fundo Garantidor de Créditos (FGC) até R$ 250.000 por CPF e por conglomerado financeiro (limite de R$ 1 milhão renovável a cada 4 anos).
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}