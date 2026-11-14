import React from 'react';
import FeatureGate from '@/components/addons/FeatureGate';
import EquityPartnershipList from '@/components/equity/EquityPartnershipList';

export default function EquitySplitTab({ client }) {
  return (
    <FeatureGate feature="equity_split_pro">
      <EquityPartnershipList client={client} />
    </FeatureGate>
  );
}