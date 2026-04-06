import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ListaCarretas = () => {
  const [carretas, setCarretas] = useState<any[]>([]);
  const [filteredCarretas, setFilteredCarretas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDesassociarConfirm, setShowDesassociarConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'carretas'), (snap) => {
      const carretasList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCarretas(carretasList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let filtered = [...carretas];
    
    // Busca por placa
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.placa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por tipo
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(c => c.tipo === filterTipo);
    }
    
    // Filtro por status (associada/não associada)
    if (filterStatus === 'associada') {
      filtered = filtered.filter(c => c.motoristaId);
    } else if (filterStatus === 'nao-associada') {
      filtered = filtered.filter(c => !c.motoristaId);
    }
    
    setFilteredCarretas(filtered);
  }, [searchTerm, filterTipo, filterStatus, carretas]);

  const handleDesassociar = async (carretaId: string) => {
    try {
      await updateDoc(doc(db, 'carretas', carretaId), {
        motoristaId: null,
        motoristaNome: null
      });
      setShowDesassociarConfirm(null);
      showNotification('✅ Carreta desassociada com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showNotification('❌ Erro ao desassociar carreta', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'carretas', id));
      setShowDeleteConfirm(null);
      showNotification('✅ Carreta excluída com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showNotification('❌ Erro ao excluir carreta', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const stats = {
    total: carretas.length,
    associadas: carretas.filter(c => c.motoristaId).length,
    naoAssociadas: carretas.filter(c => !c.motoristaId).length,
    sider: carretas.filter(c => c.tipo === 'Sider').length,
    bau: carretas.filter(c => c.tipo === 'Baú').length
  };

  const getStatusColor = (carreta: any) => {
    return carreta.motoristaId ? '#10b981' : '#94a3b8';
  };

  const getStatusText = (carreta: any) => {
    return carreta.motoristaId ? 'Associada' : 'Disponível';
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={loadingTextStyle}>Carregando carretas...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🚛 Carretas Cadastradas</h1>
          <p style={subtitleStyle}>Gerencie todas as carretas da sua frota</p>
        </div>
        <div style={statsBadgeStyle}>
          <span style={statsNumberStyle}>{stats.total}</span>
          <span style={statsLabelStyle}>carretas</span>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div style={filtersContainerStyle}>
        <div style={searchWrapperStyle}>
          <span style={searchIconStyle}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={clearButtonStyle}>
              ✕
            </button>
          )}
        </div>

        <div style={filterGroupStyle}>
          <select 
            value={filterTipo} 
            onChange={(e) => setFilterTipo(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="todos">Todos os tipos</option>
            <option value="Sider">🚛 Sider</option>
            <option value="Baú">📦 Baú</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="todos">Todas as situações</option>
            <option value="associada">Associadas</option>
            <option value="nao-associada">Disponíveis</option>
          </select>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚛</div>
          <div>
            <div style={statValueStyle}>{stats.sider}</div>
            <div style={statLabelStyle}>Carretas Sider</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statIconStyle}>📦</div>
          <div>
            <div style={statValueStyle}>{stats.bau}</div>
            <div style={statLabelStyle}>Carretas Baú</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🔗</div>
          <div>
            <div style={statValueStyle}>{stats.associadas}</div>
            <div style={statLabelStyle}>Associadas</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statIconStyle}>📭</div>
          <div>
            <div style={statValueStyle}>{stats.naoAssociadas}</div>
            <div style={statLabelStyle}>Disponíveis</div>
          </div>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {successMessage && (
        <div style={successToastStyle}>
          {successMessage}
        </div>
      )}

      {/* Grid de Carretas */}
      {filteredCarretas.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>🚛</div>
          <h3 style={emptyTitleStyle}>Nenhuma carreta encontrada</h3>
          <p style={emptyTextStyle}>
            {searchTerm || filterTipo !== 'todos' || filterStatus !== 'todos' 
              ? 'Tente usar outros filtros de busca' 
              : 'Comece cadastrando sua primeira carreta'}
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {filteredCarretas.map(c => (
            <div key={c.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={placaContainerStyle}>
                  <span style={placaIconStyle}>🚛</span>
                  <span style={placaTextStyle}>{c.placa}</span>
                </div>
                <div style={tipoBadgeStyle(c.tipo)}>
                  {c.tipo === 'Sider' ? '🚛' : '📦'} {c.tipo}
                </div>
              </div>

              <div style={cardContentStyle}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>📦 Paletes:</span>
                  <span style={infoValueStyle}>{c.qtdPaletes}</span>
                </div>
                
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>📌 Status:</span>
                  <div style={statusBadgeStyle(getStatusColor(c))}>
                    <span style={statusDotStyle(getStatusColor(c))}></span>
                    <span>{getStatusText(c)}</span>
                  </div>
                </div>

                {c.motoristaNome && (
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>👤 Motorista:</span>
                    <span style={motoristaNameStyle}>{c.motoristaNome}</span>
                  </div>
                )}

                {c.observacao && (
                  <div style={observacaoStyle}>
                    <span style={infoLabelStyle}>📝 Obs:</span>
                    <p style={observacaoTextStyle}>{c.observacao}</p>
                  </div>
                )}
              </div>

              <div style={cardActionsStyle}>
                {c.motoristaId && (
                  <button 
                    onClick={() => setShowDesassociarConfirm(c.id)} 
                    style={desassociarBtnStyle}
                  >
                    🔓 Desassociar
                  </button>
                )}
                <button 
                  onClick={() => setShowDeleteConfirm(c.id)} 
                  style={deleteBtnStyle}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Desassociação */}
      {showDesassociarConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDesassociarConfirm(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalIconStyle}>🔓</div>
            <h3 style={modalTitleStyle}>Desassociar Carreta</h3>
            <p style={modalTextStyle}>
              Tem certeza que deseja desassociar esta carreta do motorista?<br />
              Ela ficará disponível para nova associação.
            </p>
            <div style={modalButtonsStyle}>
              <button onClick={() => setShowDesassociarConfirm(null)} style={modalCancelButton}>
                Cancelar
              </button>
              <button onClick={() => handleDesassociar(showDesassociarConfirm)} style={modalConfirmButton}>
                Desassociar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalIconStyle}>⚠️</div>
            <h3 style={modalTitleStyle}>Confirmar exclusão</h3>
            <p style={modalTextStyle}>
              Tem certeza que deseja excluir esta carreta?<br />
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
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  padding: '40px 24px'
};

const loadingContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
};

const spinnerStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  border: '4px solid #e2e8f0',
  borderTop: '4px solid #3b82f6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

const loadingTextStyle: React.CSSProperties = {
  marginTop: '20px',
  color: '#64748b',
  fontSize: '16px'
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
  fontSize: '16px',
  color: '#64748b'
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

const filtersContainerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto',
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap'
};

const searchWrapperStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative'
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
  padding: '12px 16px 12px 44px',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  outline: 'none',
  background: 'white'
};

const clearButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
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

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px'
};

const filterSelectStyle: React.CSSProperties = {
  padding: '12px 16px',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  outline: 'none'
};

const statsGridStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px'
};

const statCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '16px',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
};

