import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

interface StateSelectorProps {
  selectedStates: string[];
  onSelectStates: (states: string[]) => void;
  maxStates: number;
}

export function StateSelector({
  selectedStates,
  onSelectStates,
  maxStates,
}: StateSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStates = STATES.filter(
    (state) =>
      state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      state.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleState = (code: string) => {
    if (selectedStates.includes(code)) {
      onSelectStates(selectedStates.filter((s) => s !== code));
    } else {
      if (selectedStates.length >= maxStates) {
        Alert.alert(
          "Limit Reached",
          `You can select up to ${maxStates} state${
            maxStates > 1 ? "s" : ""
          }. Upgrade for unlimited searches!`
        );
        return;
      }
      onSelectStates([...selectedStates, code]);
    }
  };

  const selectAll = () => {
    if (maxStates >= 50) {
      onSelectStates(STATES.map((s) => s.code));
    } else {
      Alert.alert(
        "Upgrade Required",
        `Free users can select up to ${maxStates} states. Upgrade for all 50!`
      );
    }
  };

  const clearAll = () => {
    onSelectStates([]);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.selectorText,
            selectedStates.length === 0 && styles.placeholder,
          ]}
        >
          {selectedStates.length === 0
            ? "Tap to select states"
            : `${selectedStates.length} state${
                selectedStates.length > 1 ? "s" : ""
              } selected`}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      {selectedStates.length > 0 && (
        <View style={styles.selectedTags}>
          {selectedStates.map((code) => {
            const state = STATES.find((s) => s.code === code);
            return (
              <TouchableOpacity
                key={code}
                style={styles.tag}
                onPress={() => toggleState(code)}
              >
                <Text style={styles.tagText}>{state?.name || code}</Text>
                <Ionicons name="close" size={14} color="#10B981" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select States</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search states..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={selectAll}>
              <Text style={styles.quickActionText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={clearAll}>
              <Text style={styles.quickActionText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = selectedStates.includes(item.code);
              return (
                <TouchableOpacity
                  style={[styles.stateRow, isSelected && styles.stateRowSelected]}
                  onPress={() => toggleState(item.code)}
                >
                  <Text
                    style={[
                      styles.stateName,
                      isSelected && styles.stateNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.stateCode}>{item.code}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.stateList}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    fontSize: 16,
    color: "#1F2937",
  },
  placeholder: {
    color: "#9CA3AF",
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#D1FAE5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: "#065F46",
    fontSize: 13,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  doneButton: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickAction: {
    marginRight: 16,
  },
  quickActionText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "500",
  },
  stateList: {
    paddingBottom: 40,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stateRowSelected: {
    backgroundColor: "#F0FDF4",
  },
  stateName: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  stateNameSelected: {
    color: "#065F46",
    fontWeight: "500",
  },
  stateCode: {
    fontSize: 14,
    color: "#9CA3AF",
    marginRight: 12,
  },
});
