import React, { useMemo } from 'react';
import {
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../theme/colors';

type Segment =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'color'; text: string; color: string }
  | { type: 'size'; text: string; size: 'small' | 'medium' | 'large' }
  | { type: 'link'; text: string; url: string };

type Block =
  | { type: 'heading1' | 'heading2' | 'heading3' | 'paragraph'; text: string; align?: TextStyle['textAlign'] }
  | { type: 'quote'; text: string; align?: TextStyle['textAlign'] }
  | { type: 'bullet'; text: string; align?: TextStyle['textAlign'] }
  | { type: 'number'; text: string; indexLabel: string; align?: TextStyle['textAlign'] }
  | { type: 'spacer' };

const normalizeLink = (link?: string): string => {
  if (!link) {
    return '';
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return '';
  }

  const resolved = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('/')
      ? `https://www.lingroot.com${trimmed}`
      : `https://${trimmed}`;

  return encodeURI(resolved);
};

const parseInline = (text: string): Segment[] => {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]|\[size=(small|medium|large)\]([\s\S]*?)\[\/size\]|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[2] && match[3]) {
      segments.push({ type: 'link', text: match[2], url: normalizeLink(match[3]) });
    } else if (match[4] && match[5]) {
      segments.push({ type: 'color', color: match[4], text: match[5] });
    } else if (match[0].startsWith('[size=')) {
      const sizeMatch = match[0].match(/^\[size=(small|medium|large)\]([\s\S]*?)\[\/size\]$/);
      if (sizeMatch) {
        segments.push({
          type: 'size',
          size: sizeMatch[1] as 'small' | 'medium' | 'large',
          text: sizeMatch[2],
        });
      }
    } else if (match[8] || match[9]) {
      segments.push({ type: 'bold', text: match[8] || match[9] || '' });
    } else if (match[10] || match[11]) {
      segments.push({ type: 'italic', text: match[10] || match[11] || '' });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
};

const extractAlign = (line: string): { text: string; align?: TextStyle['textAlign'] } => {
  const match = line.match(/^\[align=(left|center|right|justify)\]([\s\S]*)\[\/align\]$/);
  if (!match) {
    return { text: line };
  }

  return {
    align: match[1] as TextStyle['textAlign'],
    text: match[2],
  };
};

