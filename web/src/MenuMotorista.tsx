import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import EscalaFolga from './EscalaFolga';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  cnhCategoria?: string;
  fotoPerfilUrl?: string;
}

interface MenuMotoristaProps {
  motoristaId: string;
  onVoltar: () => void;
}

const MenuMotorista: React.FC<MenuMotoristaProps> = ({ motoristaId, onVoltar }) => {
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);

  useEffect(() => {
    const fetchMotorista = async () => {
      const docRef = doc(db, 'motoristas', motoristaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMotorista({ id: docSnap.id, ...docSnap.data() } as Motorista);
      }
      setLoading(false);
    };
    fetchMotorista();
  }, [motoristaId]);

  const menuItems = [
    { id: 'programar', title: "Programar Motorista", icon: "📅", desc: "Agendar viagens e rotas" },
    { id: 'historico', title: "Histórico de Viagens", icon: "🛣️", desc: "Todas as viagens realizadas" },
    { id: 'abastecimentos', title: "Abastecimentos", icon: "⛽", desc: "Registro de combustível" },
    { id: 'chat', title: "Chat com Motorista", icon: "💬", desc: "Comunicar diretamente" },
    { id: 'escala', title: "Escala / Folga", icon: "🗓️", desc: "Gerenciar dias de descanso" },
    { id: 'hodometro', title: "Hodômetro", icon: "🔢", desc: "Controle de quilometragem" },
  ];

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', fontSize: '18px' }}>Carregando informações...</div>;
  if (!motorista) return <div style={{ padding: '100px', textAlign: 'center' }}>Motorista não encontrado.</div>;

  // Se uma sub-aba estiver ativa (ex: Escala), renderiza o componente correspondente
  if (activeSubTab === 'escala') {
    return <EscalaFolga motoristaId={motoristaId} onVoltar={() => setActiveSubTab(null)} />;
  }

  return (
    <div style={fullContainerStyle}>
      <button onClick={onVoltar} style={voltarStyle}>← Voltar para a lista de motoristas</button>

      <div style={headerStyle}>
        <div style={fotoContainerStyle}>
          <img src={motorista.fotoPerfilUrl || 'https://placehold.co/170x170?text=Foto'} alt={motorista.nome} style={fotoStyle} />
        </div>
        <div style={infoContainerStyle}>
          <h1 style={nomeStyle}>{motorista.nome}</h1>
          <p style={cpfStyle}>CPF: {motorista.cpf}</p>
          <div style={detalhesRowStyle}>
            <span>📱 {motorista.whatsapp || motorista.telefone || 'Não informado'}</span>
            <span>📍 {motorista.cidade || 'Não informado'}</span>
            <span>🪪 CNH {motorista.cnhCategoria || 'Não informada'}</span>
          </div>
        </div>
      </div>

      <h2 style={menuTitleStyle}>Menu do Motorista</h2>

      <div style={gridStyle}>
        {menuItems.map((item ) => (
          <div key={item.id} style={menuCardStyle} onClick={() => setActiveSubTab(item.id)}>
            <div style={iconContainerStyle}>{item.icon}</div>
            <h3 style={cardTitleStyle}>{item.title}</h3>
            <p style={cardDescStyle}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ESTILOS
const fullContainerStyle: React.CSSProperties = { padding: '40px' };
const voltarStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '30px', fontWeight: '600', fontSize: '15px' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', marginBottom: '50px', border: '1px solid #f1f5f9' };
const fotoContainerStyle: React.CSSProperties = { width: '140px', height: '140px', borderRadius: '50%', overflow: 'hidden', marginRight: '40px', border: '4px solid #f1f5f9' };
const fotoStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const nomeStyle: React.CSSProperties = { fontSize: '32px', color: '#1e2937', margin: '0 0 8px 0', fontWeight: '700' };
const cpfStyle: React.CSSProperties = { color: '#64748b', fontSize: '16px', margin: '0 0 20px 0' };
const detalhesRowStyle: React.CSSProperties = { display: 'flex', gap: '25px', color: '#475569', fontSize: '15px' };
const infoContainerStyle: React.CSSProperties = { flex: 1 };
const menuTitleStyle: React.CSSProperties = { fontSize: '26px', color: '#1e2937', marginBottom: '30px', fontWeight: '600', paddingLeft: '10px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%' };
const menuCardStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '18px', padding: '35px 25px', textAlign: 'center', boxShadow: '0 8px 28px rgba(0, 0, 0, 0.07)', transition: 'all 0.3s ease', cursor: 'pointer', border: '1px solid #f1f5f9' };
const iconContainerStyle: React.CSSProperties = { fontSize: '52px', marginBottom: '18px' };
const cardTitleStyle: React.CSSProperties = { fontSize: '20px', fontWeight: '600', color: '#1e2937', margin: '0 0 10px 0' };
const cardDescStyle: React.CSSProperties = { color: '#64748b', fontSize: '14.5px', margin: 0, lineHeight: '1.5' };

export default MenuMotorista;
