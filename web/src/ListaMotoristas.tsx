import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface ListaMotoristasProps {
  onSelectMotorista: (id: string) => void;
}

const ListaMotoristas: React.FC<ListaMotoristasProps> = ({ onSelectMotorista }) => {
  const [lista, setLista] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'motoristas'), (snap) => {
      const motoristas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLista(motoristas);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'motoristas', id));
      setShowDeleteConfirm(null);
      showNotification('Motorista excluído com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showNotification('Erro ao excluir motorista', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 14px 26px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white; border-radius: 14px; font-weight: 600; z-index: 10000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: slideIn 0.4s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3200);
  };

  const motoristasFiltrados = lista.filter(m =>
    m.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    m.cpf?.includes(filtro) ||
    m.cidade?.toLowerCase().includes(filtro.toLowerCase())
  );

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      'linear-gradient(135deg, #ec4899 0%, #9f1239 100%)',
      'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)',
    ];
    const index = parseInt(id.slice(0, 8), 16) % colors.length;
    return colors[index];
  };

  const handleCardClick = (motorista: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelectMotorista(motorista.id);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>👥 Motoristas Cadastrados</h1>
          <p style={subtitleStyle}>Gerencie sua equipe de motoristas</p>
        </div>
        <div style={statsBadgeStyle}>
          <span style={statsNumberStyle}>{motoristasFiltrados.length}</span>
          <span style={statsLabelStyle}>motoristas</span>
        </div>
      </div>

      {/* Barra de busca */}
      <div style={searchContainerStyle}>
        <div style={searchWrapperStyle}>
          <span style={searchIconStyle}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou cidade..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={searchInputStyle}
          />
          {filtro && (
            <button onClick={() => setFiltro('')} style={clearButtonStyle}>✕</button>
          )}
        </div>
      </div>

      {/* Grid de Cards */}
      {motoristasFiltrados.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>👤</div>
          <h3>Nenhum motorista encontrado</h3>
          <p>{filtro ? 'Tente outros termos de busca' : 'Cadastre seu primeiro motorista'}</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {motoristasFiltrados.map((m) => (
            <div
              key={m.id}
              onClick={(e) => handleCardClick(m, e)}
              style={cardStyle}
            >
              <div style={{ ...fotoWrapperStyle, background: getRandomColor(m.id) }}>
                {m.fotoPerfilUrl ? (
                  <img src={m.fotoPerfilUrl} alt={m.nome} style={fotoStyle} />
                ) : (
                  <div style={initialsStyle}>{getInitials(m.nome)}</div>
                )}
                <div style={statusBadgeStyle}>
                  {m.temMopp === 'Sim' ? '✅ MOPP' : 'Sem MOPP'}
                </div>
              </div>

              <div style={contentStyle}>
                <h3 style={nomeStyle}>{m.nome}</h3>
                <p style={cpfStyle}>{m.cpf}</p>

                <div style={infoGridStyle}>
                  <div style={infoItemStyle}>📍 {m.cidade || 'Não informada'}</div>
                  <div style={infoItemStyle}>📱 {m.whatsapp || m.telefone || 'Não informado'}</div>
                  <div style={infoItemStyle}>🪪 CNH {m.cnhCategoria || '—'}</div>
                </div>

                <div style={actionsStyle}>
                  <button 
                    onClick={() => setShowDeleteConfirm(m.id)} 
                    style={deleteBtnStyle}
                    disabled={loading}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(null)}>
          <div style={confirmModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={confirmIconStyle}>⚠️</div>
            <h3>Confirmar exclusão</h3>
            <p style={confirmTextStyle}>
              Tem certeza que deseja excluir este motorista?<br />
              Esta ação não pode ser desfeita.
            </p>
            <div style={modalButtonsStyle}>
              <button onClick={() => setShowDeleteConfirm(null)} style={modalCancelButton}>
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)} 
                style={modalConfirmDeleteButton}
                disabled={loading}
              >
                {loading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== ESTILOS MELHORADOS ==================== */
const containerStyle: React.CSSProperties = { minHeight: '100vh', background: '#f8fafc', padding: '40px 24px' };

const headerStyle: React.CSSProperties = {
  maxWidth: '1280px', margin: '0 auto 40px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
};

const titleStyle: React.CSSProperties = { fontSize: '34px', fontWeight: '700', color: '#0f172a', margin: 0 };
const subtitleStyle: React.CSSProperties = { color: '#64748b', fontSize: '16px', margin: 0 };

const statsBadgeStyle: React.CSSProperties = {
  background: 'white', padding: '14px 28px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', textAlign: 'center'
};
const statsNumberStyle: React.CSSProperties = { fontSize: '32px', fontWeight: '700', color: '#3b82f6' };
const statsLabelStyle: React.CSSProperties = { fontSize: '14px', color: '#64748b' };

const searchContainerStyle: React.CSSProperties = { maxWidth: '1280px', margin: '0 auto 40px auto' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', maxWidth: '520px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#64748b' };
const searchInputStyle: React.CSSProperties = {
  width: '100%', padding: '16px 50px', border: '2px solid #e2e8f0', borderRadius: '16px',
  fontSize: '16px', background: 'white', outline: 'none'
};
const clearButtonStyle: React.CSSProperties = {
  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
  background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer'
};

const gridStyle: React.CSSProperties = {
  maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '28px'
};

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease', cursor: 'pointer'
};

const fotoWrapperStyle: React.CSSProperties = { height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const fotoStyle: React.CSSProperties = { width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '5px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' };
const initialsStyle: React.CSSProperties = { ...fotoStyle, background: 'rgba(255,255,255,0.25)', fontSize: '42px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const statusBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: '20px', right: '20px', background: 'white', padding: '6px 14px',
  borderRadius: '30px', fontSize: '13px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const contentStyle: React.CSSProperties = { padding: '24px', textAlign: 'center' };
const nomeStyle: React.CSSProperties = { fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' };
const cpfStyle: React.CSSProperties = { color: '#64748b', fontSize: '14px', marginBottom: '20px' };

const infoGridStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', textAlign: 'left' };
const infoItemStyle: React.CSSProperties = { fontSize: '15px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' };

const actionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center' };
const deleteBtnStyle: React.CSSProperties = {
  padding: '12px 32px', background: '#ef4444', color: 'white', border: 'none',
  borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: '15px'
};

const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '100px 20px', color: '#64748b' };
const emptyIconStyle: React.CSSProperties = { fontSize: '90px', marginBottom: '20px' };

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)'
};

const confirmModalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '24px', padding: '40px 32px', width: '90%', maxWidth: '420px', textAlign: 'center'
};
const confirmIconStyle: React.CSSProperties = { fontSize: '60px', marginBottom: '20px' };
const confirmTextStyle: React.CSSProperties = { color: '#64748b', lineHeight: '1.6', marginBottom: '30px' };

const modalButtonsStyle: React.CSSProperties = { display: 'flex', gap: '16px' };
const modalCancelButton: React.CSSProperties = { flex: 1, padding: '14px', background: '#e2e8f0', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' };
const modalConfirmDeleteButton: React.CSSProperties = { flex: 1, padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' };

export default ListaMotoristas;