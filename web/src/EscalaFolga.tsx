import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
    collection, onSnapshot, addDoc, query, serverTimestamp, deleteDoc, doc 
} from "firebase/firestore";
import { 
    Plus, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    BarChart3, LayoutGrid, CalendarDays, AlertCircle 
} from 'lucide-react';

interface EscalaFolgaProps {
    motoristaId: string;
    onVoltar: () => void;
}

const TIPOS_ESCALA = {
    'Presente': { sigla: 'P', cor: '#3b82f6', bg: '#eff6ff', desc: 'Presente' },
    'Descanso Semanal': { sigla: 'DS', cor: '#10b981', bg: '#ecfdf5', desc: 'Descanso Semanal' },
    'Férias': { sigla: 'FE', cor: '#f59e0b', bg: '#fffbeb', desc: 'Férias' },
    'Falta': { sigla: 'F', cor: '#ef4444', bg: '#fef2f2', desc: 'Falta' },
    'Atestado': { sigla: 'A', cor: '#8b5cf6', bg: '#f5f3ff', desc: 'Atestado Médico' },
};

const EscalaFolga: React.FC<EscalaFolgaProps> = ({ motoristaId, onVoltar }) => {
    const [eventos, setEventos] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'mensal' | 'anual'>('mensal');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tipo, setTipo] = useState('Presente');
    const [dataInicio, setDataInicio] = useState('');

    const subColecaoRef = collection(db, "motoristas", motoristaId, "escalas_motoristas");

    useEffect(() => {
        const unsub = onSnapshot(subColecaoRef, (snap) => {
            const list: any[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setEventos(list.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)));
        });
        return () => unsub();
    }, [motoristaId]);

    // Lógica de Estatísticas e Regra 6x1
    const { stats, diasDesdeUltimaFolga } = useMemo(() => {
        const now = new Date();
        const counts: any = { P: 0, DS: 0, FE: 0, F: 0, A: 0 };
        
        // Estatísticas Anuais (Ano Corrente)
        eventos.forEach(ev => {
            const evDate = new Date(ev.dataInicio);
            if (evDate.getFullYear() === currentDate.getFullYear()) {
                const sigla = TIPOS_ESCALA[ev.tipo as keyof typeof TIPOS_ESCALA]?.sigla;
                if (sigla) counts[sigla]++;
            }
        });

        // Cálculo 6x1 (Dias trabalhados seguidos desde a última folga/descanso)
        let contagemTrabalho = 0;
        const eventosOrdenados = [...eventos].reverse();
        for (const ev of eventosOrdenados) {
            if (ev.tipo === 'Descanso Semanal' || ev.tipo === 'Férias') break;
            if (ev.tipo === 'Presente') contagemTrabalho++;
        }

        return { stats: counts, diasDesdeUltimaFolga: contagemTrabalho };
    }, [eventos, currentDate]);

    const salvarEscala = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dataInicio) return alert("Selecione a data");
        try {
            await addDoc(subColecaoRef, { tipo, dataInicio, criadoEm: serverTimestamp() });
            setDataInicio('');
        } catch (error) { console.error(error); }
    };

    const renderMensal = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const startDay = new Date(year, month, 1).getDay();
        const days = [];

        for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} style={dayStyle}></div>);

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const eventoNoDia = eventos.find(ev => ev.dataInicio === dateStr);
            const config = eventoNoDia ? TIPOS_ESCALA[eventoNoDia.tipo as keyof typeof TIPOS_ESCALA] : null;

            days.push(
                <div key={d} style={{
                    ...dayStyle,
                    backgroundColor: config ? config.bg : 'white',
                    border: config ? `1px solid ${config.cor}33` : '1px solid #f1f5f9'
                }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{d}</span>
                    {config && (
                        <div style={{ fontSize: '10px', fontWeight: '900', color: config.cor }}>{config.sigla}</div>
                    )}
                </div>
            );
        }
        return (
            <div style={calendarGrid}>
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => <div key={d} style={weekHeaderStyle}>{d}</div>)}
                {days}
            </div>
        );
    };

    const renderAnual = () => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {months.map(m => {
                    const monthName = new Date(currentDate.getFullYear(), m).toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                    const totalDays = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                    const monthEvents = eventos.filter(ev => {
                        const d = new Date(ev.dataInicio);
                        return d.getMonth() === m && d.getFullYear() === currentDate.getFullYear();
                    });

                    return (
                        <div key={m} style={miniMonthCard}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', marginBottom: '10px', textAlign: 'center' }}>{monthName}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                {Array.from({ length: totalDays }, (_, d) => {
                                    const dateStr = `${currentDate.getFullYear()}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                                    const ev = monthEvents.find(e => e.dataInicio === dateStr);
                                    return (
                                        <div key={d} style={{ 
                                            width: '100%', height: '8px', borderRadius: '2px',
                                            backgroundColor: ev ? TIPOS_ESCALA[ev.tipo as keyof typeof TIPOS_ESCALA]?.cor : '#f1f5f9'
                                        }}></div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100%' }}>
            <button onClick={onVoltar} style={voltarStyle}>← Voltar ao Menu</button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ color: '#1e2937', margin: 0, fontSize: '28px', fontWeight: '700' }}>Controle de Escala</h2>
                    <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Gestão de disponibilidade e regra 6x1</p>
                </div>

                {/* Alternador de Visualização */}
                <div style={toggleContainer}>
                    <button onClick={() => setViewMode('mensal')} style={viewMode === 'mensal' ? activeToggle : inactiveToggle}>
                        <CalendarDays size={16} /> Mensal
                    </button>
                    <button onClick={() => setViewMode('anual')} style={viewMode === 'anual' ? activeToggle : inactiveToggle}>
                        <LayoutGrid size={16} /> Anual
                    </button>
                </div>
            </div>

            {/* Painel de Alerta 6x1 e Totais */}
            <div style={statsGrid}>
                <div style={{ ...statsCard, borderLeft: `6px solid ${diasDesdeUltimaFolga >= 6 ? '#ef4444' : '#10b981'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <AlertCircle size={18} color={diasDesdeUltimaFolga >= 6 ? '#ef4444' : '#10b981'} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Ciclo de Trabalho (6x1)</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e2937' }}>
                        {diasDesdeUltimaFolga} <span style={{ fontSize: '14px', color: '#94a3b8' }}>dias seguidos</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '5px 0 0 0' }}>
                        {diasDesdeUltimaFolga >= 6 ? '⚠️ ATENÇÃO: Motorista deve folgar!' : 'Motorista dentro do ciclo normal.'}
                    </p>
                </div>

                <div style={statsCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <BarChart3 size={16} color="#3b82f6" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Resumo do Ano {currentDate.getFullYear()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {Object.entries(stats).map(([sigla, count]) => (
                            <div key={sigla} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>{sigla}</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: (count as number) > 0 ? '#1e2937' : '#cbd5e1' }}>{count as number}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>Lançar Registro</h3>
                        <form onSubmit={salvarEscala}>
                            <label style={labelStyle}>Status</label>
                            <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
                                {Object.keys(TIPOS_ESCALA).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <label style={labelStyle}>Data</label>
                            <input type="date" style={inputStyle} value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
                            <button type="submit" style={btnStyle}><Plus size={18} /> Registrar</button>
                        </form>
                    </div>

                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>Legenda</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(TIPOS_ESCALA).map(([nome, info]) => (
                                <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: info.bg, color: info.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px', border: `1px solid ${info.cor}33` }}>{info.sigla}</div>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{nome}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CalendarIcon size={24} color="#3b82f6" />
                            <h3 style={{ fontSize: '20px', color: '#1e2937', margin: 0, fontWeight: '700' }}>
                                {viewMode === 'mensal' 
                                    ? currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
                                    : `VISÃO ANUAL ${currentDate.getFullYear()}`}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} style={navBtnStyle}><ChevronLeft size={20} /></button>
                            <button onClick={() => setCurrentDate(new Date())} style={{ ...navBtnStyle, fontSize: '11px', fontWeight: '700', padding: '0 12px' }}>HOJE</button>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} style={navBtnStyle}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    
                    {viewMode === 'mensal' ? renderMensal() : renderAnual()}
                </div>
            </div>
        </div>
    );
};

// Estilos Refinados
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' };
const statsCard: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' };
const toggleContainer: React.CSSProperties = { display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px', gap: '4px' };
const inactiveToggle: React.CSSProperties = { background: 'none', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' };
const activeToggle: React.CSSProperties = { ...inactiveToggle, backgroundColor: 'white', color: '#1e2937', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 25px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' };
const cardTitleStyle: React.CSSProperties = { fontSize: '13px', fontWeight: '800', color: '#1e2937', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' };
const btnStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const voltarStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '15px', fontWeight: '600', fontSize: '14px' };
const calendarGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' };
const weekHeaderStyle: React.CSSProperties = { textAlign: 'center', padding: '10px', fontSize: '11px', fontWeight: '800', color: '#94a3b8' };
const dayStyle: React.CSSProperties = { height: '70px', padding: '8px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' };
const navBtnStyle: React.CSSProperties = { border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };
const miniMonthCard: React.CSSProperties = { padding: '10px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' };

export default EscalaFolga;
