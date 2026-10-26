/**
 * Customer-field editing that works against both adapters.
 *
 * On web the SDK is in-process, so the customer object carries its own setters
 * (`interaction.customer.setName(...)`). On native the customer only exists as a
 * snapshot — the live object stays in the WebView — so the bridge exposes
 * `interaction.updateCustomer({...})`, which applies the patch on the far side.
 * Rather than leak that difference into every panel, the UI calls this helper.
 */

import type { CustomerDetails, Interaction } from './types';

type EditableField = 'name' | 'phone' | 'email' | 'languageCode';

const SETTER_BY_FIELD: Record<EditableField, string> = {
  name: 'setName',
  phone: 'setPhone',
  email: 'setEmail',
  languageCode: 'setLanguageCode',
};

/**
 * Applies a single customer-field edit using whichever API the active adapter offers.
 *
 * @throws when neither API is available, so callers surface a real failure rather
 *         than silently reporting success on a write that never happened.
 */
export async function updateCustomerField(
  interaction: Interaction,
  field: EditableField,
  value: string,
): Promise<void> {
  const customer = interaction.customer as unknown as Record<string, unknown>;
  const setter = customer?.[SETTER_BY_FIELD[field]];

  if (typeof setter === 'function') {
    // Real SDK: setters live on the customer object itself.
    await (setter as (v: string) => Promise<void>).call(customer, value);
    return;
  }

  if (typeof interaction.updateCustomer === 'function') {
    // Bridge: one patch call, applied against the live object in the WebView.
    await interaction.updateCustomer({ [field]: value } as Partial<CustomerDetails>);
    return;
  }

  throw new Error(`Customer field "${field}" is not editable on this adapter`);
}
