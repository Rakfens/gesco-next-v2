"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCommission,
  updateCommission as updateCommissionService,
} from "@/modules/livraison/services/configService";
import { COMMISSION_DEFAUT } from "../utils/constants";

export const useCommission = () => {
  const [commissionGerant, setCommissionGerant] = useState<number>(COMMISSION_DEFAUT);

  useEffect(() => {
    const load = async () => {
      const val = await fetchCommission();
      setCommissionGerant(val);
    };
    load();
  }, []);

  const updateCommission = useCallback(async (val: number) => {
    await updateCommissionService(val);
    setCommissionGerant(val);
  }, []);

  return { commissionGerant, updateCommission };
};
