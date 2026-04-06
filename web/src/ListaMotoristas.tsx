import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface ListaMotoristasProps {
  onSelectMotorista: (id: string) => void;
}

const ListaMotoristas: React.FC<ListaMotoristasProps> = ({ onSelectMotorista }) => {
  const [lista, setLista] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  const handleEdit = async (motorista: any) => {
    setEditando(motorista);
  };

  const handleSaveEdit = async () => {
    if (!editando) return;
    
    setLoading(true);
    try {
      const motoristaRef = doc(db, 'motoristas', editando.id);
      await updateDoc(motoristaRef, {
        nome: editando.nome,
        whatsapp: editando.whatsapp,
        cidade: editando.cidade,
        cnhCategoria: editando.cnhCategoria,
        temMopp: editando.temMopp
      });
      setEditando(null);
      showNotification('Motorista atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showNotification('Erro ao atualizar motorista', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 12px;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const handleCardClick = (motorista: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, .edit-form')) return;
    onSelectMotorista(motorista.id);
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
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
    ];
    const index = parseInt(id.slice(0, 8), 16) % colors.length;
    return colors[index];
  };

  return (
    <div style={containerStyle}>
      {/* Header com busca */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>👥 Motoristas Cadastrados</h1>
          <p style={subtitleStyle}>Gerencie todos os motoristas da sua frota</p>
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
            <button onClick={() => setFiltro('')} style={clearButtonStyle}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {editando && (
        <div style={modalOverlayStyle} onClick={() => setEditando(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitleStyle}>✏️ Editar Motorista</h2>
            
            <label style={modalLabelStyle}>Nome Completo</label>
            <input
              type="text"
              value={editando.nome}
              onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
              style={modalInputStyle}
            />

            <label style={modalLabelStyle}>WhatsApp</label>
            <input
              type="text"
              value={editando.whatsapp || ''}
              onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
              style={modalInputStyle}
            />

            <label style={modalLabelStyle}>Cidade</label>
            <input
              type="text"
              value={editando.cidade || ''}
              onChange={(e) => setEditando({ ...editando, cidade: e.target.value })}
              style={modalInputStyle}
            />

            <label style={modalLabelStyle}>CNH Categoria</label>
            <input
              type="text"
              value={editando.cnhCategoria || ''}
              onChange={(e) => setEditando({ ...editando, cnhCategoria: e.target.value.toUpperCase() })}
              style={modalInputStyle}
              maxLength={2}
            />

            <label style={modalLabelStyle}>Possui MOPP?</label>
            <select
              value={editando.temMopp || 'Não'}
              onChange={(e) => setEditando({ ...editando, temMopp: e.target.value })}
              style={modalSelectStyle}
            >
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>

            <div style={modalButtonsStyle}>
              <button onClick={() => setEditando(null)} style={modalCancelButton}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit} style={modalSaveButton} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(null)}>
          <div style={confirmModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={confirmIconStyle}>⚠️</div>
            <h3 style={confirmTitleStyle}>Confirmar exclusão</h3>
            <p style={confirmTextStyle}>
              Tem certeza que deseja excluir este motorista?<br />
              Esta ação não poderá ser desfeita.
            </p>
            <div style={modalButtonsStyle}>
              <button onClick={() => setShowDeleteConfirm(null)} style={modalCancelButton}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={modalConfirmDeleteButton}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de motoristas */}
      {motoristasFiltrados.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>🚛</div>
          <h3 style={emptyTitleStyle}>Nenhum motorista encontrado</h3>
          <p style={emptyTextStyle}>
            {filtro ? 'Tente usar outros termos de busca' : 'Comece cadastrando seu primeiro motorista'}
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {motoristasFiltrados.map(m => (
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
                  {m.temMopp === 'Sim' ? 'MOPP' : 'Sem MOPP'}
                </div>
              </div>

              <div style={contentStyle}>
                <h3 style={nomeStyle}>{m.nome}</h3>
                <p style={cpfStyle}>{m.cpf}</p>
                
                <div style={infoGridStyle}>
                  <div style={infoItemStyle}>
                    <span style={infoIconStyle}>📍</span>
                    <span style={infoTextStyle}>{m.cidade || 'Não informada'}</span>
                  </div>
                  <div style={infoItemStyle}>
                    <span style={infoIconStyle}>📱</span>
                    <span style={infoTextStyle}>{m.whatsapp || m.telefone || 'Não informado'}</span>
                  </div>
                  <div style={infoItemStyle}>
                    <span style={infoIconStyle}>🪪</span>
                    <span style={infoTextStyle}>CNH {m.cnhCategoria || 'Não informada'}</span>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <button onClick={() => handleEdit(m)} style={editBtnStyle}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => setShowDeleteConfirm(m.id)} style={deleteBtnStyle}>
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: '40px 24px'
};

const headerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '20px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '8px'
};

const subtitleStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '16px'
};

const statsBadgeStyle: React.CSSProperties = {
  background: 'white',
  padding: '12px 24px',
  borderRadius: '16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  textAlign: 'center'
};

const statsNumberStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#3b82f6',
  display: 'block'
};

const statsLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b'
};

const searchContainerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto'
};

const searchWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '18px'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 48px',
  border: '2px solid #e2e8f0',
  borderRadius: '16px',
  fontSize: '16px',
  transition: 'all 0.3s ease',
  outline: 'none',
  background: 'white'
};

const clearButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#e2e8f0',
  border: 'none',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b'
};

const gridStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '28px'
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  position: 'relative'
};

const fotoWrapperStyle: React.CSSProperties = {
  height: '160px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  paddingTop: '40px'
};

const fotoStyle: React.CSSProperties = {
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '4px solid white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

const initialsStyle: React.CSSProperties = {
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '36px',
  fontWeight: '700',
  color: 'white',
  border: '4px solid white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

const statusBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'white',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  color: '#3b82f6',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const contentStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center'
};

const nomeStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '6px'
};

const cpfStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '13px',
  marginBottom: '16px'
};

const infoGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '20px',
  textAlign: 'left'
};

const infoItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: '#475569'
};

const infoIconStyle: React.CSSProperties = {
  fontSize: '16px',
  minWidth: '24px'
};

const infoTextStyle: React.CSSProperties = {
  flex: 1
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px'
};

const editBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const deleteBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  maxWidth: '1200px',
  margin: '0 auto'
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '80px',
  marginBottom: '20px'
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  color: '#1e2937',
  marginBottom: '12px'
};

const emptyTextStyle: React.CSSProperties = {
  color: '#64748b'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '24px',
  padding: '32px',
  width: '90%',
  maxWidth: '500px',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const confirmModalStyle: React.CSSProperties = {
  ...modalStyle,
  textAlign: 'center'
};

const confirmIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px'
};

const confirmTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '12px'
};

const confirmTextStyle: React.CSSProperties = {
  color: '#64748b',
  marginBottom: '24px',
  lineHeight: '1.5'
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '24px'
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#374151',
  fontSize: '14px'
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '14px',
  marginBottom: '20px',
  outline: 'none'
};

const modalSelectStyle: React.CSSProperties = {
  ...modalInputStyle,
  cursor: 'pointer'
};

const modalButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '24px'
};

const modalCancelButton: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#e2e8f0',
  color: '#475569',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer'
};

const modalSaveButton: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer'
};

const modalConfirmDeleteButton: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer'
};

export default ListaMotoristas;