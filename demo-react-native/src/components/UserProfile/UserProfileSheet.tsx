import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReasonType, type ReasonCode, type User } from '@/sdk';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select, type SelectOption } from '@/components/ui/Select';
import { LogoutReasonDialog } from '@/components/shared/LogoutReasonDialog';
import { useCxLogin } from '@/hooks/useCxLogin';
import { useUserStatus } from '@/hooks/useUserStatus';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';
import {
  LOGIN_ONLY_KEY,
  canUserSelectInitialStatus,
  decodeReasonCodeKey,
  encodeReasonCodeKey,
} from '@/utils/loginStatusReasons';

interface UserProfileSheetProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onSignOut?: () => void;
}

/**
 * UserProfileSheet — the agent's control panel.
 *
 * demo-app splits these controls between a header CX popover and an avatar dropdown.
 * A phone header has room for neither, so both collapse into one sheet while keeping
 * the same operations and the same rules:
 *   - CX login may carry an initial status, except for Elite Voice agents
 *   - CX logout requires a reason code
 *   - availability can only change while logged in to CX
 */
export function UserProfileSheet({ user, open, onClose, onSignOut }: UserProfileSheetProps) {
  const { currentStatus, reasonCodes, statusChangeLoading, changeStatus } = useUserStatus(user);
  const {
    cxLoginLoading,
    loginStatusReasons,
    logoutStatusReasons,
    handleLoginToCx,
    handleLogoutFromCx,
  } = useCxLogin(user, { onSuccess: onClose });

  const [initialStatusKey, setInitialStatusKey] = useState<string>(LOGIN_ONLY_KEY);
  const [statusKey, setStatusKey] = useState<string | undefined>(undefined);
  const [isLogoutPickerOpen, setIsLogoutPickerOpen] = useState(false);

  const isLoggedInToCx = user.isLoggedInToCx;
  const allowInitialStatus = canUserSelectInitialStatus(user.isEliteVoiceEnabled);

  // Reset transient pickers each time the sheet opens.
  useEffect(() => {
    if (open) {
      setInitialStatusKey(LOGIN_ONLY_KEY);
      setStatusKey(undefined);
    }
  }, [open]);

  /** Availability options exclude LOGOUT codes — those belong to the logout flow. */
  const availabilityOptions: SelectOption[] = useMemo(
    () =>
      reasonCodes
        .map((code, index) => ({ code, index }))
        .filter(({ code }) => code.type !== ReasonType.LOGOUT)
        .map(({ code, index }) => ({
          value: encodeReasonCodeKey(index),
          label: code.reason ?? code.type,
          description: code.type,
        })),
    [reasonCodes],
  );

  const initialStatusOptions: SelectOption[] = useMemo(
    () => [
      { value: LOGIN_ONLY_KEY, label: strings.userProfile.loginOnlyOption },
      ...loginStatusReasons.map((code, index) => ({
        value: encodeReasonCodeKey(index),
        label: code.reason ?? code.type,
        description: code.type,
      })),
    ],
    [loginStatusReasons],
  );

  const handleLogin = () => {
    const reason =
      allowInitialStatus && initialStatusKey !== LOGIN_ONLY_KEY
        ? decodeReasonCodeKey(initialStatusKey, loginStatusReasons)
        : undefined;
    void handleLoginToCx(reason);
  };

  const handleAvailabilityChange = async (key: string) => {
    setStatusKey(key);
    const reason = decodeReasonCodeKey(key, reasonCodes);
    if (reason) {
      await changeStatus(reason.type, reason.reason ?? '');
    }
  };

  const handleLogoutConfirm = (reason: ReasonCode) => {
    setIsLogoutPickerOpen(false);
    void handleLogoutFromCx(reason);
  };

  return (
    <>
      <Dialog open={open} title={strings.userProfile.profileMenu} onClose={onClose}>
        {/* Identity */}
        <View style={styles.identity}>
          <Avatar fullName={user.userFullName || user.email} size="lg" />
          <View style={styles.identityText}>
            <Text style={styles.name}>{user.userFullName || strings.profileChip.fallbackName}</Text>
            {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>
        </View>

        {/* CX controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isLoggedInToCx ? strings.cxMenu.panelLoggedInTitle : strings.cxMenu.panelLoginTitle}
          </Text>
          <Text style={styles.sectionHint}>
            {isLoggedInToCx ? strings.cxMenu.panelLoggedInHint : strings.cxMenu.panelLoginHint}
          </Text>

          {!isLoggedInToCx ? (
            <>
              {allowInitialStatus ? (
                <Select
                  label={strings.userProfile.initialLoginStatus}
                  value={initialStatusKey}
                  options={initialStatusOptions}
                  placeholder={strings.userProfile.selectInitialLoginStatus}
                  onChange={setInitialStatusKey}
                  style={styles.field}
                />
              ) : (
                <Text style={styles.notice}>
                  {strings.cxMenu.eliteInitialStatusUnavailable}
                </Text>
              )}

              <Button onPress={handleLogin} loading={cxLoginLoading}>
                {strings.common.loginToCX}
              </Button>
            </>
          ) : (
            <>
              <Select
                label={strings.cxMenu.changeAvailabilitySection}
                value={statusKey}
                options={availabilityOptions}
                placeholder={strings.userProfile.selectStatus}
                onChange={handleAvailabilityChange}
                disabled={statusChangeLoading}
                style={styles.field}
              />

              <Button
                variant="outline"
                onPress={() => setIsLogoutPickerOpen(true)}
                disabled={cxLoginLoading}
              >
                {strings.common.logoutFromCX}
              </Button>
            </>
          )}
        </View>

        {/* Current status readout */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{strings.userProfile.statusType}</Text>
          <Text style={styles.statusValue}>
            {isLoggedInToCx
              ? (currentStatus?.reason ?? currentStatus?.type ?? strings.common.loading)
              : strings.profileChip.notLoggedIn}
          </Text>
        </View>

        {/* Session */}
        <View style={styles.section}>
          <Button variant="destructive" onPress={onSignOut}>
            {strings.common.signOut}
          </Button>
        </View>
      </Dialog>

      <LogoutReasonDialog
        open={isLogoutPickerOpen}
        reasons={logoutStatusReasons}
        loading={cxLoginLoading}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.gray900,
  },
  email: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  section: {
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray900,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  notice: {
    fontSize: fontSize.xs,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
});