const statIconStyle: React.CSSProperties = {
  fontSize: '32px'
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e2937'
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b'
};

const successToastStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  backgroundColor: '#10b981',
  color: 'white',
  padding: '12px 24px',
  borderRadius: '12px',
  fontWeight: '600',
  zIndex: 1000,
  animation: 'slideIn 0.3s ease',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

const gridStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '24px'
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease'
};

const cardHeaderStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const placaContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const placaIconStyle: React.CSSProperties = {
  fontSize: '24px'
};

const placaTextStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: 'white',
  letterSpacing: '1px'
};

const tipoBadgeStyle = (tipo: string): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.2)',
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  color: 'white'
});

const cardContentStyle: React.CSSProperties = {
  padding: '20px'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px'
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#64748b'
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e2937'
};

const statusBadgeStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  backgroundColor: `${color}10`,
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  color: color
});

const statusDotStyle = (color: string): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color
});

const motoristaNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#3b82f6'
};

const observacaoStyle: React.CSSProperties = {
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #e2e8f0'
};

const observacaoTextStyle: React.CSSProperties = {
  margin: '8px 0 0 0',
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '1.5'
};

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px 20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0'
};

const desassociarBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  background: '#eab308',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

const deleteBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
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
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '24px',
  padding: '32px',
  maxWidth: '400px',
  width: '90%',
  textAlign: 'center'
};

const modalIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px'
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '12px'
};

const modalTextStyle: React.CSSProperties = {
  color: '#64748b',
  marginBottom: '24px',
  lineHeight: '1.5'
};

const modalButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px'
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

const modalConfirmButton: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#eab308',
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

// Adicionar animações
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    button:hover {
      transform: translateY(-2px);
    }
    
    button:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ListaCarretas;