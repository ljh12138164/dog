import { useDog } from '@/http/useDogs';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const Detail = () => {
  const { id } = useLocalSearchParams();
  const { data, isLoading } = useDog(Number(id));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text>未找到狗狗信息</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {data.image_url && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: data.image_url }} style={styles.dogImage} />
        </View>
      )}

      <ThemedView style={styles.contentContainer}>
        <ThemedText type='defaultSemiBold' style={styles.name}>
          {data.name}
        </ThemedText>

        <View style={styles.infoSection}>
          <ThemedText style={styles.sectionTitle}>基本信息</ThemedText>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <ThemedText style={styles.label}>品种</ThemedText>
              <ThemedText style={styles.value}>{data.breed}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <ThemedText style={styles.label}>身高</ThemedText>
              <ThemedText style={styles.value}>{data.height} cm</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <ThemedText style={styles.label}>体重</ThemedText>
              <ThemedText style={styles.value}>{data.weight} kg</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <ThemedText style={styles.sectionTitle}>主人信息</ThemedText>
          <View style={styles.infoItem}>
            <ThemedText style={styles.label}>主人</ThemedText>
            <ThemedText style={styles.value}>{data.owner_username}</ThemedText>
          </View>
        </View>

        <View style={styles.infoSection}>
          <ThemedText style={styles.sectionTitle}>其他信息</ThemedText>
          <View style={styles.infoItem}>
            <ThemedText style={styles.label}>创建时间</ThemedText>
            <ThemedText style={styles.value}>
              {new Date(data.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <ThemedText style={styles.label}>更新时间</ThemedText>
            <ThemedText style={styles.value}>
              {new Date(data.updated_at).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  dogImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Detail;
