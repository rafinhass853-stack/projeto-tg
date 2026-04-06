import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import EscalaFolga from './EscalaFolga';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  whatsapp?: string;
  cidade?: string;
  cnhCategoria?: string;
  temMopp?: string;
  email?: string;
  telefone?: string;
  fotoPerfilUrl?: string;
  createdAt?: string;
}

interface MenuMotoristaProps {
  motoristaId: string;
  onVoltar: () => void;
}

const MenuMotorista: React.FC<MenuMotoristaProps> = ({ motoristaId, onVoltar }) => {
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Motorista | null>(null);

  useEffect(() => {
    const fetchMotorista = async () => {
      try {
        const docRef = doc(db, 'motoristas', motoristaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Motorista;
          setMotorista(data);
          setEditForm(data);
        }
      } catch (error) {
        console.error('Erro ao carregar motorista:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMotorista();
  }, [motoristaId]);

  const handleSaveEdit = async () => {
    if (!editForm || !motorista) return;

    try {
      const motoristaRef = doc(db, 'motoristas', motorista.id);
      await updateDoc(motoristaRef, {
        nome: editForm.nome,
        cpf: editForm.cpf,           // ← CPF incluído
        whatsapp: editForm.whatsapp,
        cidade: editForm.cidade,
        cnhCategoria: editForm.cnhCategoria,
        temMopp: editForm.temMopp,
      });
      setMotorista(editForm);
      setShowEditModal(false);
      alert('✅ Motorista atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('❌ Erro ao atualizar motorista');
    }
  };

  const menuItems = [
    { id: 'programar', title: "Programar Motorista", icon: "📅", desc: "Agendar viagens e rotas", color: "#3b82f6", bgColor: "#eff6ff" },
    { id: 'historico', title: "Histórico de Viagens", icon: "🛣️", desc: "Todas as viagens realizadas", color: "#10b981", bgColor: "#ecfdf5" },
    { id: 'abastecimentos', title: "Abastecimentos", icon: "⛽", desc: "Registro de combustível", color: "#f59e0b", bgColor: "#fffbeb" },
    { id: 'chat', title: "Chat com Motorista", icon: "💬", desc: "Comunicar diretamente", color: "#8b5cf6", bgColor: "#f5f3ff" },
    { id: 'escala', title: "Escala / Folga", icon: "🗓️", desc: "Gerenciar dias de descanso", color: "#ec4899", bgColor: "#fdf2f8" },
    { id: 'hodometro', title: "Hodômetro", icon: "🔢", desc: "Controle de quilometragem", color: "#06b6d4", bgColor: "#ecfeff" },
  ];

  const getInitials = (nome: string) => nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) return <div style={loadingStyle}>Carregando informações do motorista...</div>;
  if (!motorista) return <div style={errorStyle}>Motorista não encontrado</div>;

  if (activeSubTab === 'escala') {
    return <EscalaFolga motoristaId={motoristaId} onVoltar={() => setActiveSubTab(null)} />;
  }

  return (
    <div style={containerStyle}>
      <button onClick={onVoltar} style={voltarBtn}>← Voltar para lista</button>

      {/* Header do Motorista */}
      <div style={headerStyle}>
        <div style={fotoWrapper}>
          {motorista.fotoPerfilUrl ? (
            <img src={motorista.fotoPerfilUrl} alt={motorista.nome} style={fotoStyle} />
          ) : (
            <div style={initialsStyle}>{getInitials(motorista.nome)}</div>
          )}
          <div style={moppBadge}>
            {motorista.temMopp === 'Sim' ? '✅ MOPP' : '❌ Sem MOPP'}
          </div>
        </div>

        <div style={infoSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={nomeTitle}>{motorista.nome}</h1>
            <button onClick={() => setShowEditModal(true)} style={editMainButton}>
              ✏️ Editar Motorista
            </button>
          </div>

          <p style={cpfText}>CPF: <strong>{motorista.cpf}</strong></p>

          <div style={detailsGrid}>
            <div>📱 WhatsApp: <strong>{motorista.whatsapp || 'Não informado'}</strong></div>
            <div>📍 Cidade: <strong>{motorista.cidade || 'Não informada'}</strong></div>
            <div>🪪 CNH: <strong>{motorista.cnhCategoria || '—'}</strong></div>
          </div>
        </div>
      </div>

      {/* Menu de Opções */}
      <h2 style={menuTitle}>Menu do Motorista</h2>

      <div style={cardsGrid}>
        {menuItems.map(item => (
          <div
            key={item.id}
            style={menuCardStyle}
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveSubTab(item.id)}
          >
            <div style={{ ...iconCircle, backgroundColor: item.bgColor }}>
              <span style={{ color: item.color, fontSize: '42px' }}>{item.icon}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ====================== MODAL DE EDIÇÃO ====================== */}
      {showEditModal && editForm && (
        <div style={modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2>Editar Motorista</h2>

            <div style={formGrid}>
              <div>
                <label>Nome Completo *</label>
                <input type="text" value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} style={inputField} />
              </div>
              <div>
                <label>CPF *</label>
                <input type="text" value={editForm.cpf} onChange={e => setEditForm({...editForm, cpf: e.target.value})} style={inputField} />
              </div>
              <div>
                <label>WhatsApp</label>
                <input type="text" value={editForm.whatsapp || ''} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} style={inputField} />
              </div>
              <div>
                <label>Cidade</label>
                <input type="text" value={editForm.cidade || ''} onChange={e => setEditForm({...editForm, cidade: e.target.value})} style={inputField} />
              </div>
              <div>
                <label>CNH Categoria</label>
                <input type="text" value={editForm.cnhCategoria || ''} onChange={e => setEditForm({...editForm, cnhCategoria: e.target.value.toUpperCase()})} style={inputField} maxLength={2} />
              </div>
              <div>
                <label>Possui MOPP?</label>
                <select value={editForm.temMopp || 'Não'} onChange={e => setEditForm({...editForm, temMopp: e.target.value})} style={inputField}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            </div>

            <div style={modalActions}>
              <button onClick={() => setShowEditModal(false)} style={cancelBtn}>Cancelar</button>
              <button onClick={handleSaveEdit} style={saveBtn}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== ESTILOS ==================== */
const containerStyle: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #e0e7ff)', padding: '30px 20px' };

const voltarBtn: React.CSSProperties = { padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', marginBottom: '20px' };

const headerStyle: React.CSSProperties = { display: 'flex', gap: '40px', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', maxWidth: '1200px', margin: '0 auto 40px' };

const fotoWrapper: React.CSSProperties = { position: 'relative', width: '160px', height: '160px' };
const fotoStyle: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '5px solid white' };
const initialsStyle: React.CSSProperties = { ...fotoStyle, background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'white', fontWeight: 'bold' };
const moppBadge: React.CSSProperties = { position: 'absolute', bottom: '0', right: '0', background: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' };

const infoSection: React.CSSProperties = { flex: 1 };
const nomeTitle: React.CSSProperties = { fontSize: '34px', fontWeight: '700', margin: '0 0 8px 0' };
const cpfText: React.CSSProperties = { fontSize: '16px', color: '#475569', marginBottom: '20px' };

const detailsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' };

const editMainButton: React.CSSProperties = { padding: '12px 28px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' };

const menuTitle: React.CSSProperties = { textAlign: 'center', fontSize: '28px', fontWeight: '700', marginBottom: '30px', color: '#1e2937' };

const cardsGrid: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' };

const menuCardStyle: React.CSSProperties = { background: 'white', padding: '32px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.3s' };

const iconCircle: React.CSSProperties = { width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' };

/* Modal */
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: 'white', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '560px' };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' };
const inputField: React.CSSProperties = { width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '16px' };
const modalActions: React.CSSProperties = { marginTop: '30px', display: 'flex', gap: '16px' };
const cancelBtn: React.CSSProperties = { flex: 1, padding: '14px', background: '#e2e8f0', border: 'none', borderRadius: '12px', cursor: 'pointer' };
const saveBtn: React.CSSProperties = { flex: 1, padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' };

const loadingStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' };
const errorStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontSize: '20px' };

export default MenuMotorista;