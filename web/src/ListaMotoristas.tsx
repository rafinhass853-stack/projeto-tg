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
  criadoEm?: any;
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
      const lista = snap.docs.map(doc => ({ id: doc.id,...doc.data() } as Motorista));
      setMotoristas(lista);
      if (lista.length > 0) {
        buscarCargasDeMotoristas(lista);
      } else {
        setCargasPorMotorista({});
        setLoadingCargas(false);
      }
    });
    return () => unsub();
  }, []);

  const buscarCargasDeMotoristas = async (listaMotoristas: Motorista[]) => {
    setLoadingCargas(true);
    const novasCargas: Record<string, CargaProgramada[]> = {};
    const promises: Promise<void>[] = [];

    listaMotoristas.forEach((motorista) => {
      if (!motorista.id) return;

      const q = query(
        collection(db, 'motoristas', motorista.id, 'cargas'),
        where('status', '==', 'programada')
      );

      const promise = getDocs(q).then((snapshot) => {
        const cargas: CargaProgramada[] = [];
        snapshot.forEach(doc => cargas.push({ id: doc.id,...doc.data() } as CargaProgramada));

        if (cargas.length > 0) {
          cargas.sort((a, b) => {
            const timeA = a.criadoEm?.seconds || 0;
            const timeB = b.criadoEm?.seconds || 0;
            return timeB - timeA;
          });
          novasCargas[motorista.id] = [cargas[0]];
        }
      }).catch((err) => {
        console.error(`Erro ao buscar cargas para o motorista ${motorista.nome}:`, err);
      });
      promises.push(promise);
    });

    await Promise.all(promises);
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
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 14px 26px; background: ${type === 'success'? '#22C55E' : '#EF4444'}; color: #000; border-radius: 14px; font-weight: 700; z-index: 10000;`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3200);
  };

  const motoristasFiltrados = useMemo(() => {
    return motoristas.filter(m => {
      const temCargaAtiva =!!cargasPorMotorista[m.id];
      const temMopp = m.temMopp === 'Sim';

      const matchTexto =
        m.nome?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        m.cpf?.includes(filtroTexto) ||
        m.cidade?.toLowerCase().includes(filtroTexto.toLowerCase());

      let matchProgramacao = true;
      if (filtroStatus === 'comProgramacao') matchProgramacao = temCargaAtiva;
      if (filtroStatus === 'semProgramacao') matchProgramacao =!temCargaAtiva;

      let matchMopp = true;
      if (filtroMopp === 'comMopp') matchMopp = temMopp;
      if (filtroMopp === 'semMopp') matchMopp =!temMopp;

      return matchTexto && matchProgramacao && matchMopp;
    });
  }, [motoristas, cargasPorMotorista, filtroTexto, filtroStatus, filtroMopp]);

  const stats = useMemo(() => {
    const total = motoristas.length;
    const comProgramacao = motoristas.filter(m =>!!cargasPorMotorista[m.id]).length;
    const semProgramacao = total - comProgramacao;
    const comMopp = motoristas.filter(m => m.temMopp === 'Sim').length;
    const semMopp = total - comMopp;

    return { total, comProgramacao, semProgramacao, comMopp, semMopp };
  }, [motoristas, cargasPorMotorista]);

  const getInitials = (nome: string) => nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const getRandomColor = (id: string) => {
    const colors = ['#FFD700', '#FFB700', '#FF9500', '#FF7B00', '#FFC300'];
    return colors[parseInt(id.slice(0, 8), 16) % colors.length];
  };

  const handleCardClick = (motorista: Motorista, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelectMotorista(motorista.id);
  };

  // ==================== ESTILOS TEMA PRETO/DOURADO ====================
  const containerStyle: React.CSSProperties = { padding: '40px 20px', backgroundColor: '#000', minHeight: '100vh', fontFamily: 'Inter, sans-serif' };
  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' };
  const titleStyle: React.CSSProperties = { fontSize: '32px', fontWeight: 900, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '16px' };
  const subtitleStyle: React.CSSProperties = { margin: '8px 0 0 0', color: '#666', fontSize: '14px' };
  const reportBtnStyle: React.CSSProperties = { backgroundColor: '#FFD700', color: '#000', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' };
  const statsContainerStyle: React.CSSProperties = { display: 'flex', gap: '24px', backgroundColor: '#0A0A', padding: '12px 24px', borderRadius: '16px', border: '1px solid #1A1A1A' };
  const statItemStyle: React.CSSProperties = { textAlign: 'center' };
  const statNumberStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: '#FFF', margin: 0 };
  const statLabelStyle: React.CSSProperties = { fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 700, marginTop: '4px' };
  const filtersContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' };
  const searchWrapperStyle: React.CSSProperties = { position: 'relative', flexGrow: 1, maxWidth: '400px' };
  const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
  const searchInputStyle: React.CSSProperties = { width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1px solid #333', fontSize: '15px', outline: 'none', backgroundColor: '#1A1A1A', color: '#FFF' };
  const clearButtonStyle: React.CSSProperties = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' };
  const selectsContainerStyle: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap' };
  const filterGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
  const filterLabelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#666' };
  const selectStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: '10px', border: '1px solid #333', fontSize: '14px', outline: 'none', backgroundColor: '#1A1A1A', color: '#FFF' };
  const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '60px 20px', color: '#666', backgroundColor: '#0A0A0A', borderRadius: '24px', border: '1px solid #1A1A1A', marginTop: '32px' };
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' };
  const cardStyle: React.CSSProperties = { backgroundColor: '#0A0A0A', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid #1A1A1A', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' };
  const fotoWrapperStyle: React.CSSProperties = { height: '120px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '48px', fontWeight: 800 };
  const fotoStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 };
  const initialsStyle: React.CSSProperties = { zIndex: 1 };
  const statusBadgeStyle: React.CSSProperties = { position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFF', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };
  const contentStyle: React.CSSProperties = { padding: '24px' };
  const nomeStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: '#FFF', margin: '0 0 4px 0' };
  const cpfStyle: React.CSSProperties = { fontSize: '14px', color: '#888', margin: '0 0 16px 0' };
  const infoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' };
  const infoItemStyle: React.CSSProperties = { fontSize: '13px', color: '#AAA', display: 'flex', alignItems: 'center', gap: '6px' };
  const programacaoContainerStyle: React.CSSProperties = { borderTop: '1px solid #1F1F1F', paddingTop: '20px', marginTop: '20px' };
  const programacaoHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' };
  const programacaoTitleStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 800, color: '#AAA', textTransform: 'uppercase', margin: 0 };
  const programacaoStatusStyle: React.CSSProperties = { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 };
  const programacaoInfoStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#AAA', marginBottom: '8px' };
  const programacaoPlacaStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#FFF' };
  const actionButtonsStyle: React.CSSProperties = { display: 'flex', gap: '8px', marginTop: '20px' };
  const actionButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '10px', backgroundColor: '#1A1A1A', color: '#AAA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #333' };
  const deleteConfirmModalStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const deleteConfirmContentStyle: React.CSSProperties = { backgroundColor: '#0A0A0A', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', border: '1px solid #1A1A1A' };
  const deleteConfirmButtonsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' };
  const deleteConfirmBtnStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600 };
  const reportModalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
  const reportModalContentStyle: React.CSSProperties = { backgroundColor: '#0A0A0A', borderRadius: '28px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', border: '1px solid #1A1A1A' };
  const reportModalHeaderStyle: React.CSSProperties = { padding: '24px 32px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#0A0A0A', zIndex: 10, borderTopLeftRadius: '28px', borderTopRightRadius: '28px' };
  const reportModalBodyStyle: React.CSSProperties = { padding: '32px' };
  const reportHeaderStyle: React.CSSProperties = { borderBottom: '2px solid #FFD700', marginBottom: '20px', paddingBottom: '10px' };
  const reportStatGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' };
  const reportStatBoxStyle: React.CSSProperties = { border: '1px solid #333', padding: '10px', borderRadius: '8px', backgroundColor: '#1A1A1A' };

  return (
    <div style={containerStyle}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #modal-report, #modal-report * { visibility: visible; }
          #modal-report { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none!important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 12px; text-align: left; color: #000; }
          th { background-color: #f1f5f9; }
        }
      .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
              <span style={{...statNumberStyle, color: '#22C55E'}}>{stats.comProgramacao}</span>
              <span style={statLabelStyle}>Programados</span>
            </div>
            <div style={statItemStyle}>
              <span style={{...statNumberStyle, color: '#EF4444'}}>{stats.semProgramacao}</span>
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
      {loadingCargas? (
        <div style={emptyStateStyle}>
          <Clock size={48} color="#666" className="spin" />
          <h3>Carregando informações das cargas...</h3>
        </div>
      ) : motoristasFiltrados.length === 0? (
        <div style={emptyStateStyle}>
          <AlertCircle size={48} color="#666" />
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
                <div style={{...fotoWrapperStyle, background: `linear-gradient(135deg, ${getRandomColor(m.id)}, #1a1a1a)` }}>
                  {m.fotoPerfilUrl? (
                    <img src={m.fotoPerfilUrl} alt={m.nome} style={fotoStyle} />
                  ) : (
                    <div style={initialsStyle}>{getInitials(m.nome)}</div>
                  )}
                  <div style={statusBadgeStyle}>
                    {m.temMopp === 'Sim'? '✅ MOPP' : '❌ Sem MOPP'}
                  </div>
                </div>

                <div style={contentStyle}>
                  <h3 style={nomeStyle}>{m.nome}</h3>
                  <p style={cpfStyle}>{m.cpf}</p>

                  <div style={infoGridStyle}>
                    <div style={infoItemStyle}>📍 {m.cidade || 'Não informada'}</div>
                    <div style={infoItemStyle}>📱 {m.whatsapp || m.telefone || 'Não informado'}</div>
                  </div>

                  {/* Programação */}
                  <div style={programacaoContainerStyle}>
                    <div style={programacaoHeaderStyle}>
                      <Truck size={16} color="#888" />
                      <h4 style={programacaoTitleStyle}>Programação</h4>
                      <span style={{...programacaoStatusStyle, backgroundColor: temProgramacao? '#22C55E20' : '#EF444420', color: temProgramacao? '#22C55E' : '#EF4444' }}>
                        {temProgramacao? 'Programado' : 'Disponível'}
                      </span>
                    </div>
                    {temProgramacao && cargaRecente? (
                      <>
                        <p style={programacaoInfoStyle}><Calendar size={14} /> {cargaRecente.entregaData}</p>
                        <p style={programacaoInfoStyle}><MapPin size={14} /> {cargaRecente.entregaCidade} - {cargaRecente.entregaLocal}</p>
                        <p style={programacaoInfoStyle}><Truck size={14} /> <span style={programacaoPlacaStyle}>{cargaRecente.placa}</span></p>
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#666' }}>Nenhuma carga programada no momento.</p>
                    )}
                  </div>

                  <div style={actionButtonsStyle}>
                    <button style={actionButtonStyle} onClick={() => onSelectMotorista(m.id)}>
                      <UserCheck size={14} /> Ver Detalhes
                    </button>
                    <button
                      style={{...actionButtonStyle, backgroundColor: '#EF444420', color: '#EF4444', borderColor: '#EF4444' }}
                      onClick={() => setShowDeleteConfirm(m.id)}
                    >
                      <UserMinus size={14} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div style={deleteConfirmModalStyle}>
          <div style={deleteConfirmContentStyle}>
            <h3 style={{ color: '#EF4444', marginBottom: '20px' }}>Confirmar Exclusão</h3>
            <p style={{ color: '#AAA' }}>Tem certeza que deseja excluir este motorista? Esta ação é irreversível.</p>
            <div style={deleteConfirmButtonsStyle}>
              <button
                style={{...deleteConfirmBtnStyle, backgroundColor: '#333', color: '#AAA' }}
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                style={{...deleteConfirmBtnStyle, backgroundColor: '#EF4444', color: '#fff' }}
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={loading}
              >
                {loading? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO */}
      {showReportModal && (
        <div style={reportModalOverlayStyle} onClick={() => setShowReportModal(false)}>
          <div style={reportModalContentStyle} onClick={(e) => e.stopPropagation()} id="modal-report">
            <div style={reportModalHeaderStyle} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#FFD700', padding: '10px', borderRadius: '14px' }}>
                  <BarChart3 size={22} color="#000" />
                </div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#FFF' }}>Relatório de Status de Motoristas</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{...reportBtnStyle, padding: '10px 20px' }} onClick={() => window.print()}>
                  <Printer size={18} /> Imprimir PDF
                </button>
                <button style={{...actionButtonStyle, padding: '10px 14px' }} onClick={() => setShowReportModal(false)}>
                  <X size={22} />
                </button>
              </div>
            </div>

            <div style={reportModalBodyStyle} className="report-container">
              <div style={reportHeaderStyle}>
                <h1 style={{ margin: 0, color: '#FFF' }}>Relatório de Status de Motoristas</h1>
                <p style={{ color: '#888' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div style={reportStatGridStyle}>
                <div style={reportStatBoxStyle}>
                  <p style={statLabelStyle}>Total de Motoristas</p>
                  <p style={{...statNumberStyle, color: '#FFF'}}>{stats.total}</p>
                </div>
                <div style={reportStatBoxStyle}>
                  <p style={statLabelStyle}>Com Programação</p>
                  <p style={{...statNumberStyle, color: '#22C55E'}}>{stats.comProgramacao}</p>
                </div>
                <div style={reportStatBoxStyle}>
                  <p style={statLabelStyle}>Sem Programação</p>
                  <p style={{...statNumberStyle, color: '#EF4444'}}>{stats.semProgramacao}</p>
                </div>
                <div style={reportStatBoxStyle}>
                  <p style={statLabelStyle}>Com MOPP</p>
                  <p style={{...statNumberStyle, color: '#FFD700'}}>{stats.comMopp}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#FFF' }}>Detalhes dos Motoristas</h3>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Cidade</th>
                    <th>MOPP</th>
                    <th>Status Carga</th>
                    <th>Próxima Entrega</th>
                    <th>Placa Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {motoristas.map(m => {
                    const carga = cargasPorMotorista[m.id]?.[0];
                    const statusCarga = carga? 'Com Carga' : 'Disponível';
                    const proximaEntrega = carga? `${carga.entregaCidade} - ${carga.entregaLocal} (${carga.entregaData})` : 'N/A';
                    const placaCarga = carga? carga.placa : 'N/A';

                    return (
                      <tr key={m.id}>
                        <td>{m.nome}</td>
                        <td>{m.cpf}</td>
                        <td>{m.cidade || 'N/A'}</td>
                        <td>{m.temMopp || 'N/A'}</td>
                        <td style={{ color: carga? '#22C55E' : '#EF4444', fontWeight: 700 }}>{statusCarga}</td>
                        <td>{proximaEntrega}</td>
                        <td>{placaCarga}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaMotoristas;