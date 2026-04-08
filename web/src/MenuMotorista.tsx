import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import EscalaFolga from './EscalaFolga';
import HistoricoViagens from './HistoricoViagens';

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
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    if (novaFoto) {
      const objectUrl = URL.createObjectURL(novaFoto);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [novaFoto]);

  const handleSaveEdit = async () => {
    if (!editForm || !motorista) return;
    setUploading(true);
    try {
      let fotoUrlFinal = editForm.fotoPerfilUrl;
      if (novaFoto) {
        const storageRef = ref(storage, `fotos-motoristas/${motorista.id}-${Date.now()}`);
        await uploadBytes(storageRef, novaFoto);
        fotoUrlFinal = await getDownloadURL(storageRef);
      }
      const motoristaRef = doc(db, 'motoristas', motorista.id);
      await updateDoc(motoristaRef, { ...editForm, fotoPerfilUrl: fotoUrlFinal });
      setMotorista({ ...editForm, fotoPerfilUrl: fotoUrlFinal });
      setShowEditModal(false);
      setNovaFoto(null);
      setPreviewUrl(null);
      alert('✅ Motorista atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('❌ Erro ao atualizar motorista');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={loadingStyle}>Carregando informações do motorista...</div>;
  if (!motorista) return <div style={errorStyle}>Motorista não encontrado</div>;

  // Navegação das Sub-Abas
  if (activeSubTab === 'escala') return <EscalaFolga motoristaId={motoristaId} onVoltar={() => setActiveSubTab(null)} />;
  if (activeSubTab === 'historico') return <HistoricoViagens motoristaCpf={motorista.cpf} onVoltar={() => setActiveSubTab(null)} />;

  return (
    <div style={containerStyle}>
      <button onClick={onVoltar} style={voltarBtn}>← Voltar para lista</button>

      <div style={headerStyle}>
        <div style={fotoWrapper}>
          {motorista.fotoPerfilUrl ? (
            <img src={motorista.fotoPerfilUrl} alt={motorista.nome} style={fotoStyle} />
          ) : (
            <div style={initialsStyle}>{motorista.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          )}
          <div style={moppBadge}>{motorista.temMopp === 'Sim' ? '✅ MOPP' : '❌ Sem MOPP'}</div>
        </div>

        <div style={infoSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={nomeTitle}>{motorista.nome}</h1>
            <button onClick={() => setShowEditModal(true)} style={editMainButton}>✏️ Editar Motorista</button>
          </div>
          <p style={cpfText}>CPF: <strong>{motorista.cpf}</strong></p>
          <div style={detailsGrid}>
            <div>📱 WhatsApp: <strong>{motorista.whatsapp || 'Não informado'}</strong></div>
            <div>📍 Cidade: <strong>{motorista.cidade || 'Não informada'}</strong></div>
            <div>🪪 CNH: <strong>{motorista.cnhCategoria || '—'}</strong></div>
          </div>
        </div>
      </div>

      <h2 style={menuTitle}>Menu do Motorista</h2>

      <div style={cardsGrid}>
        {menuItems.map(item => (
          <div
            key={item.id}
            style={{
              ...menuCardStyle,
              transform: hoveredCard === item.id ? 'translateY(-6px)' : 'none',
              boxShadow: hoveredCard === item.id ? '0 20px 40px rgba(0,0,0,0.12)' : '0 10px 30px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveSubTab(item.id)}
          >
            <div style={{ ...iconCircle, backgroundColor: item.bgColor }}>
              <span style={{ color: item.color, fontSize: '42px' }}>{item.icon}</span>
            </div>
            <h3 style={cardTitle}>{item.title}</h3>
            <p style={cardDesc}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {showEditModal && editForm && (
        <div style={modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2>Editar Motorista</h2>
            <div style={formGrid}>
              <div><label>Nome Completo *</label><input type="text" value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} style={inputField} /></div>
              <div><label>CPF *</label><input type="text" value={editForm.cpf} onChange={e => setEditForm({...editForm, cpf: e.target.value})} style={inputField} /></div>
              <div><label>WhatsApp</label><input type="text" value={editForm.whatsapp || ''} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} style={inputField} /></div>
              <div><label>Cidade</label><input type="text" value={editForm.cidade || ''} onChange={e => setEditForm({...editForm, cidade: e.target.value})} style={inputField} /></div>
              <div><label>CNH Categoria</label><input type="text" value={editForm.cnhCategoria || ''} onChange={e => setEditForm({...editForm, cnhCategoria: e.target.value.toUpperCase()})} style={inputField} maxLength={2} /></div>
              <div><label>Possui MOPP?</label><select value={editForm.temMopp || 'Não'} onChange={e => setEditForm({...editForm, temMopp: e.target.value})} style={inputField}><option value="Não">Não</option><option value="Sim">Sim</option></select></div>
            </div>
            <div style={modalActions}>
              <button onClick={() => setShowEditModal(false)} style={cancelBtn}>Cancelar</button>
              <button onClick={handleSaveEdit} style={saveBtn} disabled={uploading}>{uploading ? 'Salvando...' : 'Salvar Alterações'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const menuItems = [
  { id: 'programar', title: "Programar Motorista", icon: "📅", desc: "Agendar viagens e rotas", color: "#3b82f6", bgColor: "#eff6ff" },
  { id: 'historico', title: "Histórico de Viagens", icon: "🛣️", desc: "Todas as viagens realizadas", color: "#10b981", bgColor: "#ecfdf5" },
  { id: 'abastecimentos', title: "Abastecimentos", icon: "⛽", desc: "Registro de combustível", color: "#f59e0b", bgColor: "#fffbeb" },
  { id: 'chat', title: "Chat com Motorista", icon: "💬", desc: "Comunicar diretamente", color: "#8b5cf6", bgColor: "#f5f3ff" },
  { id: 'escala', title: "Escala / Folga", icon: "🗓️", desc: "Gerenciar dias de descanso", color: "#ec4899", bgColor: "#fdf2f8" },
  { id: 'hodometro', title: "Hodômetro", icon: "🔢", desc: "Controle de quilometragem", color: "#06b6d4", bgColor: "#ecfeff" },
];

// Estilos (Mantidos do original)
const containerStyle: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #e0e7ff)', padding: '30px 20px' };
const voltarBtn: React.CSSProperties = { padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', marginBottom: '20px' };
const headerStyle: React.CSSProperties = { display: 'flex', gap: '40px', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', maxWidth: '1200px', margin: '0 auto 40px' };
const fotoWrapper: React.CSSProperties = { position: 'relative', width: '160px', height: '160px' };
const fotoStyle: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '5px solid white' };
const initialsStyle: React.CSSProperties = { ...fotoStyle, background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'white', fontWeight: 'bold' };
const moppBadge: React.CSSProperties = { position: 'absolute', bottom: '0', right: '0', background: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' };
const infoSection: React.CSSProperties = { flex: 1 };
const nomeTitle: React.CSSProperties = { fontSize: '34px', fontWeight: '700', margin: '0 0 8px 0' };
const cpfText: React.CSSProperties = { fontSize: '16px', color: '#64748b', margin: '0 0 20px 0' };
const detailsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '15px' };
const editMainButton: React.CSSProperties = { padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569' };
const menuTitle: React.CSSProperties = { textAlign: 'center', fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '30px' };
const cardsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto' };
const menuCardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' };
const iconCircle: React.CSSProperties = { width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' };
const cardTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: '#1e293b' };
const cardDesc: React.CSSProperties = { fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5' };
const loadingStyle: React.CSSProperties = { textAlign: 'center', padding: '100px', fontSize: '18px', color: '#64748b' };
const errorStyle: React.CSSProperties = { textAlign: 'center', padding: '100px', fontSize: '18px', color: '#ef4444' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' };
const inputField: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '5px' };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' };
const modalActions: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '15px' };
const cancelBtn: React.CSSProperties = { padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' };
const saveBtn: React.CSSProperties = { padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 };

export default MenuMotorista;
