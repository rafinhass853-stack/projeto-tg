import React, { useState } from 'react';
import { auth } from './firebase';
import CadastroMotorista from './CadastroMotorista';
import ListaMotoristas from './ListaMotoristas';
import CadastroVeiculo from './CadastroVeiculo';
import ListaVeiculos from './ListaVeiculos';
import CadastroCarretas from './CadastroCarretas';
import ListaCarretas from './ListaCarretas';
import MenuMotorista from './MenuMotorista';
import LançarCarga from './LançarCarga';

const Menu = () => {
  const [activeTab, setActiveTab] = useState<
    'motoristas-cad' | 
    'motoristas-list' | 
    'veiculos-cad' | 
    'veiculos-list' | 
    'carretas-cad' | 
    'carretas-list' |
    'lancar-carga'                    // ← Adicionado aqui
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
        { id: 'motoristas-cad', label: 'Cadastrar Motorista', icon: '👤', color: '#3b82f6' },
        { id: 'motoristas-list', label: 'Motoristas Cadastrados', icon: '📋', color: '#3b82f6' }
      ]
    },
    {
      section: 'Carretas',
      items: [
        { id: 'carretas-cad', label: 'Cadastrar Carreta', icon: '🚛', color: '#10b981' },
        { id: 'carretas-list', label: 'Carretas Cadastradas', icon: '📦', color: '#10b981' }
      ]
    },
    {
      section: 'Veículos',
      items: [
        { id: 'veiculos-cad', label: 'Cadastrar Veículo', icon: '🚗', color: '#f59e0b' },
        { id: 'veiculos-list', label: 'Veículos Cadastrados', icon: '🚙', color: '#f59e0b' }
      ]
    },
    {
      section: 'Cargas',
      items: [
        { 
          id: 'lancar-carga', 
          label: 'Lançar Carga', 
          icon: '📦', 
          color: '#8b5cf6' 
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
            <>
              <h2 style={logoTitleStyle}>Logística TG</h2>
              <p style={logoSubtitleStyle}>Painel Gestor</p>
            </>
          ) : (
            <div style={logoIconStyle}>📦</div>
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
                    ...(activeTab === item.id ? { ...activeButtonStyle, backgroundColor: item.color } : {}),
                    backgroundColor: hoveredItem === item.id && activeTab !== item.id ? 'rgba(255,255,255,0.1)' : (activeTab === item.id ? item.color : 'transparent'),
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
            {activeTab === 'motoristas-cad' && <CadastroMotorista />}
            {activeTab === 'motoristas-list' && (
              selectedMotoristaId ? 
                <MenuMotorista motoristaId={selectedMotoristaId} onVoltar={handleVoltarParaLista} /> 
                : 
                <ListaMotoristas onSelectMotorista={handleSelectMotorista} />
            )}
            {activeTab === 'carretas-cad' && <CadastroCarretas />}
            {activeTab === 'carretas-list' && <ListaCarretas />}
            {activeTab === 'veiculos-cad' && <CadastroVeiculo />}
            {activeTab === 'veiculos-list' && <ListaVeiculos />}
            {activeTab === 'lancar-carga' && <LançarCarga />}   {/* ← Corrigido */}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS ====================
// (Seus estilos permanecem iguais - não alterei nada aqui)

const dashboardStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif"
};

const sidebarStyle: React.CSSProperties = {
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '2px 0 20px rgba(0,0,0,0.2)',
  transition: 'width 0.3s ease',
  position: 'relative',
  zIndex: 10
};

const collapseButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '-12px',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#3b82f6',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  transition: 'all 0.3s ease',
  zIndex: 20
};

const logoStyle: React.CSSProperties = {
  marginBottom: '40px',
  textAlign: 'center',
  marginTop: '20px'
};

const logoTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  marginBottom: '4px',
  background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const logoSubtitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  marginTop: '4px'
};

const logoIconStyle: React.CSSProperties = {
  fontSize: '32px',
  textAlign: 'center'
};

const navStyle: React.CSSProperties = {
  flex: 1,
  marginTop: '20px'
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '11px',
  fontWeight: '600',
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
  color: '#cbd5e1',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.3s ease',
  textAlign: 'left'
};

const navButtonCollapsedStyle: React.CSSProperties = {
  ...navButtonStyle,
  justifyContent: 'center',
  padding: '12px',
  fontSize: '20px'
};

const activeButtonStyle: React.CSSProperties = {
  color: 'white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
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
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
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
  background: 'white',
  padding: '24px 32px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  flexWrap: 'wrap',
  gap: '16px'
};

const headerLeftStyle: React.CSSProperties = {
  flex: 1
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1e2937',
  marginBottom: '8px'
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b'
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 16px',
  background: '#f8fafc',
  borderRadius: '16px'
};

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  color: '#1e2937'
};

const userRoleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b'
};

const contentAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  background: '#f8fafc'
};

const contentWrapperStyle: React.CSSProperties = {
  padding: '24px'
};

export default Menu;