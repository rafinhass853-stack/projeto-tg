import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    query, 
    where,
    serverTimestamp, 
    deleteDoc, 
    doc 
} from "firebase/firestore";
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface EscalaFolgaProps {
    motoristaId: string;
    onVoltar: () => void;
}

// Mapeamento de Tipos, Cores e Siglas
const TIPOS_ESCALA = {
    'Programado': { sigla: 'P', cor: '#3b82f6', bg: '#eff6ff', desc: 'Viagem Programada' },
    'Descanso': { sigla: 'DS', cor: '#10b981', bg: '#ecfdf5', desc: 'Descanso / Folga' },
    'Férias': { sigla: 'FE', cor: '#f59e0b', bg: '#fffbeb', desc: 'Férias' },
    'Falta': { sigla: 'F', cor: '#ef4444', bg: '#fef2f2', desc: 'Falta' },
    'Atestado': { sigla: 'A', cor: '#8b5cf6', bg: '#f5f3ff', desc: 'Atestado Médico' },
};

const EscalaFolga: React.FC<EscalaFolgaProps> = ({ motoristaId, onVoltar }) => {
    const [eventos, setEventos] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const [tipo, setTipo] = useState('Descanso');
    const [dataInicio, setDataInicio] = useState('');

    useEffect(() => {
        const q = query(collection(db, "escalas_motoristas"), where("motoristaId", "==", motoristaId));
        const unsub = onSnapshot(q, (snap) => {
            const list: any[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setEventos(list);
        });
        return () => unsub();
    }, [motoristaId]);

    const salvarEscala = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dataInicio) return alert("Selecione a data");

        try {
            await addDoc(collection(db, "escalas_motoristas"), {
                motoristaId,
                tipo,
                dataInicio,
                criadoEm: serverTimestamp()
            });
            setDataInicio('');
        } catch (error) {
            console.error(error);
        }
    };

    const excluirEscala = async (id: string) => {
        if(window.confirm("Excluir este registro?")) {
            await deleteDoc(doc(db, "escalas_motoristas", id));
        }
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
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
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{d}</span>
                    {config && (
                        <div style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            color: config.cor,
                            backgroundColor: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {config.sigla}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100%' }}>
            <button onClick={onVoltar} style={voltarStyle}>← Voltar ao Menu</button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ color: '#1e2937', margin: 0, fontSize: '28px', fontWeight: '700' }}>Escala e Folgas</h2>
                    <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Gerenciamento de disponibilidade do motorista</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
                {/* Coluna Lateral: Form e Legenda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>Lançar Evento</h3>
                        <form onSubmit={salvarEscala}>
                            <label style={labelStyle}>Tipo de Registro</label>
                            <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
                                {Object.keys(TIPOS_ESCALA).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <label style={labelStyle}>Data</label>
                            <input type="date" style={inputStyle} value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />

                            <button type="submit" style={btnStyle}><Plus size={18} /> Registrar na Agenda</button>
                        </form>
                    </div>

                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>Legenda</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(TIPOS_ESCALA).map(([nome, info]) => (
                                <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '30px', height: '30px', borderRadius: '6px', 
                                        backgroundColor: info.bg, color: info.cor,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: '800', fontSize: '12px', border: `1px solid ${info.cor}33`
                                    }}>{info.sigla}</div>
                                    <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{info.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calendário Principal */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CalendarIcon size={24} color="#3b82f6" />
                            <h3 style={{ fontSize: '20px', color: '#1e2937', margin: 0, fontWeight: '700' }}>
                                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} style={navBtnStyle}><ChevronLeft size={20} /></button>
                            <button onClick={() => setCurrentDate(new Date())} style={{ ...navBtnStyle, fontSize: '12px', fontWeight: '600', padding: '0 15px' }}>HOJE</button>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} style={navBtnStyle}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    
                    <div style={calendarGrid}>
                        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                            <div key={d} style={weekHeaderStyle}>{d}</div>
                        ))}
                        {renderCalendar()}
                    </div>

                    <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>Últimos Lançamentos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {eventos.slice(-4).map(ev => (
                                <div key={ev.id} style={itemStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: TIPOS_ESCALA[ev.tipo as keyof typeof TIPOS_ESCALA]?.cor }}></div>
                                        <span>{new Date(ev.dataInicio).toLocaleDateString('pt-BR')} - <b>{ev.tipo}</b></span>
                                    </div>
                                    <button onClick={() => excluirEscala(ev.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Estilos Refinados
const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 25px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' };
const cardTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', color: '#1e2937', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' };
const btnStyle: React.CSSProperties = { width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' };
const voltarStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '15px', fontWeight: '600', fontSize: '14px' };
const itemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '12px' };
const calendarGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' };
const weekHeaderStyle: React.CSSProperties = { textAlign: 'center', padding: '10px', fontSize: '11px', fontWeight: '800', color: '#94a3b8' };
const dayStyle: React.CSSProperties = { height: '90px', padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' };
const navBtnStyle: React.CSSProperties = { border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };

export default EscalaFolga;
