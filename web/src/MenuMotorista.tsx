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
  temMopp?: string;
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

  useEffect(() => {
    const fetchMotorista = async () => {
      try {
        const docRef = doc(db, 'motoristas', motoristaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMotorista({ id: docSnap.id, ...docSnap.data() } as Motorista);
        }
      } catch (error) {
        console.error('Erro ao carregar motorista:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMotorista();
  }, [motoristaId]);

  const menuItems = [
    { id: 'programar', title: "Programar Motorista", icon: "📅", desc: "Agendar viagens e rotas", color: "#3b82f6", bgColor: "#eff6ff" },
    { id: 'historico', title: "Histórico de Viagens", icon: "🛣️", desc: "Todas as viagens realizadas", color: "#10b981", bgColor: "#ecfdf5" },
    { id: 'abastecimentos', title: "Abastecimentos", icon: "⛽", desc: "Registro de combustível", color: "#f59e0b", bgColor: "#fffbeb" },
    { id: 'chat', title: "Chat com Motorista", icon: "💬", desc: "Comunicar diretamente", color: "#8b5cf6", bgColor: "#f5f3ff" },
    { id: 'escala', title: "Escala / Folga", icon: "🗓️", desc: "Gerenciar dias de descanso", color: "#ec4899", bgColor: "#fdf2f8" },
    { id: 'hodometro', title: "Hodômetro", icon: "🔢", desc: "Controle de quilometragem", color: "#06b6d4", bgColor: "#ecfeff" },
  ];

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={loadingTextStyle}>Carregando informações do motorista...</p>
      </div>
    );
  }

  if (!motorista) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorIconStyle}>⚠️</div>
        <h2 style={errorTitleStyle}>Motorista não encontrado</h2>
        <p style={errorTextStyle}>Não foi possível encontrar os dados deste motorista.</p>
        <button onClick={onVoltar} style={errorButtonStyle}>Voltar para lista</button>
      </div>
    );
  }

  if (activeSubTab === 'escala') {
    return <EscalaFolga motoristaId={motoristaId} onVoltar={() => setActiveSubTab(null)} />;
  }

  return (
    <div style={fullContainerStyle}>
      {/* Botão voltar aprimorado */}
      <button onClick={onVoltar} style={voltarButtonStyle}>
        <span style={voltarIconStyle}>←</span>
        Voltar para a lista de motoristas
      </button>

      {/* Header com gradiente e informações do motorista */}
      <div style={headerWrapperStyle}>
        <div style={headerStyle}>
          <div style={fotoContainerStyle}>
            {motorista.fotoPerfilUrl ? (
              <img src={motorista.fotoPerfilUrl} alt={motorista.nome} style={fotoStyle} />
            ) : (
              <div style={initialsCircleStyle}>{getInitials(motorista.nome)}</div>
            )}
            <div style={statusBadgeStyle}>
              {motorista.temMopp === 'Sim' ? '✅ MOPP' : '❌ Sem MOPP'}
            </div>
          </div>
          
          <div style={infoContainerStyle}>
            <h1 style={nomeStyle}>{motorista.nome}</h1>
            <div style={cpfBadgeStyle}>
              <span style={cpfLabelStyle}>CPF</span>
              <span style={cpfValueStyle}>{motorista.cpf}</span>
            </div>
            
            <div style={infoGridStyle}>
              <div style={infoCardStyle}>
                <span style={infoIconStyle}>📱</span>
                <div>
                  <div style={infoLabelStyle}>WhatsApp</div>
                  <div style={infoValueStyle}>{motorista.whatsapp || motorista.telefone || 'Não informado'}</div>
                </div>
              </div>
              
              <div style={infoCardStyle}>
                <span style={infoIconStyle}>📍</span>
                <div>
                  <div style={infoLabelStyle}>Cidade</div>
                  <div style={infoValueStyle}>{motorista.cidade || 'Não informada'}</div>
                </div>
              </div>
              
              <div style={infoCardStyle}>
                <span style={infoIconStyle}>🪪</span>
                <div>
                  <div style={infoLabelStyle}>CNH</div>
                  <div style={infoValueStyle}>Categoria {motorista.cnhCategoria || 'Não informada'}</div>
                </div>
              </div>
              
              {motorista.createdAt && (
                <div style={infoCardStyle}>
                  <span style={infoIconStyle}>📅</span>
                  <div>
                    <div style={infoLabelStyle}>Cadastrado em</div>
                    <div style={infoValueStyle}>{formatDate(motorista.createdAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Título do menu */}
      <div style={menuHeaderStyle}>
        <h2 style={menuTitleStyle}>Menu do Motorista</h2>
        <p style={menuSubtitleStyle}>Selecione uma opção para gerenciar</p>
      </div>

      {/* Grid de cards animados */}
      <div style={gridStyle}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            style={{
              ...menuCardStyle,
              transform: hoveredCard === item.id ? 'translateY(-8px)' : 'translateY(0)',
              boxShadow: hoveredCard === item.id 
                ? '0 20px 40px rgba(0,0,0,0.12)' 
                : '0 8px 28px rgba(0, 0, 0, 0.07)'
            }}
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveSubTab(item.id)}
          >
            <div style={{ ...iconWrapperStyle, backgroundColor: item.bgColor }}>
              <div style={{ ...iconContainerStyle, color: item.color }}>{item.icon}</div>
            </div>
            <h3 style={cardTitleStyle}>{item.title}</h3>
            <p style={cardDescStyle}>{item.desc}</p>
            <div style={cardArrowStyle}>
              <span style={arrowIconStyle}>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder para funcionalidades em desenvolvimento */}
      {activeSubTab && activeSubTab !== 'escala' && (
        <div style={comingSoonModalStyle}>
          <div style={comingSoonContentStyle}>
            <div style={comingSoonIconStyle}>🚧</div>
            <h3 style={comingSoonTitleStyle}>Em desenvolvimento</h3>
            <p style={comingSoonTextStyle}>
              A funcionalidade "{menuItems.find(i => i.id === activeSubTab)?.title}" 
              estará disponível em breve!
            </p>
            <button onClick={() => setActiveSubTab(null)} style={comingSoonButtonStyle}>
              Voltar ao menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const fullContainerStyle: React.CSSProperties = {
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

const errorContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  textAlign: 'center'
};

const errorIconStyle: React.CSSProperties = {
  fontSize: '64px',
  marginBottom: '20px'
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  color: '#1e2937',
  marginBottom: '12px'
};

const errorTextStyle: React.CSSProperties = {
  color: '#64748b',
  marginBottom: '24px'
};

const errorButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600'
};

const voltarButtonStyle: React.CSSProperties = {
  background: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '12px',
  color: '#475569',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  marginBottom: '30px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
};

const voltarIconStyle: React.CSSProperties = {
  fontSize: '18px'
};

const headerWrapperStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 40px auto'
};

const headerStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '28px',
  padding: '40px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '30px'
};

const fotoContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '160px',
  height: '160px'
};

const fotoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '4px solid white',
  boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
};

const initialsCircleStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  fontWeight: '700',
  color: 'white',
  border: '4px solid white',
  boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
};

const statusBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '0',
  right: '0',
  background: 'white',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  color: '#3b82f6',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  border: '2px solid white'
};

const infoContainerStyle: React.CSSProperties = {
  flex: 1
};

const nomeStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '12px'
};

const cpfBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: '#f1f5f9',
  padding: '6px 12px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const cpfLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase'
};

const cpfValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e2937'
};

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px'
};

const infoCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: '#f8fafc',
  borderRadius: '12px'
};

const infoIconStyle: React.CSSProperties = {
  fontSize: '24px'
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '4px'
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e2937'
};

const menuHeaderStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto',
  textAlign: 'center'
};

const menuTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '8px'
};

const menuSubtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#64748b'
};

const gridStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px'
};

const menuCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  padding: '32px 24px',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  overflow: 'hidden'
};

const iconWrapperStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '24px'
};

const iconContainerStyle: React.CSSProperties = {
  fontSize: '40px'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '12px'
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.5',
  marginBottom: '20px'
};

const cardArrowStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  right: '24px',
  opacity: 0,
  transition: 'opacity 0.3s ease'
};

const arrowIconStyle: React.CSSProperties = {
  fontSize: '20px',
  color: '#3b82f6'
};

const comingSoonModalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const comingSoonContentStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '28px',
  padding: '48px',
  textAlign: 'center',
  maxWidth: '400px',
  width: '90%'
};

const comingSoonIconStyle: React.CSSProperties = {
  fontSize: '64px',
  marginBottom: '20px'
};

const comingSoonTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '12px'
};

const comingSoonTextStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#64748b',
  marginBottom: '24px',
  lineHeight: '1.5'
};

const comingSoonButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer'
};

// Adicionar animações globais
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .menu-card:hover .card-arrow {
      opacity: 1;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MenuMotorista;