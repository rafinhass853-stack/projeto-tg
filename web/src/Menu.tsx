import React, { useState } from 'react';
import CadastroMotorista from './CadastroMotorista';
import ListaMotoristas from './ListaMotoristas';
import CadastroVeiculo from './CadastroVeiculo';
import ListaVeiculos from './ListaVeiculos';
import MenuMotorista from './MenuMotorista';
import { auth } from './firebase';

const Menu = () => {
  const [activeTab, setActiveTab] = useState<'motoristas-list' | 'motoristas-cad' | 'veiculos-list' | 'veiculos-cad'>('motoristas-list');
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string | null>(null);

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

  return (
    <div style={dashboardStyle}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={logoStyle}>
          <h2>Logística TG</h2>
          <p>Painel Gestor</p>
        </div>

        <nav style={navStyle}>
          <div style={sectionTitle}>Motoristas</div>
          <button 
            style={activeTab === 'motoristas-cad' ? activeButton : navButton} 
            onClick={() => { setActiveTab('motoristas-cad'); setSelectedMotoristaId(null); }}
          >
            Cadastrar Motorista
          </button>
          <button 
            style={activeTab === 'motoristas-list' ? activeButton : navButton} 
            onClick={() => { setActiveTab('motoristas-list'); setSelectedMotoristaId(null); }}
          >
            Motoristas Cadastrados
          </button>

          <div style={sectionTitle}>Veículos</div>
          <button 
            style={activeTab === 'veiculos-cad' ? activeButton : navButton} 
            onClick={() => { setActiveTab('veiculos-cad'); setSelectedMotoristaId(null); }}
          >
            Cadastrar Veículo
          </button>
          <button 
            style={activeTab === 'veiculos-list' ? activeButton : navButton} 
            onClick={() => { setActiveTab('veiculos-list'); setSelectedMotoristaId(null); }}
          >
            Veículos Cadastrados
          </button>
        </nav>

        <button onClick={handleLogout} style={logoutButton}>
          Sair do Sistema
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div style={contentStyle}>
        {activeTab === 'motoristas-cad' && <CadastroMotorista />}
        
        {activeTab === 'motoristas-list' && (
          selectedMotoristaId ? 
            <MenuMotorista motoristaId={selectedMotoristaId} onVoltar={handleVoltarParaLista} /> 
            : 
            <ListaMotoristas onSelectMotorista={handleSelectMotorista} />
        )}

        {activeTab === 'veiculos-cad' && <CadastroVeiculo />}
        {activeTab === 'veiculos-list' && <ListaVeiculos />}
      </div>
    </div>
  );
};

// ==================== ESTILOS GERAIS ====================
const dashboardStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f8fafc',
  fontFamily: 'Segoe UI, sans-serif'
};

const sidebarStyle: React.CSSProperties = {
  width: '280px',
  backgroundColor: '#1e2937',
  color: 'white',
  padding: '30px 20px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
};

const logoStyle: React.CSSProperties = {
  marginBottom: '50px',
  textAlign: 'center'
};

const navStyle: React.CSSProperties = {
  flexGrow: 1
};

const sectionTitle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '600',
  margin: '25px 0 10px 15px',
  textTransform: 'uppercase'
};

const navButton: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '14px 20px',
  margin: '4px 0',
  backgroundColor: 'transparent',
  color: '#cbd5e1',
  border: 'none',
  textAlign: 'left',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '15px'
};

const activeButton: React.CSSProperties = {
  ...navButton,
  backgroundColor: '#3b82f6',
  color: 'white',
  fontWeight: '600'
};

const logoutButton: React.CSSProperties = {
  marginTop: 'auto',
  padding: '14px',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '0',
  overflowY: 'auto'
};

export default Menu;