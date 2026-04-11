import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

const MenuMotorista = ({ navigation, route }: any) => {
  const { userId, email: loggedEmail } = route.params || {};

  const [motorista, setMotorista] = useState({
    nome: 'Carregando...',
    cpf: '',
    whatsapp: '',
    cidade: '',
    cnh: '',
    email: loggedEmail || '',
    foto: 'https://i.pravatar.cc/150?u=motorista',
    temMopp: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMotoristaData = async () => {
      if (!userId) return;
      try {
        const q = query(collection(db, 'motoristas'), where('uid', '==', userId), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setMotorista({
            nome: data.nome || 'Motorista',
            cpf: data.cpf || '',
            whatsapp: data.whatsapp || '',
            cidade: data.cidade || '',
            cnh: data.cnhCategoria || data.cnh || '',
            email: data.email || loggedEmail || '',
            foto: data.fotoPerfilUrl || `https://i.pravatar.cc/150?u=${userId}`,
            temMopp: data.temMopp === 'Sim',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMotoristaData();
  }, [userId, loggedEmail]);

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
        await signOut(auth);
        navigation.replace('Login');
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.loading}><Text>Carregando...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.profileCard}>
          <Image source={{ uri: motorista.foto }} style={styles.profileImage} />
          <div style={styles.info}>
            <Text style={styles.nome}>{motorista.nome}</Text>
            {motorista.cpf && <Text style={styles.cpf}>CPF: {motorista.cpf}</Text>}
            
            <View style={styles.details}>
              {motorista.whatsapp && <Text style={styles.detail}>📱 {motorista.whatsapp}</Text>}
              {motorista.cidade && <Text style={styles.detail}>📍 {motorista.cidade}</Text>}
              {motorista.cnh && <Text style={styles.detail}>🪪 CNH: {motorista.cnh}</Text>}
            </View>

            <Text style={styles.email}>{motorista.email}</Text>

            {motorista.temMopp && (
              <View style={styles.moppBadge}>
                <Text style={styles.moppText}>✅ MOPP</Text>
              </View>
            )}
          </div>
        </View>
      </View>

      <Text style={styles.menuTitle}>Menu do Motorista</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('HistoricoViagens', { 
            cpfMotorista: motorista.cpf, 
            nomeMotorista: motorista.nome 
          })}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="map" size={38} color="#0EA5E9" />
          </View>
          <Text style={styles.cardTitle}>Histórico de Viagens</Text>
          <Text style={styles.cardSubtitle}>Todas as viagens realizadas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Abastecimento')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="fuel" size={38} color="#F59E0B" />
          </View>
          <Text style={styles.cardTitle}>Abastecimentos</Text>
          <Text style={styles.cardSubtitle}>Registro de combustível</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Chat')}>
          <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="chatbubble-ellipses" size={38} color="#8B5CF6" />
          </View>
          <Text style={styles.cardTitle}>Chat com Motorista</Text>
          <Text style={styles.cardSubtitle}>Comunicar diretamente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Escala')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="calendar" size={38} color="#EC4899" />
          </View>
          <Text style={styles.cardTitle}>Escala / Folga</Text>
          <Text style={styles.cardSubtitle}>Gerenciar dias de descanso</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Hodometro')}>
          <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="speedometer" size={38} color="#3B82F6" />
          </View>
          <Text style={styles.cardTitle}>Hodômetro</Text>
          <Text style={styles.cardSubtitle}>Controle de quilometragem</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 50 },
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  profileImage: { width: 110, height: 110, borderRadius: 55, marginRight: 20 },
  info: { flex: 1, justifyContent: 'center' },
  nome: { fontSize: 24, fontWeight: '700', color: '#1E2937' },
  cpf: { fontSize: 15, color: '#64748B', marginTop: 4 },
  details: { marginVertical: 10 },
  detail: { fontSize: 15, color: '#475569', marginBottom: 3 },
  email: { fontSize: 15, color: '#3B82F6' },
  moppBadge: { backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  moppText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  menuTitle: { fontSize: 23, fontWeight: '700', color: '#1E2937', textAlign: 'center', marginVertical: 25 },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 120 },
  card: { backgroundColor: '#fff', width: '48%', borderRadius: 22, padding: 22, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  iconCircle: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16.5, fontWeight: '600', color: '#1E2937', textAlign: 'center', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  logoutButton: { position: 'absolute', bottom: 30, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 15, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8 },
  logoutText: { color: '#EF4444', fontWeight: '600', marginLeft: 10, fontSize: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default MenuMotorista;