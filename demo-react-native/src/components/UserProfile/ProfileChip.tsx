import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { ReasonType, type ReasonCode } from '@/sdk';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

interface ProfileChipProps {
  /** Agent display name; falls back to {@link email} when empty. */
  fullName: string | undefined;
  /** Used when {@link fullName} is empty. */
  email?: string;
  /** Current assignable status from the SDK. */
  status: ReasonCode | null;
  /** When false, the status row reads "Not logged in". */
  isLoggedInToCx: boolean;
  /** Opens the profile sheet (status, CX controls, audio, sign out). */
  onPress: () => void;
}

/** Maps a {@link ReasonType} to the badge variant used on the chip. */
function getStatusVariant(type: ReasonType | undefined): BadgeVariant {
  switch (type) {
    case ReasonType.AVAILABLE:
      return 'available';
    case ReasonType.BUSY:
      return 'busy';
    case ReasonType.AWAY:
      return 'away';
    case ReasonType.OFFLINE:
      return 'offline';
    default:
      return 'secondary';
  }
}

/** Maps a {@link ReasonType} to a short display label. */
export function getTypeLabel(type: ReasonType | undefined): string {
  switch (type) {
    case ReasonType.AVAILABLE:
      return strings.userProfile.available;
    case ReasonType.BUSY:
      return strings.userProfile.busy;
    case ReasonType.AWAY:
      return strings.userProfile.away;
    case ReasonType.OFFLINE:
      return strings.userProfile.offline;
    default:
      return strings.userProfile.unavailable;
  }
}

/**
 * ProfileChip — header identity display: avatar, name, status, and a chevron that
 * opens the profile sheet. The whole chip is the tap target on mobile, rather than
 * demo-app's separate chevron button.
 */
export function ProfileChip({
  fullName,
  email,
  status,
  isLoggedInToCx,
  onPress,
}: ProfileChipProps) {
  const displayName = fullName?.trim() || email?.trim() || strings.profileChip.fallbackName;
  const typeLabel = getTypeLabel(status?.type);
  const reasonLabel = status?.reason?.trim() || typeLabel;
  const showReasonSuffix = isLoggedInToCx && status != null && reasonLabel !== typeLabel;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.profileChip.openProfileMenuAriaLabel(displayName)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Avatar fullName={fullName || email} size="sm" />

      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>

        <View style={styles.statusRow}>
          {isLoggedInToCx ? (
            <>
              <Badge
                variant={getStatusVariant(status?.type)}
                style={styles.statusBadge}
                textStyle={styles.statusBadgeText}
              >
                {status ? typeLabel : strings.common.loading}
              </Badge>
              {showReasonSuffix && (
                <Text style={styles.reasonText} numberOfLines={1}>
                  {` ${strings.profileChip.reasonSeparator} ${reasonLabel}`}
                </Text>
              )}
            </>
          ) : (
            <Badge
              variant="secondary"
              style={styles.statusBadge}
              textStyle={styles.statusBadgeText}
              accessibilityLabel={strings.profileChip.notLoggedInAriaLabel}
            >
              {strings.profileChip.notLoggedIn}
            </Badge>
          )}
        </View>
      </View>

      <ChevronDown size={16} color={colors.gray600} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 240,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.gray100,
  },
  textColumn: {
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray900,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 0,
    height: 17,
  },
  statusBadgeText: {
    fontSize: fontSize.xxs,
  },
  reasonText: {
    flexShrink: 1,
    fontSize: fontSize.xs,
    color: colors.gray600,
  },
});
