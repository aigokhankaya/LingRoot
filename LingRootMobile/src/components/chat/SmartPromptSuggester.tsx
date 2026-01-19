import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../../services/environmentConfig';

interface TopicSuggestion {
    title: string;
    description: string;
    type: 'previous' | 'related' | 'popular';
    similarity?: number;
    creatorName?: string;
    usage_count?: number;
}

interface SmartPromptSuggesterProps {
    conversationId?: string | null;
    onSelectSuggestion: (topic: string) => void;
    language: 'tr' | 'en';
}

export const SmartPromptSuggester: React.FC<SmartPromptSuggesterProps> = ({
    conversationId,
    onSelectSuggestion,
    language,
}) => {
    const [suggestions, setSuggestions] = useState<{
        yourPreviousTopics: TopicSuggestion[];
        relatedTopics: TopicSuggestion[];
    }>({ yourPreviousTopics: [], relatedTopics: [] });

    const [popularTopics, setPopularTopics] = useState<TopicSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'smart' | 'popular'>('smart');
    const [apiUrl, setApiUrl] = useState<string>('');

    useEffect(() => {
        getApiBaseUrl()
            .then(setApiUrl)
            .catch(() => setApiUrl(''));
    }, []);

    useEffect(() => {
        if (!apiUrl) return;
        fetchSuggestions();
        fetchPopularTopics();
    }, [conversationId, apiUrl]);

    const getToken = async () => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token && token !== 'null' && token !== 'undefined') return token;
        const legacy = await AsyncStorage.getItem('lingroot_token');
        return legacy || '';
    };

    const fetchSuggestions = async () => {
        if (!conversationId || !apiUrl) return;

        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(
                `${apiUrl}/api/ai-chat/conversations/${conversationId}/suggestions`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSuggestions(
                    data.suggestions || { yourPreviousTopics: [], relatedTopics: [] }
                );
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPopularTopics = async () => {
        if (!apiUrl) return;
        try {
            const token = await getToken();
            const response = await fetch(`${apiUrl}/api/ai-chat/suggestions?limit=5`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPopularTopics(data.topics || []);
            }
        } catch (error) {
            console.error('Failed to fetch popular topics:', error);
        }
    };

    const handleSuggestionClick = (suggestion: TopicSuggestion) => {
        const prompt =
            language === 'tr'
                ? `${suggestion.title} hakkında ${suggestion.description ? suggestion.description + ' konulu ' : ''}bir içerik oluşturmak istiyorum`
                : `I want to create content about ${suggestion.title}${suggestion.description ? ` on the topic of ${suggestion.description}` : ''}`;
        onSelectSuggestion(prompt);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#27BEAA" />
            </View>
        );
    }

    const hasSmartSuggestions =
        (suggestions?.yourPreviousTopics?.length || 0) > 0 ||
        (suggestions?.relatedTopics?.length || 0) > 0;

    // If no suggestions at all, don't render
    if (!hasSmartSuggestions && popularTopics.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Tabs */}
            {hasSmartSuggestions && (
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('smart')}
                        style={[styles.tab, activeTab === 'smart' && styles.tabActive]}
                    >
                        <Icon
                            name="auto-awesome"
                            size={14}
                            color={activeTab === 'smart' ? '#27BEAA' : '#6B7280'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'smart' && styles.tabTextActive,
                            ]}
                        >
                            {language === 'tr' ? 'Akıllı Öneriler' : 'Smart Suggestions'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('popular')}
                        style={[styles.tab, activeTab === 'popular' && styles.tabActive]}
                    >
                        <Icon
                            name="trending-up"
                            size={14}
                            color={activeTab === 'popular' ? '#27BEAA' : '#6B7280'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'popular' && styles.tabTextActive,
                            ]}
                        >
                            {language === 'tr' ? 'Popüler Konular' : 'Popular Topics'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Smart Suggestions Tab */}
            {activeTab === 'smart' && hasSmartSuggestions && (
                <View style={styles.suggestionsSection}>
                    {/* Previous Topics */}
                    {(suggestions?.yourPreviousTopics?.length || 0) > 0 && (
                        <View style={styles.sectionBlock}>
                            <View style={styles.sectionHeader}>
                                <Icon name="history" size={14} color="#6B7280" />
                                <Text style={styles.sectionTitle}>
                                    {language === 'tr'
                                        ? 'Daha Önce Konuştuklarınız'
                                        : 'Your Previous Topics'}
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                {suggestions?.yourPreviousTopics?.map((topic, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.chip}
                                        onPress={() => handleSuggestionClick(topic)}
                                    >
                                        <Text style={styles.chipText}>{topic.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Related Topics */}
                    {(suggestions?.relatedTopics?.length || 0) > 0 && (
                        <View style={styles.sectionBlock}>
                            <View style={styles.sectionHeader}>
                                <Icon name="auto-awesome" size={14} color="#6B7280" />
                                <Text style={styles.sectionTitle}>
                                    {language === 'tr'
                                        ? 'Benzer İlginç Konular'
                                        : 'Similar Interesting Topics'}
                                </Text>
                            </View>
                            {suggestions?.relatedTopics?.map((topic, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.relatedCard}
                                    onPress={() => handleSuggestionClick(topic)}
                                >
                                    <Text style={styles.relatedTitle}>{topic.title}</Text>
                                    {topic.description && (
                                        <Text style={styles.relatedDescription}>
                                            {topic.description}
                                        </Text>
                                    )}
                                    {topic.creatorName && (
                                        <Text style={styles.relatedCreator}>
                                            💡 {topic.creatorName}{' '}
                                            {language === 'tr' ? 'tarafından önerildi' : 'suggested'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Popular Topics Tab */}
            {activeTab === 'popular' && popularTopics.length > 0 && (
                <View style={styles.suggestionsSection}>
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionHeader}>
                            <Icon name="trending-up" size={14} color="#6B7280" />
                            <Text style={styles.sectionTitle}>
                                {language === 'tr'
                                    ? 'En Çok Kullanılan Konular'
                                    : 'Most Used Topics'}
                            </Text>
                        </View>
                        {popularTopics.map((topic, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.popularCard}
                                onPress={() => handleSuggestionClick(topic)}
                            >
                                <View style={styles.popularCardContent}>
                                    <Text style={styles.popularTitle}>{topic.title}</Text>
                                    {topic.description && (
                                        <Text style={styles.popularDescription}>
                                            {topic.description}
                                        </Text>
                                    )}
                                </View>
                                {topic.usage_count && topic.usage_count > 0 && (
                                    <View style={styles.usageBadge}>
                                        <Text style={styles.usageBadgeText}>
                                            {topic.usage_count}×
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Show only popular if no smart suggestions */}
            {!hasSmartSuggestions && popularTopics.length > 0 && (
                <View style={styles.suggestionsSection}>
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionHeader}>
                            <Icon name="trending-up" size={14} color="#6B7280" />
                            <Text style={styles.sectionTitle}>
                                {language === 'tr'
                                    ? 'Popüler Konular'
                                    : 'Popular Topics'}
                            </Text>
                        </View>
                        {popularTopics.map((topic, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.popularCard}
                                onPress={() => handleSuggestionClick(topic)}
                            >
                                <View style={styles.popularCardContent}>
                                    <Text style={styles.popularTitle}>{topic.title}</Text>
                                    {topic.description && (
                                        <Text style={styles.popularDescription}>
                                            {topic.description}
                                        </Text>
                                    )}
                                </View>
                                {topic.usage_count && topic.usage_count > 0 && (
                                    <View style={styles.usageBadge}>
                                        <Text style={styles.usageBadgeText}>
                                            {topic.usage_count}×
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    loadingContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#27BEAA',
    },
    tabText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#27BEAA',
    },
    suggestionsSection: {
        gap: 16,
    },
    sectionBlock: {
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(39, 190, 170, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(39, 190, 170, 0.3)',
    },
    chipText: {
        fontSize: 12,
        color: '#27BEAA',
        fontWeight: '500',
    },
    relatedCard: {
        padding: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
        marginBottom: 8,
    },
    relatedTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    relatedDescription: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
    },
    relatedCreator: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 4,
    },
    popularCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        marginBottom: 8,
    },
    popularCardContent: {
        flex: 1,
    },
    popularTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#059669',
    },
    popularDescription: {
        fontSize: 11,
        color: '#10B981',
        marginTop: 4,
    },
    usageBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    usageBadgeText: {
        fontSize: 10,
        color: '#059669',
        fontWeight: '600',
    },
});

export default SmartPromptSuggester;
