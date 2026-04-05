import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

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

  useEffect(() => {
    const fetchMotorista = async () => {
      const docRef = doc(db, 'motoristas', motoristaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMotorista({ id: docSnap.id, ...docSnap.data() as Motorista });
      }
      setLoading(false);
    };
    fetchMotorista();
  }, [motoristaId]);

  const menuItems = [
    { title: "Programar Motorista", icon: "📅", desc: "Agendar viagens e rotas" },
    { title: "Histórico de Viagens", icon: "🛣️", desc: "Todas as viagens realizadas" },
    { title: "Abastecimentos", icon: "⛽", desc: "Registro de combustível" },
    { title: "Chat com Motorista", icon: "💬", desc: "Comunicar diretamente" },
    { title: "Escala / Folga", icon: "📆", desc: "Gerenciar dias de descanso" },
    { title: "Hodômetro", icon: "🔢", desc: "Controle de quilometragem" },
  ];

  if (loading) {
    return <div style={{ padding: '100px', textAlign: 'center', fontSize: '18px' }}>Carregando informações...</div>;
  }

  if (!motorista) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Motorista não encontrado.</div>;
  }

  return (
    <div style={fullContainerStyle}>
      {/* Botão Voltar */}
      <button onClick={onVoltar} style={voltarStyle}>
        ← Voltar para a lista de motoristas
      </button>

      {/* Cabeçalho do Motorista */}
      <div style={headerStyle}>
        <div style={fotoContainerStyle}>
          <img 
            src={motorista.fotoPerfilUrl || 'https://placehold.co/170x170?text=Foto'} 
            alt={motorista.nome}
            style={fotoStyle}
          />
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

      {/* Título do Menu */}
      <h2 style={menuTitleStyle}>Menu do Motorista</h2>

      {/* Grid de Opções - Agora ocupando toda a largura */}
      <div style={gridStyle}>
        {menuItems.map((item, index) => (
          <div 
            key={index} 
            style={menuCardStyle}
            onClick={() => alert(`Em desenvolvimento: ${item.title}`)}
          >
            <div style={iconContainerStyle}>{item.icon}</div>
            <h3 style={cardTitleStyle}>{item.title}</h3>
            <p style={cardDescStyle}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== ESTILOS CORRIGIDOS ====================
const fullContainerStyle: React.CSSProperties = {
  padding: '30px 40px',
  minHeight: '100vh',
  backgroundColor: '#f8fafc',
  width: '100%',
  boxSizing: 'border-box'
};

const voltarStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#3b82f6',
  fontSize: '16px',
  cursor: 'pointer',
  marginBottom: '25px',
  fontWeight: '500'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '40px',
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '20px',
  boxShadow: '0 10px 35px rgba(0, 0, 0, 0.08)',
  marginBottom: '45px',
  flexWrap: 'wrap'
};

const fotoContainerStyle: React.CSSProperties = { flexShrink: 0 };
const fotoStyle: React.CSSProperties = {
  width: '170px',
  height: '170px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '7px solid #1e2937'
};

const infoContainerStyle: React.CSSProperties = { flex: 1, minWidth: '320px' };
const nomeStyle: React.CSSProperties = { fontSize: '34px', margin: '0 0 10px 0', color: '#1e2937', fontWeight: '700' };
const cpfStyle: React.CSSProperties = { fontSize: '19px', color: '#475569', marginBottom: '15px' };
const detalhesRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap',
  color: '#64748b',
  fontSize: '16px'
};

const menuTitleStyle: React.CSSProperties = {
  fontSize: '26px',
  color: '#1e2937',
  marginBottom: '30px',
  fontWeight: '600',
  paddingLeft: '10px'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
  width: '100%'
};

const menuCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '18px',
  padding: '35px 25px',
  textAlign: 'center',
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.07)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  border: '1px solid #f1f5f9'
};

const iconContainerStyle: React.CSSProperties = {
  fontSize: '52px',
  marginBottom: '18px'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1e2937',
  margin: '0 0 10px 0'
};

const cardDescStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '14.5px',
  margin: 0,
  lineHeight: '1.5'
};

export default MenuMotorista;