import React, { useEffect, useState, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  Truck, MapPin, Calendar, Clock, AlertCircle, BarChart3, Printer, X, Search, UserCheck, UserMinus
} from 'lucide-react';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  cidade?: string;
  whatsapp?: string;
  telefone?: string;
  cnhCategoria?: string;
  temMopp?: string;
  fotoPerfilUrl?: string;
}

interface CargaProgramada {
  id: string;
  entregaData: string;
  entregaLocal: string;
  entregaCidade?: string;
  placa: string;
  status: 'programada' | 'finalizada';
}

interface ListaMotoristasProps {
  onSelectMotorista: (id: string) => void;
}

const ListaMotoristas: React.FC<ListaMotoristasProps> = ({ onSelectMotorista }) => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [cargasPorMotorista, setCargasPorMotorista] = useState<Record<string, CargaProgramada[]>>({});
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'comProgramacao' | 'semProgramacao'>('todos');
  const [filtroMopp, setFiltroMopp] = useState<'todos' | 'comMopp' | 'semMopp'>('todos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCargas, setLoadingCargas] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'motoristas'), (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      setMotoristas(lista);
      if (lista.length > 0) buscarCargasDeMotoristas(lista);
      else setLoadingCargas(false);
    });
    return () => unsub();
  }, []);

  const buscarCargasDeMotoristas = async (listaMotoristas: Motorista[]) => {
    setLoadingCargas(true);
    const novasCargas: Record<string, CargaProgramada[]> = {};

    for (const motorista of listaMotoristas) {
      if (!motorista.cpf) continue;
      try {
        // AJUSTE: Buscar apenas cargas que NÃO estão finalizadas para definir o status de "Programado"
        const q = query(
          collection(db, 'cargas_programadas'), 
          where('cpf', '==', motorista.cpf),
          where('status', '==', 'programada')
        );
        const snapshot = await getDocs(q);
        const cargas: CargaProgramada[] = [];
        snapshot.forEach(doc => cargas.push({ id: doc.id, ...doc.data() } as CargaProgramada));

        if (cargas.length > 0) {
          // Ordenar pela data de entrega mais próxima (ou futura)
          cargas.sort((a, b) => a.entregaData.localeCompare(b.entregaData));
          novasCargas[motorista.id] = [cargas[0]];
        }
      } catch (err) {
        console.error(err);
      }
    }
    setCargasPorMotorista(novasCargas);
    setLoadingCargas(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'motoristas', id));
      setShowDeleteConfirm(null);
      showNotification('Motorista excluído com sucesso!', 'success');
    } catch {
      showNotification('Erro ao excluir motorista', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 14px 26px; background: ${type === 'success' ? '#10b981' : '#ef4444'}; color: white; border-radius: 14px; font-weight: 600; z-index: 10000;`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3200);
  };

  // Filtros
  const motoristasFiltrados = useMemo(() => {
    return motoristas.filter(m => {
      const temCargaAtiva = !!cargasPorMotorista[m.id];
      const temMopp = m.temMopp === 'Sim';

      const matchTexto = 
        m.nome?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        m.cpf?.includes(filtroTexto) ||
        m.cidade?.toLowerCase().includes(filtroTexto.toLowerCase());

      let matchProgramacao = true;
      if (filtroStatus === 'comProgramacao') matchProgramacao = temCargaAtiva;
      if (filtroStatus === 'semProgramacao') matchProgramacao = !temCargaAtiva;

      let matchMopp = true;
      if (filtroMopp === 'comMopp') matchMopp = temMopp;
      if (filtroMopp === 'semMopp') matchMopp = !temMopp;

      return matchTexto && matchProgramacao && matchMopp;
    });
  }, [motoristas, cargasPorMotorista, filtroTexto, filtroStatus, filtroMopp]);

  const stats = useMemo(() => {
    const total = motoristas.length;
    const comProgramacao = motoristas.filter(m => !!cargasPorMotorista[m.id]).length;
    const semProgramacao = total - comProgramacao;
    const comMopp = motoristas.filter(m => m.temMopp === 'Sim').length;
    const semMopp = total - comMopp;

    return { total, comProgramacao, semProgramacao, comMopp, semMopp };
  }, [motoristas, cargasPorMotorista]);

  const getInitials = (nome: string) => nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const getRandomColor = (id: string) => {
    const colors = ['#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];
    return colors[parseInt(id.slice(0, 8), 16) % colors.length];
  };

  const handleCardClick = (motorista: Motorista, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelectMotorista(motorista.id);
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #modal-report, #modal-report * { visibility: visible; }
          #modal-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; }
        }
      `}</style>

      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>👥 Motoristas Cadastrados</h1>
          <p style={subtitleStyle}>Gerencie sua equipe de motoristas</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button style={reportBtnStyle} onClick={() => setShowReportModal(true)}>
            <BarChart3 size={18} /> Relatório de Status
          </button>
          <div style={statsContainerStyle}>
            <div style={statItemStyle}>
              <span style={statNumberStyle}>{stats.total}</span>
              <span style={statLabelStyle}>Total</span>
            </div>
            <div style={statItemStyle}>
              <span style={{...statNumberStyle, color: '#10b981'}}>{stats.comProgramacao}</span>
              <span style={statLabelStyle}>Programados</span>
            </div>
            <div style={statItemStyle}>
              <span style={{...statNumberStyle, color: '#ef4444'}}>{stats.semProgramacao}</span>
              <span style={statLabelStyle}>Disponíveis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={filtersContainerStyle}>
        <div style={searchWrapperStyle}>
          <span style={searchIconStyle}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou cidade..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={searchInputStyle}
          />
          {filtroTexto && <button onClick={() => setFiltroTexto('')} style={clearButtonStyle}>✕</button>}
        </div>

        <div style={selectsContainerStyle}>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Programação</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} style={selectStyle}>
              <option value="todos">Todos</option>
              <option value="comProgramacao">Com Programação</option>
              <option value="semProgramacao">Sem Programação</option>
            </select>
          </div>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>MOPP</label>
            <select value={filtroMopp} onChange={(e) => setFiltroMopp(e.target.value as any)} style={selectStyle}>
              <option value="todos">Todos</option>
              <option value="comMopp">Com MOPP</option>
              <option value="semMopp">Sem MOPP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Cards */}
      {motoristasFiltrados.length === 0 ? (
        <div style={emptyStateStyle}>
          <AlertCircle size={48} color="#94a3b8" />
          <h3>Nenhum motorista encontrado com os filtros aplicados</h3>
        </div>
      ) : (
        <div style={gridStyle}>
          {motoristasFiltrados.map((m) => {
            const cargas = cargasPorMotorista[m.id] || [];
            const temProgramacao = cargas.length > 0;
            const cargaRecente = cargas[0];

            return (
              <div key={m.id} onClick={(e) => handleCardClick(m, e)} style={cardStyle}>
                <div style={{ ...fotoWrapperStyle, background: `linear-gradient(135deg, ${getRandomColor(m.id)}, #1e40af)` }}>
                  {m.fotoPerfilUrl ? (
                    <img src={m.fotoPerfilUrl} alt={m.nome} style={fotoStyle} />
                  ) : (
                    <div style={initialsStyle}>{getInitials(m.nome)}</div>
                  )}
                  <div style={statusBadgeStyle}>
                    {m.temMopp === 'Sim' ? '✅ MOPP' : '❌ Sem MOPP'}
                  </div>
                </div>

                <div style={contentStyle}>
                  <h3 style={nomeStyle}>{m.nome}</h3>
                  <p style={cpfStyle}>{m.cpf}</p>

                  <div style={infoGridStyle}>
                    <div style={infoItemStyle}>📍 {m.cidade || 'Não informada'}</div>
                    <div style={infoItemStyle}>📱 {m.whatsapp || m.telefone || 'Não informado'}</div>
                  </div>

                  {/* Programação - Visual Melhorado */}
                  <div style={programacaoContainerStyle}>
                    <div style={programacaoHeaderStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="#64748b" />
                        <span style={programacaoTitleStyle}>Programação Atual</span>
                      </div>
                    </div>

                    {loadingCargas ? (
                      <div style={skeletonStyle}>Carregando programação...</div>
                    ) : temProgramacao && cargaRecente ? (
                      <div style={cargaCardStyle}>
                        <div style={cargaHeaderStyle}>
                          <div style={programadoBadgeStyle}>
                            <Truck size={16} /> PROGRAMADO
                          </div>
                          <div style={dataStyle}>
                            <Calendar size={16} style={{ marginRight: '6px' }} />
                            {cargaRecente.entregaData}
                          </div>
                        </div>

                        <p style={empresaStyle}>{cargaRecente.entregaLocal}</p>

                        {cargaRecente.entregaCidade && (
                          <p style={cidadeEntregaStyle}>
                            📍 {cargaRecente.entregaCidade}
                          </p>
                        )}

                        <div style={placaContainerStyle}>
                          <Truck size={18} color="#3b82f6" />
                          <span style={placaStyle}>{cargaRecente.placa}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={semProgramacaoStyle}>
                        <UserCheck size={28} color="#10b981" />
                        <p style={{ color: '#10b981' }}>Disponível / Sem programação</p>
                      </div>
                    )}
                  </div>

                  <div style={actionsStyle}>
                    <button onClick={() => setShowDeleteConfirm(m.id)} style={deleteBtnStyle} disabled={loading}>
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Relatório de Status */}
      {showReportModal && (
        <div style={modalOverlayStyle} onClick={() => setShowReportModal(false)}>
          <div style={reportModalStyle} onClick={e => e.stopPropagation()} id="modal-report">
            <div style={modalHeaderStyle} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BarChart3 size={24} color="#4f46e5" />
                <h2 style={{ margin: 0 }}>Relatório de Status dos Motoristas</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={printBtnStyle} onClick={() => window.print()}>
                  <Printer size={18} /> Imprimir PDF
                </button>
                <button style={closeBtnStyle} onClick={() => setShowReportModal(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div style={modalBodyStyle}>
              <div style={{ marginBottom: '20px' }}>
                <p><strong>Total de Motoristas:</strong> {stats.total}</p>
                <p><strong>Programados:</strong> {stats.comProgramacao}</p>
                <p><strong>Disponíveis:</strong> {stats.semProgramacao}</p>
              </div>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>Nome do Motorista</th>
                    <th>CPF</th>
                    <th>Cidade</th>
                    <th>Status</th>
                    <th>Carga Atual / Placa</th>
                  </tr>
                </thead>
                <tbody>
                  {motoristas.sort((a, b) => a.nome.localeCompare(b.nome)).map(m => {
                    const carga = cargasPorMotorista[m.id]?.[0];
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: '600' }}>{m.nome}</td>
                        <td>{m.cpf}</td>
                        <td>{m.cidade || '---'}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '700',
                            backgroundColor: carga ? '#ecfdf5' : '#fef2f2',
                            color: carga ? '#10b981' : '#ef4444'
                          }}>
                            {carga ? 'PROGRAMADO' : 'SEM PROGRAMAÇÃO'}
                          </span>
                        </td>
                        <td>
                          {carga ? `${carga.entregaLocal} (${carga.placa})` : '---'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exclusão */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(null)}>
          <div style={confirmModalStyle} onClick={e => e.stopPropagation()}>
            <div style={confirmIconStyle}>⚠️</div>
            <h3>Confirmar exclusão</h3>
            <p style={confirmTextStyle}>Tem certeza que deseja excluir este motorista?</p>
            <div style={modalButtonsStyle}>
              <button onClick={() => setShowDeleteConfirm(null)} style={modalCancelButton}>Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={modalConfirmDeleteButton} disabled={loading}>
                {loading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ====================== ESTILOS ====================== */
const containerStyle: React.CSSProperties = { minHeight: '100vh', background: '#f8fafc', padding: '40px 24px' };
const headerStyle: React.CSSProperties = { maxWidth: '1280px', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' };
const titleStyle: React.CSSProperties = { fontSize: '34px', fontWeight: '700', color: '#0f172a', margin: 0 };
const subtitleStyle: React.CSSProperties = { color: '#64748b', fontSize: '16px', margin: 0 };
const statsContainerStyle: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap' };
const statItemStyle: React.CSSProperties = { background: 'white', padding: '12px 18px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', textAlign: 'center', minWidth: '90px' };
const statNumberStyle: React.CSSProperties = { fontSize: '26px', fontWeight: '700' };
const statLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#64748b', fontWeight: '600' };

const reportBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' };

const filtersContainerStyle: React.CSSProperties = { maxWidth: '1280px', margin: '0 auto 40px auto', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'end' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: '1', minWidth: '300px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#64748b' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '16px 50px', border: '2px solid #e2e8f0', borderRadius: '16px', fontSize: '16px', background: 'white', outline: 'none' };
const clearButtonStyle: React.CSSProperties = { position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' };
const selectsContainerStyle: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap' };
const filterGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const filterLabelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#64748b' };
const selectStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '15px', cursor: 'pointer' };

const gridStyle: React.CSSProperties = { maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '28px' };
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', transition: 'all 0.3s ease', cursor: 'pointer' };
const fotoWrapperStyle: React.CSSProperties = { height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const fotoStyle: React.CSSProperties = { width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '5px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' };
const initialsStyle: React.CSSProperties = { width: '110px', height: '110px', borderRadius: '50%', fontSize: '42px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '5px solid white' };
const statusBadgeStyle: React.CSSProperties = { position: 'absolute', top: '20px', right: '20px', background: 'white', padding: '6px 14px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const contentStyle: React.CSSProperties = { padding: '24px' };
const nomeStyle: React.CSSProperties = { fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' };
const cpfStyle: React.CSSProperties = { color: '#64748b', fontSize: '14px', marginBottom: '20px' };
const infoGridStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', textAlign: 'left' };
const infoItemStyle: React.CSSProperties = { fontSize: '15px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' };
const programacaoContainerStyle: React.CSSProperties = { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' };
const programacaoHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' };
const programacaoTitleStyle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#64748b' };
const cargaCardStyle: React.CSSProperties = { backgroundColor: '#f8fafc', border: '2px solid #e0f2fe', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 15px rgba(224, 242, 254, 0.5)' };
const cargaHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' };
const programadoBadgeStyle: React.CSSProperties = { backgroundColor: '#10b981', color: 'white', fontSize: '12.5px', fontWeight: '700', padding: '6px 16px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px' };
const dataStyle: React.CSSProperties = { fontSize: '14px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center' };
const empresaStyle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', lineHeight: '1.3' };
const cidadeEntregaStyle: React.CSSProperties = { fontSize: '14.5px', color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' };
const placaContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const placaStyle: React.CSSProperties = { fontSize: '15.5px', fontWeight: '700', color: '#1e40af' };
const semProgramacaoStyle: React.CSSProperties = { backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', color: '#64748b', fontWeight: '600' };
const skeletonStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' };
const actionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', marginTop: '24px' };
const deleteBtnStyle: React.CSSProperties = { padding: '12px 32px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' };
const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '80px 20px', color: '#64748b' };

const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)', padding: '20px' };
const confirmModalStyle: React.CSSProperties = { background: 'white', borderRadius: '24px', padding: '40px 32px', width: '90%', maxWidth: '420px', textAlign: 'center' };
const confirmIconStyle: React.CSSProperties = { fontSize: '60px', marginBottom: '20px' };
const confirmTextStyle: React.CSSProperties = { color: '#64748b', lineHeight: '1.6', marginBottom: '30px' };
const modalButtonsStyle: React.CSSProperties = { display: 'flex', gap: '16px' };
const modalCancelButton: React.CSSProperties = { flex: 1, padding: '14px', background: '#e2e8f0', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' };
const modalConfirmDeleteButton: React.CSSProperties = { flex: 1, padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' };

const reportModalStyle: React.CSSProperties = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' };
const modalHeaderStyle: React.CSSProperties = { padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 };
const modalBodyStyle: React.CSSProperties = { padding: '32px' };
const printBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default ListaMotoristas;