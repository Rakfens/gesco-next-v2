// Inventaire.tsx — Refactorisé avec design system professionnel - Amélioré
import { useState, useEffect } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { Produit, type Inventaire } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';
import { fetchProduits } from '../services/produitService';
import { getCurrentInventory, startInventory, recordCount, finishInventory, getInventoryHistory, getInventoryDetails, getCountedProducts, getUncountedProducts } from '../services/inventaireService';
import { Card, CardHeader, CardTitle, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, Table, TableHead, TableHeader, TableBody, TableRow, TableCell, Badge } from '@/modules/shared/components/ui';
import { formatAr } from '@/modules/shared/utils/constants';

export default function Inventaire() {
  const { currentCompany } = useCompany();
  const { success: showSuccess, error: showError, warn: showWarn } = useApp();

  const [currentInventory, setCurrentInventory] = useState<Inventaire | null>(null);
  const [products, setProducts] = useState<Produit[]>([]);
  const [countedProducts, setCountedProducts] = useState<Produit[]>([]);
  const [uncountedProducts, setUncountedProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false); // Pour la sauvegarde d'un comptage
  const [showCountModal, setShowCountModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [countValue, setCountValue] = useState<string>('');
  const [history, setHistory] = useState<Inventaire[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<Inventaire | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [inventoryDetails, setInventoryDetails] = useState<{
    stats: { total_products: number; products_with_difference: number; accuracy_rate: number };
    details: Array<{ id?: string; produit?: { nom?: string; unite?: string }; quantite_theorique?: number; quantite_reelle?: number; ecart?: number }>;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [confirmFinaliser, setConfirmFinaliser] = useState<boolean>(false);

  useEffect(() => { loadData(); }, [currentCompany]);

  // --- AJOUT DE LA GESTION REALTIME ---
  useEffect(() => {
    const handler = (e: Event) => {
      const table = (e as CustomEvent).detail?.table;
      if (['inventaires', 'produits', 'mouvements_stock'].includes(table)) {
        // Recharger les données pertinentes
        // Si l'inventaire en cours est affecté, rechargez-le
        // Sinon, rechargez l'historique ou les produits si nécessaire
        loadData();
      }
    };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [currentCompany]); // Important: dépendance pour le cleanup si currentCompany change
  // --- FIN DE L'AJOUT ---

  const loadData = async () => {
    setLoading(true);
    try {
      const inventory = await getCurrentInventory();
      setCurrentInventory(inventory);
      const allProducts = await fetchProduits({ isActive: true });
      setProducts(allProducts || []);
      const historyData = await getInventoryHistory();
      setHistory(historyData || []);
      if (inventory && inventory.id) {
        const counted = await getCountedProducts(inventory.id);
        setCountedProducts(counted as unknown as Produit[]);
        const uncounted = await getUncountedProducts(inventory.id);
        setUncountedProducts(uncounted as unknown as Produit[]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données d'inventaire:", error);
      showError('Erreur chargement');
    }
    finally { setLoading(false); }
  };

  const handleStartInventory = async () => {
    try {
      setSaving(true); // Activer l'indicateur de sauvegarde
      await startInventory();
      await loadData();
      showSuccess('Inventaire démarré');
    } catch (e: unknown) {
      console.error("Erreur lors du démarrage de l'inventaire:", e);
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false); // Désactiver l'indicateur de sauvegarde
    }
  };

  const handleRecordCount = async () => {
    if (!selectedProduct || !countValue || !currentInventory?.id) { showWarn('Veuillez saisir une quantité'); return; }
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      await recordCount(currentInventory.id, selectedProduct.id, parseFloat(countValue));
      setShowCountModal(false);
      setSelectedProduct(null);
      setCountValue('');
      await loadData();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du comptage:", error);
      showError("Erreur lors de l'enregistrement");
    }
    finally { setSaving(false); } // Désactiver l'indicateur de sauvegarde
  };

  const executeFinishInventory = async () => {
    setConfirmFinaliser(false);
    if (!currentInventory?.id) return;
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      await finishInventory(currentInventory.id);
      await loadData();
      showSuccess('Inventaire terminé');
    }
    catch (error) {
      console.error("Erreur lors de la finalisation de l'inventaire:", error);
      showError('Erreur finalisation');
    }
    finally { setSaving(false); } // Désactiver l'indicateur de sauvegarde
  };

  const handleViewDetails = async (inventory: Inventaire) => {
    setSelectedInventory(inventory);
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      setInventoryDetails(await getInventoryDetails(inventory.id) as typeof inventoryDetails);
    }
    catch (error) {
      console.error("Erreur lors du chargement des détails de l'inventaire:", error);
      setInventoryDetails(null);
    }
    finally { setDetailsLoading(false); }
  };

  const totalProductsToCount = uncountedProducts.length + countedProducts.length;
  const progressPercent = totalProductsToCount > 0 ? (countedProducts.length / totalProductsToCount) * 100 : 0;

  if (loading) return <div style={{ color: 'var(--muted)', padding: 50, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div style={{ padding: '0 0 24px' }}>
    {/* ... (rest of the component rendering remains largely the same) ... */}

    {/* Count Modal */}
    <Modal open={showCountModal} onClose={() => { setShowCountModal(false); setSelectedProduct(null); setCountValue(''); }}>
    <ModalHeader title={"Compter - " + (selectedProduct?.nom || '')} onClose={() => setShowCountModal(false)} />
    <ModalBody>
    {/* ... (body content unchanged) ... */}
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setShowCountModal(false)}>Annuler</Button>
    <Button variant="success" onClick={handleRecordCount} disabled={saving} loading={saving}> {/* Ajout de 'loading={saving}' */}
    {saving ? 'Enregistrement...' : 'Enregistrer'}
    </Button>
    </ModalFooter>
    </Modal>

    {/* Confirm Finish Modal */}
    <Modal open={confirmFinaliser} onClose={() => setConfirmFinaliser(false)}>
    <ModalHeader title="Terminer l'inventaire ?" onClose={() => setConfirmFinaliser(false)} />
    <ModalBody>
    <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
    {uncountedProducts.length > 0 ? "Certains produits n'ont pas encore ete comptes. Voulez-vous terminer quand meme ?" : 'Tous les produits ont ete comptes. Confirmer la finalisation ?'}
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmFinaliser(false)}>Annuler</Button>
    <Button variant="success" onClick={executeFinishInventory} disabled={saving} loading={saving}> {/* Ajout de 'loading={saving}' */}
    {saving ? 'Finalisation...' : 'Terminer'}
    </Button>
    </ModalFooter>
    </Modal>

    {/* Details Modal */}
    <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
    <ModalHeader title={"Details - Inventaire du " + (selectedInventory?.date_debut ? new Date(selectedInventory.date_debut ?? '').toLocaleDateString() : '')} onClose={() => setShowDetailsModal(false)} />
    <ModalBody>
    {detailsLoading ? (
      <div style={{ textAlign: 'center', padding: 40 }}>Chargement des détails...</div> {/* Message de chargement spécifique */}
    ) : !inventoryDetails ? (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Aucun detail disponible</div>
    ) : (
      // ... (content of details remains the same) ...
    )}
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Fermer</Button>
    </ModalFooter>
    </Modal>

    {/* ... (rest of the component rendering remains largely the same) ... */}

    {/* Current Inventory */}
    {currentInventory ? (
      <Card style={{ marginBottom: 20 }}>
      {/* ... (header and stats remain the same) ... */}

      {/* Products to count */}
      <div style={{ padding: '0 18px', marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Produits a compter ({uncountedProducts.length})</h3>
      {uncountedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, background: 'var(--bg)', borderRadius: 10 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>OK</div>
        <p style={{ color: 'var(--green)', fontWeight: 600 }}>Tous les produits ont ete comptes !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 350, overflowY: 'auto' }}>
        {uncountedProducts.map(product => (
          <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg)', borderRadius: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
          <div style={{ fontWeight: 600 }}>{product.nom}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stock theorique: {product.quantite_stock} {product.unite}</div>
          </div>
          <Button variant="success" size="sm" onClick={() => { setSelectedProduct(product); setShowCountModal(true); }} disabled={saving}> {/* Désactiver le bouton si une action est en cours */}
          Compter
          </Button>
          </div>
        ))}
        </div>
      )}
      </div>

      <div style={{ padding: '0 18px 18px', display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="success" onClick={() => setConfirmFinaliser(true)} disabled={saving || uncountedProducts.length > 0}> {/* Désactiver si une action est en cours ou s'il reste des produits */}
      Terminer l'inventaire
      </Button>
      </div>
      </Card>
    ) : (
      <Card style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>stock</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Aucun inventaire en cours</h3>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Demarrez un nouvel inventaire pour verifier votre stock</p>
      <Button onClick={handleStartInventory} disabled={saving}> {/* Désactiver le bouton si une action est en cours */}
      Demarrer un inventaire
      </Button>
      </Card>
    )}

    {/* ... (rest of the component rendering remains largely the same) ... */}
    </div>
  );
}