const parseBlocks = (message: string): Block[] => {
  return message.split(/\r?\n/).map((line) => {
    const { text: alignedLine, align } = extractAlign(line);

    if (!alignedLine.trim()) {
      return { type: 'spacer' } as Block;
    }
    if (/^###\s+/.test(alignedLine)) {
      return { type: 'heading3', text: alignedLine.replace(/^###\s+/, ''), align } as Block;
    }
    if (/^##\s+/.test(alignedLine)) {
      return { type: 'heading2', text: alignedLine.replace(/^##\s+/, ''), align } as Block;
    }
    if (/^#\s+/.test(alignedLine)) {
      return { type: 'heading1', text: alignedLine.replace(/^#\s+/, ''), align } as Block;
    }
    if (/^\s*>\s+/.test(alignedLine)) {
      return { type: 'quote', text: alignedLine.replace(/^\s*>\s+/, ''), align } as Block;
    }
    if (/^\s*[-*]\s+/.test(alignedLine)) {
      return { type: 'bullet', text: alignedLine.replace(/^\s*[-*]\s+/, ''), align } as Block;
    }
    const numbered = alignedLine.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      return { type: 'number', indexLabel: `${numbered[1]}.`, text: numbered[2], align } as Block;
    }
    return { type: 'paragraph', text: alignedLine, align } as Block;
  });
};

export const stripNotificationFormatting = (message: string): string => {
  return message
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]/g, '$2')
    .replace(/\[size=(small|medium|large)\]([\s\S]*?)\[\/size\]/g, '$2')
    .replace(/\[align=(left|center|right|justify)\]([\s\S]*?)\[\/align\]/g, '$2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim();
};

interface Props {
  message: string;
  style?: StyleProp<ViewStyle>;
  paragraphStyle?: StyleProp<TextStyle>;
  centered?: boolean;
}

const FormattedNotificationMessage: React.FC<Props> = ({
  message,
  style,
  paragraphStyle,
  centered = false,
}) => {
  const blocks = useMemo(() => parseBlocks(message || ''), [message]);

  const openLink = async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Ignore failures
    }
  };

  const renderInline = (text: string, blockStyle?: StyleProp<TextStyle>) => {
    return parseInline(text).map((segment, index) => {
      if (segment.type === 'bold') {
        return <Text key={index} style={[blockStyle, styles.bold]}>{segment.text}</Text>;
      }
      if (segment.type === 'italic') {
        return <Text key={index} style={[blockStyle, styles.italic]}>{segment.text}</Text>;
      }
      if (segment.type === 'color') {
        return <Text key={index} style={[blockStyle, { color: segment.color }]}>{segment.text}</Text>;
      }
      if (segment.type === 'size') {
        const sizeStyle =
          segment.size === 'small'
            ? styles.sizeSmall
            : segment.size === 'large'
              ? styles.sizeLarge
              : styles.sizeMedium;
        return <Text key={index} style={[blockStyle, sizeStyle]}>{segment.text}</Text>;
      }
      if (segment.type === 'link') {
        return (
          <Text
            key={index}
            style={[blockStyle, styles.link]}
            onPress={() => openLink(segment.url)}
          >
            {segment.text}
          </Text>
        );
      }
      return <Text key={index} style={blockStyle}>{segment.text}</Text>;
    });
  };

  return (
    <View style={style}>
      {blocks.map((block, index) => {
        if (block.type === 'spacer') {
          return <View key={index} style={styles.spacer} />;
        }

        const alignedStyle = block.align ? { textAlign: block.align } : null;

        if (block.type === 'bullet') {
          return (
            <View key={index} style={styles.row}>
              <Text style={[styles.marker, centered && styles.centeredText, alignedStyle]}>•</Text>
              <Text style={[styles.paragraph, centered && styles.centeredText, alignedStyle, paragraphStyle]}>
                {renderInline(block.text, [styles.paragraph, centered && styles.centeredText, alignedStyle, paragraphStyle])}
              </Text>
            </View>
          );
        }

        if (block.type === 'number') {
          return (
            <View key={index} style={styles.row}>
              <Text style={[styles.marker, centered && styles.centeredText, alignedStyle]}>{block.indexLabel}</Text>
              <Text style={[styles.paragraph, centered && styles.centeredText, alignedStyle, paragraphStyle]}>
                {renderInline(block.text, [styles.paragraph, centered && styles.centeredText, alignedStyle, paragraphStyle])}
              </Text>
            </View>
          );
        }

        if (block.type === 'quote') {
          return (
            <View key={index} style={styles.quote}>
              <Text style={[styles.quoteText, centered && styles.centeredText, alignedStyle, paragraphStyle]}>
                {renderInline(block.text, [styles.quoteText, centered && styles.centeredText, alignedStyle, paragraphStyle])}
              </Text>
            </View>
          );
        }

        const blockStyle =
          block.type === 'heading1'
            ? styles.heading1
            : block.type === 'heading2'
              ? styles.heading2
              : block.type === 'heading3'
                ? styles.heading3
                : styles.paragraph;

        return (
          <Text
            key={index}
            style={[blockStyle, centered && styles.centeredText, alignedStyle, paragraphStyle]}
          >
            {renderInline(block.text, [blockStyle, centered && styles.centeredText, alignedStyle, paragraphStyle])}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.slate600,
    marginBottom: 8,
  },
  heading1: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: COLORS.slate800,
    marginBottom: 8,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brandTeal,
    paddingLeft: 12,
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.slate700,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  marker: {
    width: 20,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  bold: {
    fontWeight: '800',
    color: COLORS.slate900,
  },
  italic: {
    fontStyle: 'italic',
  },
  sizeSmall: {
    fontSize: 12,
    lineHeight: 18,
  },
  sizeMedium: {
    fontSize: 22,
    lineHeight: 30,
  },
  sizeLarge: {
    fontSize: 32,
    lineHeight: 40,
  },
  link: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  spacer: {
    height: 6,
  },
  centeredText: {
    textAlign: 'center',
  },
});

export default React.memo(FormattedNotificationMessage);
