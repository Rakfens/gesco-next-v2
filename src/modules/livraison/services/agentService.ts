// agentService.ts — v2 : companyId passé en paramètre
import { getSupabase } from "@/lib/supabase";
import type { Agent } from "@/modules/shared/types";

export const fetchAgents = async (companyId: string): Promise<Agent[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from("agents")
    .select("*")
    .eq("company_id", companyId)
    .order("nom");
  if (error) throw error;
  return data || [];
};

export const addAgent = async (
  nom: string,
  salaire: string | number,
  companyId: string,
): Promise<Agent> => {
  if (!companyId) throw new Error("Société non sélectionnée");
  const { data, error } = await getSupabase()
    .from("agents")
    .insert([{ nom, salaire: parseFloat(String(salaire)), company_id: companyId }])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateAgent = async (
  id: string,
  updates: Partial<Agent>,
  companyId: string,
): Promise<void> => {
  if (!companyId) throw new Error("Société non sélectionnée");
  const { error } = await getSupabase()
    .from("agents")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
};

export const deleteAgent = async (id: string, companyId: string): Promise<void> => {
  if (!companyId) throw new Error("Société non sélectionnée");
  const { error } = await getSupabase()
    .from("agents")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
};
