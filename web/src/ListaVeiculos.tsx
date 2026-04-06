import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ListaVeiculos = () => {
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [filteredVeiculos, setFilteredVeiculos] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'veiculos'), (snap) => {
      const veiculosList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVeiculos(veiculosList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let filtered = [...veiculos];
    
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.placa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(v => v.tipo === filterTipo);
    }
    
    setFilteredVeiculos(filtered);
  }, [searchTerm, filterTipo, veiculos]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const veiculoRef = doc(db, 'veiculos', editando.id);
      const updateData: any = {
        placa: editando.placa.toUpperCase(),
        tipo: editando.tipo
      };
      if (editando.tipo === 'truck') {
        updateData.capacidade = parseInt(editando.capacidade);
      } else {
        updateData.capacidade = null;
      }

      await updateDoc(veiculoRef, updateData);
      showNotification('✅ Veículo atualizado com sucesso!', 'success');
      setEditando(null);
    } catch (error) {
      console.error(error);
      showNotification('❌ Erro ao atualizar veículo', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'veiculos', id));
      setShowDeleteConfirm(null);
      showNotification('✅ Veículo excluído com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showNotification('❌ Erro ao excluir veículo', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getTipoIcon = (tipo: string) => {
    switch(tipo) {
      case 'toco': return '🚚';
      case 'trucado': return '🚛';
      case 'truck': return '🚛⚡';
      default: return '🚗';
    }
  };

  const getTipoNome = (tipo: string) => {
    switch(tipo) {
      case 'toco': return 'Toco (2 eixos)';
      case 'trucado': return 'Trucado (3 eixos)';
      case 'truck': return 'Truck (Cavalo)';
      default: return tipo;
    }
  };

  const stats = {
    total: veiculos.length,
    toco: veiculos.filter(v => v.tipo === 'toco').length,
    trucado: veiculos.filter(v => v.tipo === 'trucado').length,
    truck: veiculos.filter(v => v.tipo === 'truck').length
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={loadingTextStyle}>Carregando veículos...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🚛 Veículos Cadastrados</h1>
          <p style={subtitleStyle}>Gerencie todos os veículos da sua frota</p>
        </div>
        <div style={statsBadgeStyle}>
          <span style={statsNumberStyle}>{stats.total}</span>
          <span style={statsLabelStyle}>veículos</span>
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

        <select 
          value={filterTipo} 
          onChange={(e) => setFilterTipo(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="todos">Todos os tipos</option>
          <option value="toco">🚚 Toco</option>
          <option value="trucado">🚛 Trucado</option>
          <option value="truck">🚛⚡ Truck</option>
        </select>
      </div>

      {/* Cards de Estatísticas */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚚</div>
          <div>
            <div style={statValueStyle}>{stats.toco}</div>
            <div style={statLabelStyle}>Toco</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚛</div>
          <div>
            <div style={statValueStyle}>{stats.trucado}</div>
            <div style={statLabelStyle}>Trucado</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚛⚡</div>
          <div>
            <div style={statValueStyle}>{stats.truck}</div>
            <div style={statLabelStyle}>Truck</div>
          </div>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {successMessage && (
        <div style={successToastStyle}>
          {successMessage}
        </div>
      )}

      {/* Grid de Veículos */}
      {filteredVeiculos.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>🚛</div>
          <h3 style={emptyTitleStyle}>Nenhum veículo encontrado</h3>
          <p style={emptyTextStyle}>
            {searchTerm || filterTipo !== 'todos' 
              ? 'Tente usar outros filtros de busca' 
              : 'Comece cadastrando seu primeiro veículo'}
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {filteredVeiculos.map(v => (
            <div key={v.id} style={cardStyle}>
              <div style={cardHeaderStyle(v.tipo)}>
                <div style={placaContainerStyle}>
                  <span style={placaIconStyle}>{getTipoIcon(v.tipo)}</span>
                  <span style={placaTextStyle}>{v.placa}</span>
                </div>
              </div>

              <div style={cardContentStyle}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>📌 Tipo:</span>
                  <span style={infoValueStyle}>{getTipoNome(v.tipo)}</span>
                </div>
                
                {v.tipo === 'truck' && v.capacidade && (
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>📦 Capacidade:</span>
                    <span style={capacidadeValueStyle}>{v.capacidade} paletes</span>
                  </div>
                )}

                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>📅 Cadastro:</span>
                  <span style={infoValueStyle}>
                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString('pt-BR') : 'Não informado'}
                  </span>
                </div>
              </div>

              <div style={cardActionsStyle}>
                <button onClick={() => setEditando(v)} style={editBtnStyle}>
                  ✏️ Editar
                </button>
                <button onClick={() => setShowDeleteConfirm(v.id)} style={deleteBtnStyle}>
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {editando && (
        <div style={modalOverlayStyle} onClick={() => setEditando(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>✏️ Editar Veículo</h2>
              <button onClick={() => setEditando(null)} style={modalCloseStyle}>✕</button>
            </div>
            
            <form onSubmit={handleUpdate}>
              <label style={modalLabelStyle}>Placa</label>
              <input 
                value={editando.placa} 
                onChange={e => setEditando({...editando, placa: e.target.value})} 
                style={modalInputStyle} 
                placeholder="ABC-1234"
                required
              />
              
              <label style={modalLabelStyle}>Tipo de Veículo</label>
              <select 
                value={editando.tipo} 
                onChange={e => setEditando({...editando, tipo: e.target.value, capacidade: e.target.value !== 'truck' ? '' : editando.capacidade})} 
                style={modalSelectStyle}
              >
                <option value="toco">🚚 Toco (2 eixos)</option>
                <option value="trucado">🚛 Trucado (3 eixos)</option>
                <option value="truck">🚛⚡ Truck (Cavalo)</option>
              </select>
              
              {editando.tipo === 'truck' && (
                <>
                  <label style={modalLabelStyle}>Capacidade de Paletes</label>
                  <input 
                    value={editando.capacidade || ''} 
                    onChange={e => setEditando({...editando, capacidade: e.target.value})} 
                    style={modalInputStyle} 
                    placeholder="Ex: 28"
                    type="number"
                    required
                  />
                </>
              )}
              
              <div style={modalButtonsStyle}>
                <button type="button" onClick={() => setEditando(null)} style={modalCancelButton}>
                  Cancelar
                </button>
                <button type="submit" style={modalSaveButton}>
                  Salvar Alterações
                </button>
              </div>
            </form>
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
              Tem certeza que deseja excluir este veículo?<br />
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '24px'
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease'
};

const cardHeaderStyle = (tipo: string): React.CSSProperties => ({
  background: tipo === 'toco' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                tipo === 'trucado' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  padding: '20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

const placaContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const placaIconStyle: React.CSSProperties = {
  fontSize: '28px'
};

const placaTextStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: 'white',
  letterSpacing: '1px'
};

const cardContentStyle: React.CSSProperties = {
  padding: '20px'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
  paddingBottom: '8px',
  borderBottom: '1px solid #f1f5f9'
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#64748b'
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1e2937'
};

const capacidadeValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#3b82f6'
};

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px 20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0'
};

const editBtnStyle: React.CSSProperties = {
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
  maxWidth: '450px',
  width: '90%'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e2937',
  margin: 0
};

const modalCloseStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#64748b'
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
  marginBottom: '16px',
  outline: 'none'
};

const modalSelectStyle: React.CSSProperties = {
  ...modalInputStyle,
  cursor: 'pointer'
};

const modalButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px'
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

const modalIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px',
  textAlign: 'center'
};

const modalTextStyle: React.CSSProperties = {
  color: '#64748b',
  marginBottom: '24px',
  lineHeight: '1.5',
  textAlign: 'center'
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

export default ListaVeiculos;