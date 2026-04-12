import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { collectionGroup, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const HistoricoViagens = ({ navigation, route }: any) => {
  const { nomeMotorista, cpfMotorista } = route.params || {};

  const [viagens, setViagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'abertas' | 'finalizadas'>('finalizadas');

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

      const q = query(
        collectionGroup(db, 'cargas'),
        where('cpf', '==', cpfMotorista),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      const lista: any[] = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, docId: doc.ref.path, ...doc.data() });
      });

      setViagens(lista);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar as viagens.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status = '') => {
    const s = status.toLowerCase().trim();
    if (s === 'finalizada' || s === 'concluída')
      return { label: 'FINALIZADA', color: '#22C55E', icon: 'checkmark-circle' as const };
    if (s === 'seguindo_para_entrega')
      return { label: 'EM ROTA', color: '#22C55E', icon: 'car-sport' as const };
    if (s === 'aguardando_carregamento')
      return { label: 'AGUARDANDO CARREGAMENTO', color: '#FFD700', icon: 'time' as const };
    if (s === 'programada')
      return { label: 'PROGRAMADA', color: '#FFD700', icon: 'calendar' as const };
    return { label: 'EM ANDAMENTO', color: '#3B82F6', icon: 'time' as const };
  };

  const viagensFiltradas = viagens.filter((viagem) => {
    const status = (viagem.status || '').toLowerCase().trim();
    if (activeTab === 'abertas')
      return ['programada', 'aguardando_carregamento', 'seguindo_para_entrega'].includes(status);
    if (activeTab === 'finalizadas')
      return ['finalizada', 'concluída'].includes(status);
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={28} color="#FFD700" />
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>HISTÓRICO DE VIAGENS</Text>
        <Text style={styles.subtitle}>{nomeMotorista || 'Motorista'}</Text>
      </View>

      <View style={styles.tabs}>
        {(['abertas', 'finalizadas'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabAtivo]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextAtivo]}>
              {tab === 'abertas' ? 'Em Aberto' : 'Finalizadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Carregando suas viagens...</Text>
        </View>
      ) : viagensFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={90} color="#333" />
          <Text style={styles.emptyText}>Nenhuma viagem encontrada</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {viagensFiltradas.map((viagem) => {
            const statusInfo = getStatusInfo(viagem.status);
            return (
              <View key={viagem.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.numeroViagem}>DT: {viagem.dt || '—'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.origem}>
                    <Text style={styles.cidadeLabel}>COLETA</Text>
                    <Text style={styles.cidade} numberOfLines={2}>{viagem.coletaCidade || '—'}</Text>
                    <Text style={styles.local} numberOfLines={2}>{viagem.clienteColeta || viagem.coletaLocal || '—'}</Text>
                    <Text style={styles.dataText}>Coleta • {viagem.coletaData}</Text>
                    {viagem.chegadaColeta && (
                      <Text style={styles.chegadaText}>✅ {viagem.chegadaColeta.dataHora}</Text>
                    )}
                  </View>

                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={24} color="#FFD700" />
                  </View>

                  <View style={styles.destino}>
                    <Text style={styles.cidadeLabel}>ENTREGA</Text>
                    <Text style={styles.cidade} numberOfLines={2}>{viagem.entregaCidade || '—'}</Text>
                    <Text style={styles.local} numberOfLines={2}>{viagem.clienteEntrega || viagem.entregaLocal || '—'}</Text>
                    <Text style={styles.dataText}>Entrega • {viagem.entregaData}</Text>
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>🚛 {viagem.placa || '—'}</Text>
                  <Text style={styles.infoText}>🚚 {viagem.placaCarreta || viagem.carreta || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagem.peso || '—'} kg</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  voltar: { flexDirection: 'row', alignItems: 'center' },
  voltarText: { marginLeft: 10, fontSize: 18, fontWeight: '600', color: '#FFD700' },
  titulo: { fontSize: 24, fontWeight: '900', color: '#FFD700', marginTop: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: '#0A0A0A', paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 20, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tabAtivo: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  tabText: { fontWeight: '700', color: '#888', fontSize: 14 },
  tabTextAtivo: { color: '#000' },

  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  numeroViagem: { fontSize: 14, fontWeight: '600', color: '#888' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 11.5, fontWeight: '700' },

  routeContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginVertical: 10, gap: 8 },
  origem: { flex: 1 },
  destino: { flex: 1, alignItems: 'flex-end' },
  cidadeLabel: { fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  cidade: { fontSize: 15, fontWeight: '700', color: '#FFF', minHeight: 38 },
  local: { fontSize: 12, color: '#AAA', marginTop: 4, minHeight: 32 },
  dataText: { fontSize: 11, color: '#666', marginTop: 4 },
  chegadaText: { fontSize: 11, color: '#22C55E', marginTop: 4, fontWeight: '600' },
  arrowContainer: { paddingHorizontal: 8, paddingTop: 20 },

  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1F1F1F', gap: 6 },
  infoText: { fontSize: 13, color: '#CCC', fontWeight: '600', flex: 1, textAlign: 'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#666' },
});

export default HistoricoViagens;