import { TextInput } from 'react-native';

type LabeledFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  keyboardType?: any;
  icon?: any;
};

export function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  multiline,
  keyboardType,
  icon,
}: LabeledFieldProps) {
  return (
    // your existing UI
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  );
}