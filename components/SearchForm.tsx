import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { StateSelector } from "./StateSelector";

interface SearchFormProps {
  onSubmit: (firstName: string, lastName: string, states: string[]) => void;
  loading: boolean;
  maxStates: number;
}

export function SearchForm({ onSubmit, loading, maxStates }: SearchFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }
    if (selectedStates.length === 0) {
      return;
    }
    onSubmit(firstName.trim(), lastName.trim(), selectedStates);
  };

  const isValid =
    firstName.trim() && lastName.trim() && selectedStates.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
          autoComplete="given-name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
          autoComplete="family-name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          States to Search ({selectedStates.length}/{maxStates})
        </Text>
        <StateSelector
          selectedStates={selectedStates}
          onSelectStates={setSelectedStates}
          maxStates={maxStates}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isValid || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Starting Search..." : "Search for My Money"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
  },
  submitButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
