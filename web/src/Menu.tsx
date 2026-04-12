import React, { useState } from 'react';
import { auth } from './firebase';
import ListaMotoristas from './ListaMotoristas';
import ListaVeiculos from './ListaVeiculos';
import ListaCarretas from './ListaCarretas';
import MenuMotorista from './MenuMotorista';
import LançarCarga from './LançarCarga';

const Menu = () => {
  const [activeTab, setActiveTab] = useState<
    'motoristas-list' | 
    'veiculos-list' | 
    'carretas-list' |
    'lancar-carga'
  >('motoristas-list');

  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    auth.signOut();
    window.location.href = '/';
  };

  const handleSelectMotorista = (id: string) => {
    setSelectedMotoristaId(id);
  };

  const handleVoltarParaLista = () => {
    setSelectedMotoristaId(null);
  };

  const menuItems = [
    {
      section: 'Motoristas',
      items: [
        { id: 'motoristas-list', label: 'Motoristas Cadastrados', icon: '📋', color: '#FFD700' }
      ]
    },
    {
      section: 'Carretas',
      items: [
        { id: 'carretas-list', label: 'Carretas Cadastradas', icon: '📦', color: '#FFD700' }
      ]
    },
    {
      section: 'Veículos',
      items: [
        { id: 'veiculos-list', label: 'Veículos Cadastrados', icon: '🚙', color: '#FFD700' }
      ]
    },
    {
      section: 'Cargas',
      items: [
        { 
          id: 'lancar-carga', 
          label: 'Lançar Carga', 
          icon: '📦', 
          color: '#FFD700' 
        }
      ]
    }
  ];

  const getCurrentTitle = () => {
    for (const section of menuItems) {
      const item = section.items.find(i => i.id === activeTab);
      if (item) return item.label;
    }
    return 'Dashboard';
  };

  return (
    <div style={dashboardStyle}>
      {/* Sidebar */}
      <div style={{ ...sidebarStyle, width: sidebarCollapsed ? '80px' : '280px' }}>
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          style={collapseButtonStyle}
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>

        <div style={logoStyle}>
          {!sidebarCollapsed ? (
            <div style={logoWrapperStyle}>
              <img src="/tg-logo.png" alt="TG Logística" style={logoImageStyle} />
              <p style={logoSubtitleStyle}>Painel Gestor</p>
            </div>
          ) : (
            <div style={logoIconStyle}>
               <img src="/tg-logo.png" alt="TG" style={{ width: '40px', height: 'auto' }} />
            </div>
          )}
        </div>

        <nav style={navStyle}>
          {menuItems.map((section) => (
            <div key={section.section}>
              {!sidebarCollapsed && <div style={sectionTitleStyle}>{section.section}</div>}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  style={{
                    ...(sidebarCollapsed ? navButtonCollapsedStyle : navButtonStyle),
                    ...(activeTab === item.id ? activeButtonStyle : {}),
                    backgroundColor: hoveredItem === item.id && activeTab !== item.id ? 'rgba(255,215,0,0.1)' : (activeTab === item.id ? '#FFD700' : 'transparent'),
                    color: activeTab === item.id ? '#000' : '#CCC',
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => { 
                    setActiveTab(item.id as any); 
                    setSelectedMotoristaId(null);
                  }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <span style={iconStyle}>{item.icon}</span>
                  {!sidebarCollapsed && item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button onClick={handleLogout} style={logoutButtonStyle}>
          <span style={iconStyle}>🚪</span>
          {!sidebarCollapsed && 'Sair do Sistema'}
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div style={contentStyle}>
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <h1 style={pageTitleStyle}>{getCurrentTitle()}</h1>
            <p style={pageSubtitleStyle}>
              {selectedMotoristaId ? 'Gerenciando motorista específico' : 'Gerencie sua frota de forma eficiente'}
            </p>
          </div>
          <div style={userInfoStyle}>
            <div style={avatarStyle}>👨‍💼</div>
            <div style={userDetailsStyle}>
              <div style={userNameStyle}>Administrador</div>
              <div style={userRoleStyle}>Gestor de Frota</div>
            </div>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div style={contentAreaStyle}>
          <div style={contentWrapperStyle}>
            {activeTab === 'motoristas-list' && (
              selectedMotoristaId ? 
                <MenuMotorista motoristaId={selectedMotoristaId} onVoltar={handleVoltarParaLista} /> 
                : 
                <ListaMotoristas onSelectMotorista={handleSelectMotorista} />
            )}
            {activeTab === 'carretas-list' && <ListaCarretas />}
            {activeTab === 'veiculos-list' && <ListaVeiculos />}
            {activeTab === 'lancar-carga' && <LançarCarga />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS ATUALIZADOS - TEMA PRETO/DOURADO ====================
const dashboardStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#000',
  fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif"
};

const sidebarStyle: React.CSSProperties = {
  backgroundColor: '#0A0A0A',
  color: 'white',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '2px 0 20px rgba(0,0,0,0.5)',
  transition: 'width 0.3s ease',
  position: 'relative',
  zIndex: 10,
  borderRight: '1px solid #1A1A1A'
};

const collapseButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '-12px',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#FFD700',
  border: 'none',
  color: '#000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: '900',
  transition: 'all 0.3s ease',
  zIndex: 20
};

const logoStyle: React.CSSProperties = {
  marginBottom: '40px',
  textAlign: 'center',
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'center'
};

const logoWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
};

const logoImageStyle: React.CSSProperties = {
  width: '160px',
  height: 'auto',
};

const logoSubtitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#FFD700',
  marginTop: '2px',
  fontWeight: '600'
};

const logoIconStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  marginTop: '20px'
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '11px',
  fontWeight: '700',
  margin: '20px 0 8px 12px',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const navButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  margin: '4px 0',
  backgroundColor: 'transparent',
  color: '#CCC',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  transition: 'all 0.2s ease',
  textAlign: 'left'
};

const navButtonCollapsedStyle: React.CSSProperties = {
  ...navButtonStyle,
  justifyContent: 'center',
  padding: '12px',
  fontSize: '20px'
};

const activeButtonStyle: React.CSSProperties = {
  color: '#000',
  boxShadow: '0 4px 12px rgba(255,215,0,0.3)',
  fontWeight: '700'
};

const iconStyle: React.CSSProperties = {
  fontSize: '18px',
  minWidth: '24px'
};

const logoutButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  backgroundColor: '#EF4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '700',
  marginTop: '20px',
  transition: 'all 0.3s ease'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  background: '#0A0A0A',
  padding: '24px 32px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #1A1A1A',
  flexWrap: 'wrap',
  gap: '16px'
};

const headerLeftStyle: React.CSSProperties = {
  flex: 1
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '900',
  color: '#FFF',
  marginBottom: '8px'
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888'
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 16px',
  background: '#1A1A1A',
  borderRadius: '16px',
  border: '1px solid #333'
};

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: '#FFD700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px'
};

const userDetailsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column'
};

const userNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#FFF'
};

const userRoleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888'
};

const contentAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  background: '#000'
};

const contentWrapperStyle: React.CSSProperties = {
  padding: '24px'
};

export default Menu;