import { StyleSheet, TextInput, View } from 'react-native';
import { RefreshCw, Search } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

interface QueueSearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/** QueueSearchBar — search input plus refresh action for the queue list. */
export function QueueSearchBar({
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
}: QueueSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search size={16} color={colors.gray400} />
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={strings.queues.searchPlaceholder}
          placeholderTextColor={colors.gray400}
          accessibilityLabel={strings.queues.searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <Button
        variant="outline"
        onPress={onRefresh}
        disabled={isRefreshing}
        loading={isRefreshing}
        accessibilityLabel={strings.common.refresh}
        style={styles.refreshButton}
      >
        {!isRefreshing ? <RefreshCw size={16} color={colors.gray900} /> : undefined}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray900,
  },
  refreshButton: {
    width: 48,
  },
});
