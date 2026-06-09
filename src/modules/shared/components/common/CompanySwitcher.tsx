// CompanySwitcher.tsx — Sélecteur de société
import { useEffect, useRef, useState } from "react";
import type { Company } from "@/modules/shared/types";
import { useCompany } from "../../context/CompanyContext";

export const CompanySwitcher = () => {
  const { currentCompany, companies, switchCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!companies || companies.length <= 1) {
    return null;
  }

  const handleSelectCompany = (company: Company) => {
    if (company.id !== currentCompany?.id) {
      switchCompany(company);
    }
    setIsOpen(false);
  };

  const getCompanyColor = (): string => {
    if (!currentCompany) return "var(--blue)";
    if (currentCompany.slug === "pomanay") return "var(--green)";
    if (currentCompany.slug === "zazatiana") return "var(--pink)";
    return "var(--blue)";
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: getCompanyColor(),
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          color: "#fff",
          fontWeight: 500,
          fontSize: "13px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        <span style={{ fontSize: 14 }}>☰</span>
        <span>{currentCompany?.name || "Société"}</span>
        <span style={{ fontSize: "12px" }}>{isOpen ? "^" : "v"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            minWidth: "220px",
            zIndex: 1000,
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {companies.map((company: Company) => {
            const isActive = currentCompany?.id === company.id;
            const companyColor =
              company.slug === "pomanay"
                ? "var(--green)"
                : company.slug === "zazatiana"
                  ? "var(--pink)"
                  : "var(--blue)";
            return (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  background: isActive ? "var(--bg)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text)",
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? `3px solid ${companyColor}` : "3px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: companyColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {company.slug === "pomanay"
                    ? "POM"
                    : company.slug === "zazatiana"
                      ? "ZAZ"
                      : "LIV"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: isActive ? 600 : 400 }}>
                    {company.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                    {company.type === "service" ? "Service livraison" : "Boutique"}
                  </div>
                </div>
                {isActive && <span style={{ color: companyColor, fontSize: "14px" }}>OK</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
