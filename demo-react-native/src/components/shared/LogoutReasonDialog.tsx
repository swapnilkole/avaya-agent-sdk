import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import type { ReasonCode } from '@/sdk';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select, type SelectOption } from '@/components/ui/Select';
import { strings } from '@/locales/en';
import {
  decodeLogoutReasonKey,
  encodeLogoutReasonKey,
} from '@/utils/logoutStatusReasons';

interface LogoutReasonDialogProps {
  open: boolean;
  reasons: ReasonCode[];
  loading?: boolean;
  onConfirm: (reason: ReasonCode) => void;
  onCancel: () => void;
}

/**
 * LogoutReasonDialog — required reason picker shown before a queue or CX logout.
 *
 * Selections are indexed rather than passed by value, because reason codes have no
 * stable id of their own and two entries can share a label.
 */
export function LogoutReasonDialog({
  open,
  reasons,
  loading = false,
  onConfirm,
  onCancel,
}: LogoutReasonDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  // Clear the stale selection whenever the dialog reopens with a new reason list.
  useEffect(() => {
    if (open) setSelectedKey(undefined);
  }, [open, reasons]);

  const options: SelectOption[] = reasons.map((reason, index) => ({
    value: encodeLogoutReasonKey(index),
    label: reason.reason ?? reason.type,
  }));

  const handleConfirm = () => {
    if (selectedKey === undefined) return;
    const reason = decodeLogoutReasonKey(selectedKey, reasons);
    if (reason) onConfirm(reason);
  };

  return (
    <Dialog
      open={open}
      title={strings.logoutReasonDialog.title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" size="sm" onPress={onCancel} disabled={loading}>
            {strings.common.cancel}
          </Button>
          <Button
            size="sm"
            onPress={handleConfirm}
            loading={loading}
            disabled={selectedKey === undefined || reasons.length === 0}
          >
            {strings.common.logoutFromCX}
          </Button>
        </>
      }
    >
      {reasons.length === 0 ? (
        <Text>{strings.logoutReasonDialog.noReasons}</Text>
      ) : (
        <Select
          value={selectedKey}
          options={options}
          placeholder={strings.logoutReasonDialog.selectReason}
          onChange={setSelectedKey}
          accessibilityLabel={strings.cxMenu.logoutReasonAriaLabel}
        />
      )}
    </Dialog>
  );
}
