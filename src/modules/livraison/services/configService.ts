// configService.ts
import { getCurrentCompany, getSupabase } from "@/lib/supabase";

export const fetchCommission = async (): Promise<number> => {
  const company = getCurrentCompany();
  if (!company) return 500;
  try {
    const { data, error } = await getSupabase()
      .from("config")
      .select("valeur")
      .eq("cle", "commission_gerant")
      .eq("company_id", company.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data ? Number(data.valeur) : 500;
  } catch {
    return 500;
  }
};

export const updateCommission = async (newVal: number): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");
  const { error } = await getSupabase()
    .from("config")
    .upsert(
      { cle: "commission_gerant", valeur: String(newVal), company_id: company.id },
      { onConflict: "cle,company_id" },
    );
  if (error) throw error;
};

export const fetchLogo = async (): Promise<string | null> => {
  const company = getCurrentCompany();
  if (!company) return null;
  try {
    const { data, error } = await getSupabase()
      .from("config")
      .select("valeur")
      .eq("cle", "logo_url")
      .eq("company_id", company.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data?.valeur || null;
  } catch {
    return null;
  }
};

export const updateLogo = async (url: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");
  const { error } = await getSupabase()
    .from("config")
    .upsert(
      { cle: "logo_url", valeur: url, company_id: company.id },
      { onConflict: "cle,company_id" },
    );
  if (error) throw error;
};

export const uploadLogoFile = async (file: File): Promise<string> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");
  const fileExt = file.name.split(".").pop();
  const fileName = `logos/${company.slug || "default"}/logo_${Date.now()}.${fileExt}`;
  const { error: uploadError } = await getSupabase().storage.from("logos").upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data: publicUrl } = getSupabase().storage.from("logos").getPublicUrl(fileName);
  return publicUrl.publicUrl;
};

export const fetchAllConfig = async (): Promise<Record<string, string>> => {
  const company = getCurrentCompany();
  if (!company) return {};
  try {
    const { data, error } = await getSupabase()
      .from("config")
      .select("cle, valeur")
      .eq("company_id", company.id);
    if (error) throw error;
    const configMap: Record<string, string> = {};
    data?.forEach((item: { cle: string; valeur: string }) => {
      configMap[item.cle] = item.valeur;
    });
    return configMap;
  } catch {
    return {};
  }
};

export const getConfigValue = async (
  key: string,
  defaultValue: string | null = null,
): Promise<string | null> => {
  const company = getCurrentCompany();
  if (!company) return defaultValue;
  try {
    const { data, error } = await getSupabase()
      .from("config")
      .select("valeur")
      .eq("cle", key)
      .eq("company_id", company.id)
      .single();
    if (error && error.code !== "PGRST116") return defaultValue;
    return data?.valeur || defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setConfigValue = async (key: string, value: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");
  const { error } = await getSupabase()
    .from("config")
    .upsert({ cle: key, valeur: value, company_id: company.id }, { onConflict: "cle,company_id" });
  if (error) throw error;
};
