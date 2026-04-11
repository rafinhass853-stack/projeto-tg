import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collectionGroup, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const HistoricoViagens = ({ navigation, route }: any) => {
  const { nomeMotorista, cpfMotorista } = route.params || {};

  const [viagens, setViagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'todas' | 'abertas' | 'finalizadas'>('todas');

  useEffect(() => {
    carregarDados();
  }, [cpfMotorista]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      if (!cpfMotorista) {
        setLoading(false);
        return;
      }

      // Consulta em grupo na sub-coleção "cargas"
      const q = query(
        collectionGroup(db, 'cargas'),
        where('cpf', '==', cpfMotorista),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      const lista: any[] = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });

      setViagens(lista);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar as viagens. Verifique se o índice do Firebase foi criado.");
    } finally {
      setLoading(false);
    }
  };

  const viagensFiltradas = viagens.filter((viagem) => {
    const status = (viagem.status || '').toLowerCase().trim();
    if (activeTab === 'abertas') return ['programada', 'em andamento'].includes(status);
    if (activeTab === 'finalizadas') return ['finalizada', 'concluída'].includes(status);
    return true;
  });

  const formatarData = (data: any) => {
    if (!data) return '—';
    const dateObj = data?.toDate ? data.toDate() : (data.seconds ? new Date(data.seconds * 1000) : new Date(data));
    return dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusInfo = (status = '') => {
    const s = status.toLowerCase().trim();
    if (['finalizada', 'concluída'].includes(s)) return { label: 'FINALIZADA', bg: '#ecfdf5', color: '#10b981', icon: 'checkmark-circle' as const };
    if (['em andamento'].includes(s)) return { label: 'EM ANDAMENTO', bg: '#dbeafe', color: '#3b82f6', icon: 'time-outline' as const };
    return { label: 'PROGRAMADA', bg: '#fef3c7', color: '#f59e0b', icon: 'calendar-outline' as const };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={26} color="#1e2937" />
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Histórico de Viagens</Text>
        <Text style={styles.subtitle}>{nomeMotorista || 'Motorista'}</Text>
      </View>

      <View style={styles.tabs}>
        {(['todas', 'abertas', 'finalizadas'] as const).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabAtivo]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextAtivo]}>
              {tab === 'todas' ? 'Todas' : tab === 'abertas' ? 'Em Aberto' : 'Finalizadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3b82f6" /><Text style={styles.loadingText}>Carregando...</Text></View>
      ) : viagensFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}><Ionicons name="calendar-outline" size={80} color="#cbd5e1" /><Text style={styles.emptyText}>Nenhuma viagem encontrada.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {viagensFiltradas.map((viagem) => {
            const statusInfo = getStatusInfo(viagem.status);
            return (
              <View key={viagem.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.numeroViagem}>DT: {viagem.dt || '—'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
                <View style={styles.routeContainer}>
                  <View style={styles.origem}>
                    <Text style={styles.cidade}>{viagem.coletaCidade || '—'}</Text>
                    <Text style={styles.local}>{viagem.coletaLocal || '—'}</Text>
                    <Text style={styles.dataText}>Coleta: {viagem.coletaData}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={24} color="#94a3b8" />
                  <View style={styles.destino}>
                    <Text style={styles.cidade}>{viagem.entregaCidade || '—'}</Text>
                    <Text style={styles.local}>{viagem.entregaLocal || '—'}</Text>
                    <Text style={styles.dataText}>Entrega: {viagem.entregaData}</Text>
                  </View>
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>🚛 {viagem.placa || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagem.peso} kg</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  voltar: { flexDirection: 'row', alignItems: 'center' },
  voltarText: { marginLeft: 8, fontSize: 18, fontWeight: '600', color: '#1e2937' },
  titulo: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  tab: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 25, backgroundColor: '#f1f5f9' },
  tabAtivo: { backgroundColor: '#3b82f6' },
  tabText: { fontWeight: '600', color: '#64748b', fontSize: 15 },
  tabTextAtivo: { color: '#fff' },
  scrollContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  numeroViagem: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  origem: { flex: 1 },
  destino: { flex: 1, alignItems: 'flex-end' },
  cidade: { fontSize: 16, fontWeight: '700', color: '#1e2937' },
  local: { fontSize: 13, color: '#64748b' },
  dataText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  infoText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { marginTop: 20, fontSize: 17, color: '#94a3b8' },
});

export default HistoricoViagens;