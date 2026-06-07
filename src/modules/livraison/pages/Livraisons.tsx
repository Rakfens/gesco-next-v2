// modules/livraison/pages/Livraisons.tsx — Refactorisé avec design system professionnel
import { useState, useEffect } from 'react';
import { LivraisonForm } from '../components/LivraisonForm';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { useLivraisons } from '@/modules/shared/hooks/useLivraisons';
import { useAgents } from '@/modules/shared/hooks/useAgents';
import { useToast } from '@/modules/shared/hooks/useToast';
import { Card, CardHeader, CardTitle } from '@/modules/shared/components/ui';

export default function LivraisonsPage() {
  const { currentCompany } = useCompany();
  const { livraisons, addLivraison } = useLivraisons();
  const { agents } = useAgents();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<{
    colisList: string[];
    clients: string[];
    lieux: string[];
  }>({
    colisList: [],
    clients: [],
    lieux: []
  });

  useEffect(() => {
    if (livraisons && livraisons.length > 0) {
      setSuggestions({
        colisList: [...new Set(livraisons.map(l => l.colis).filter((c): c is string => !!c))],
        clients: [...new Set(livraisons.map(l => l.client_donneur).filter((c): c is string => !!c))],
        lieux: [...new Set(livraisons.map(l => l.destinataire_lieu).filter((l): l is string => !!l))]
      });
    }
  }, [livraisons]);

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }} data-testid="page-title">
                Livraisons
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                {currentCompany?.name} · {livraisons?.length || 0} livraison(s)
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <LivraisonForm
        agents={agents}
        onAddLivraison={addLivraison as any}
        showToast={showToast as any}
        suggestions={suggestions}
      />
    </div>
  );
}
