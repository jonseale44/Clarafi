import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ParsedOrder } from '../types';
import { apiClient } from '../services/api';

interface OrderEntryScreenProps {
  navigation: any;
  route: any;
}

export const OrderEntryScreen: React.FC<OrderEntryScreenProps> = ({ navigation, route }) => {
  const { encounterId, patientId } = route.params;
  const [orderText, setOrderText] = useState('');
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseOrders = async () => {
    if (!orderText.trim()) {
      Alert.alert('Error', 'Please enter order text');
      return;
    }

    setIsParsing(true);
    try {
      const result = await apiClient.parseOrders(orderText);
      setParsedOrders(result.orders || []);
    } catch (error) {
      console.error('Failed to parse orders:', error);
      Alert.alert('Error', 'Failed to parse orders');
    } finally {
      setIsParsing(false);
    }
  };

  const submitOrders = async () => {
    if (parsedOrders.length === 0) {
      Alert.alert('Error', 'No orders to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement order submission
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      Alert.alert('Success', 'Orders submitted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to submit orders:', error);
      Alert.alert('Error', 'Failed to submit orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrder = (index: number) => {
    setParsedOrders(parsedOrders.filter((_, i) => i !== index));
  };

  const getOrderIcon = (type: string) => {
    switch (type) {
      case 'medication': return '💊';
      case 'lab': return '🧪';
      case 'imaging': return '📷';
      case 'referral': return '👨‍⚕️';
      default: return '📋';
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'medication': return '#10B981';
      case 'lab': return '#3B82F6';
      case 'imaging': return '#8B5CF6';
      case 'referral': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Natural Language Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Enter Orders</Text>
          <Text style={styles.helperText}>
            Type orders in natural language, e.g., "CBC, CMP, metformin 500mg BID"
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter orders..."
            value={orderText}
            onChangeText={setOrderText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.parseButton, isParsing && styles.buttonDisabled]}
            onPress={parseOrders}
            disabled={isParsing}
          >
            {isParsing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Parse Orders with AI</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Parsed Orders */}
        {parsedOrders.length > 0 && (
          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Parsed Orders</Text>
            {parsedOrders.map((order, index) => (
              <View key={index} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderTypeContainer}>
                    <Text style={styles.orderIcon}>{getOrderIcon(order.type)}</Text>
                    <View
                      style={[
                        styles.orderTypeBadge,
                        { backgroundColor: getOrderTypeColor(order.type) + '20' }
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderTypeText,
                          { color: getOrderTypeColor(order.type) }
                        ]}
                      >
                        {order.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeOrder(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.orderText}>{order.text}</Text>
                {order.confidence && (
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(order.confidence * 100)}%
                  </Text>
                )}
              </View>
            ))}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={submitOrders}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Submit {parsedOrders.length} Orders</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Example Orders */}
        <View style={styles.examplesSection}>
          <Text style={styles.sectionTitle}>Examples</Text>
          <Text style={styles.exampleText}>• CBC, CMP, lipid panel</Text>
          <Text style={styles.exampleText}>• Metformin 500mg BID, lisinopril 10mg daily</Text>
          <Text style={styles.exampleText}>• Chest X-ray PA/lateral</Text>
          <Text style={styles.exampleText}>• Refer to cardiology for chest pain</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  parseButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersSection: {
    marginBottom: 24,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIcon: {
    fontSize: 20,
  },
  orderTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#DC2626',
  },
  orderText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  examplesSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  exampleText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});