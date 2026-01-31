import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

type FormatType = 'narration' | 'podcast' | 'tts';

interface ContentFormatPickerProps {
  disabled: boolean;
  isProcessing: boolean;
  activeCta: FormatType | null;
  hasContent: boolean;
  language: string;
  onSelect: (type: FormatType) => void;
  onCancel: () => void;
}

export const ContentFormatPicker: React.FC<ContentFormatPickerProps> = ({
  disabled,
  isProcessing,
  activeCta,
  hasContent,
  language,
  onSelect,
  onCancel,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleMainPress = () => {
    if (isProcessing) return;
    setPickerVisible(true);
  };

  const handleFormatSelect = (type: FormatType) => {
    setPickerVisible(false);
    onSelect(type);
  };

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color="#27BEAA" />
          <Text style={styles.processingText}>
            {language === 'tr'
              ? activeCta === 'podcast' ? 'Podcast olusturuluyor...' : 'Icerik olusturuluyor...'
              : activeCta === 'podcast' ? 'Creating podcast...' : 'Creating content...'}
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>
              {language === 'tr' ? 'Vazgec' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.mainButton, disabled && styles.mainButtonDisabled]}
        disabled={disabled}
        onPress={handleMainPress}
        activeOpacity={0.8}
      >
        <Icon name="auto-awesome" size={18} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
        <Text style={[styles.mainButtonText, disabled && styles.mainButtonTextDisabled]}>
          {language === 'tr' ? 'Icerik Olustur' : 'Create Content'}
        </Text>
        <Icon name="expand-more" size={18} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
      </TouchableOpacity>

      {disabled && (
        <Text style={styles.hint}>
          {language === 'tr'
            ? 'Konu netlestikten sonra icerik olusturabilirsin.'
            : 'You can create content once the topic is clear.'}
        </Text>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {language === 'tr' ? 'Format Sec' : 'Select Format'}
            </Text>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleFormatSelect('narration')}
            >
              <View style={styles.optionIcon}>
                <Icon name="menu-book" size={20} color="#27BEAA" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {language === 'tr' ? 'Anlatim' : 'Narration'}
                </Text>
                <Text style={styles.optionDesc}>
                  {language === 'tr' ? '~3 dk · Konu hakkinda arastirma + seslendirme' : '~3 min · Research + narration about the topic'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleFormatSelect('podcast')}
            >
              <View style={styles.optionIcon}>
                <Icon name="graphic-eq" size={20} color="#27BEAA" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {language === 'tr' ? 'Podcast' : 'Podcast'}
                </Text>
                <Text style={styles.optionDesc}>
                  {language === 'tr' ? '~10 dk · Iki kisilik diyalog formati' : '~10 min · Two-person dialogue format'}
                </Text>
              </View>
            </TouchableOpacity>

            {hasContent && (
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleFormatSelect('tts')}
              >
                <View style={styles.optionIcon}>
                  <Icon name="volume-up" size={20} color="#27BEAA" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>
                    {language === 'tr' ? 'Metni Seslendir' : 'Narrate Text'}
                  </Text>
                  <Text style={styles.optionDesc}>
                    {language === 'tr' ? 'Mevcut Ingilizce metni seslendir' : 'Narrate existing English text'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.closeText}>
                {language === 'tr' ? 'Iptal' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#27BEAA',
  },
  mainButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  mainButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainButtonTextDisabled: {
    color: '#9CA3AF',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F766E',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B91C1C',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});
